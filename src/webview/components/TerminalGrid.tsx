import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { TermGridConfig, TerminalCell } from '../../shared/schema';
import { Theme, TerminalStatus } from '../../shared/types';
import { TranslationKey } from '../../shared/translations';
import TerminalCellComponent from './TerminalCell';
import { getHostBridge } from '../lib/bridge';

interface TerminalGridProps {
  config: TermGridConfig;
  theme: Theme;
  terminalStatuses: Record<string, TerminalStatus>;
  onConfigUpdate: (config: TermGridConfig) => void;
  onMaximize: (cell: TerminalCell) => void;
  onInput: (cellId: string, data: string) => void;
  onResize: (cellId: string, cols: number, rows: number) => void;
  registerTerminalRef: (cellId: string, ref: { write: (data: string) => void; clear: () => void }, action: 'register' | 'unregister') => void;
  t: (key: TranslationKey) => string;
}

/**
 * Build a 2D grid mapping each logical position [row][col] to a cell ID.
 * Respects merged cells and custom colSpan/rowSpan.
 */
function buildCellGrid(config: TermGridConfig): (string | null)[][] {
  const { layout, cells, mergedCells } = config;
  const grid: (string | null)[][] = Array.from({ length: layout.rows }, () =>
    Array.from({ length: layout.cols }, () => null)
  );

  // 1. Fill grid based on position-based mapping (index = row * cols + col)
  // This ensures consistency with SettingsPanel where each cell has a fixed position
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const index = row * layout.cols + col;
      if (index < cells.length) {
        // If this slot is already filled by a previous cell's span, skip it
        if (grid[row][col] !== null) continue;

        const cell = cells[index];
        const colSpan = Math.min(cell.colSpan || 1, layout.cols - col);
        const rowSpan = Math.min(cell.rowSpan || 1, layout.rows - row);

        for (let r = row; r < row + rowSpan && r < layout.rows; r++) {
          for (let c = col; c < col + colSpan && c < layout.cols; c++) {
            grid[r][c] = cell.id;
          }
        }
      }
    }
  }

  // 2. Overwrite with explicit mergedCells
  // This matches SettingsPanel's behavior where mergedCells cover specific grid areas
  if (mergedCells && mergedCells.length > 0) {
    mergedCells.forEach((merged) => {
      const startIndex = merged.startRow * layout.cols + merged.startCol;
      const cell = cells[startIndex];
      if (cell) {
        for (let r = merged.startRow; r <= merged.endRow && r < layout.rows; r++) {
          for (let c = merged.startCol; c <= merged.endCol && c < layout.cols; c++) {
            grid[r][c] = cell.id;
          }
        }
      }
    });
  }

  return grid;
}

/**
 * Extract unique cell IDs per row, preserving left-to-right order.
 */
function getRowCellIds(grid: (string | null)[][]): string[][] {
  return grid.map((row) => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of row) {
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  });
}

/**
 * Extract unique cell IDs per column, preserving top-to-bottom order.
 */
function getColumnCellIds(grid: (string | null)[][]): string[][] {
  if (grid.length === 0) return [];
  const cols = grid[0].length;
  const result: string[][] = [];
  for (let c = 0; c < cols; c++) {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (let r = 0; r < grid.length; r++) {
      const id = grid[r][c];
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    result.push(ids);
  }
  return result;
}

/**
 * Calculate default sizes (percentages) based on colSpan/rowSpan.
 */
function getDefaultSizes(
  cellIds: string[],
  dimension: 'col' | 'row',
  config: TermGridConfig
): number[] {
  const { cells } = config;
  const spanKey = dimension === 'col' ? 'colSpan' : 'rowSpan';

  const spans = cellIds.map((id) => {
    const cell = cells.find((c) => c.id === id);
    return cell?.[spanKey] || 1;
  });

  const totalSpan = spans.reduce((a, b) => a + b, 0);
  return spans.map((span) => (span / totalSpan) * 100);
}

// Convert sizes array to CSS grid template
function sizesToTemplate(sizes: number[]): string {
  return sizes.map((s) => `${s}fr`).join(' ');
}

function getConfiguredSizes(configuredSizes: number[] | undefined, expectedLength: number): number[] | null {
  if (!configuredSizes || configuredSizes.length !== expectedLength) {
    return null;
  }

  return configuredSizes;
}

const TerminalGrid: React.FC<TerminalGridProps> = ({
  config,
  theme,
  terminalStatuses,
  onConfigUpdate,
  onMaximize,
  onInput,
  onResize,
  registerTerminalRef,
  t,
}) => {
  const { cells } = config;
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the cell grid mapping
  const cellGrid = useMemo(() => buildCellGrid(config), [config]);
  const rowCellIds = useMemo(() => getRowCellIds(cellGrid), [cellGrid]);
  const columnCellIds = useMemo(() => getColumnCellIds(cellGrid), [cellGrid]);

  // Column and row sizes (percentages)
  const configuredColSizes = useMemo(
    () =>
      getConfiguredSizes(config.layout.colWidths, columnCellIds.length) ||
      getDefaultSizes(columnCellIds.map((ids) => ids[0]).filter(Boolean) as string[], 'col', config),
    [config, columnCellIds]
  );
  const configuredRowSizes = useMemo(
    () =>
      getConfiguredSizes(config.layout.rowHeights, rowCellIds.length) ||
      getDefaultSizes(rowCellIds.map((ids) => ids[0]).filter(Boolean) as string[], 'row', config),
    [config, rowCellIds]
  );
  const [dragColSizes, setDragColSizes] = useState<number[] | null>(null);
  const [dragRowSizes, setDragRowSizes] = useState<number[] | null>(null);
  const colSizes = dragColSizes || configuredColSizes;
  const rowSizes = dragRowSizes || configuredRowSizes;

  // Drag state for column resize
  const [colDrag, setColDrag] = useState<{ index: number; startX: number; startSizes: number[] } | null>(null);
  // Drag state for row resize
  const [rowDrag, setRowDrag] = useState<{ index: number; startY: number; startSizes: number[] } | null>(null);

  // Handle column resize start
  const handleColResizeStart = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setColDrag({ index, startX: e.clientX, startSizes: [...colSizes] });
  }, [colSizes]);

  // Handle row resize start
  const handleRowResizeStart = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setRowDrag({ index, startY: e.clientY, startSizes: [...rowSizes] });
  }, [rowSizes]);

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (colDrag) {
        const containerWidth = containerRef.current?.clientWidth || 1;
        const totalGap = (colSizes.length - 1) * 5;
        const netWidth = containerWidth - 8 - totalGap;
        const deltaPx = e.clientX - colDrag.startX;
        const deltaPercent = (deltaPx / netWidth) * 100;

        const newSizes = [...colDrag.startSizes];
        const leftSize = newSizes[colDrag.index] + deltaPercent;
        const rightSize = newSizes[colDrag.index + 1] - deltaPercent;

        if (leftSize > 5 && rightSize > 5) {
          newSizes[colDrag.index] = leftSize;
          newSizes[colDrag.index + 1] = rightSize;
          setDragColSizes(newSizes);
        }
      }

      if (rowDrag) {
        const containerHeight = containerRef.current?.clientHeight || 1;
        const totalGap = (rowSizes.length - 1) * 5;
        const netHeight = containerHeight - 8 - totalGap;
        const deltaPx = e.clientY - rowDrag.startY;
        const deltaPercent = (deltaPx / netHeight) * 100;

        const newSizes = [...rowDrag.startSizes];
        const topSize = newSizes[rowDrag.index] + deltaPercent;
        const bottomSize = newSizes[rowDrag.index + 1] - deltaPercent;

        if (topSize > 5 && bottomSize > 5) {
          newSizes[rowDrag.index] = topSize;
          newSizes[rowDrag.index + 1] = bottomSize;
          setDragRowSizes(newSizes);
        }
      }
    };

    const handleMouseUp = () => {
      if (colDrag) {
        onConfigUpdate({
          ...config,
          layout: {
            ...config.layout,
            colWidths: colSizes,
          },
        });
        setColDrag(null);
        setDragColSizes(null);
      }

      if (rowDrag) {
        onConfigUpdate({
          ...config,
          layout: {
            ...config.layout,
            rowHeights: rowSizes,
          },
        });
        setRowDrag(null);
        setDragRowSizes(null);
      }
    };

    if (colDrag || rowDrag) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [colDrag, rowDrag, colSizes, rowSizes, config, onConfigUpdate]);

  // Handle cell stop
  const handleCellStop = useCallback((cellId: string) => {
    getHostBridge().postMessage({ type: 'terminal:stop', payload: { cellId } });
  }, []);

  // Handle cell restart
  const handleCellRestart = useCallback((cellId: string) => {
    getHostBridge().postMessage({ type: 'terminal:restart', payload: { cellId } });
  }, []);

  // Handle cell input
  const handleCellInput = useCallback(
    (cellId: string, data: string) => {
      onInput(cellId, data);
    },
    [onInput]
  );

  // Handle cell resize
  const handleCellResize = useCallback(
    (cellId: string, cols: number, rows: number) => {
      onResize(cellId, cols, rows);
    },
    [onResize]
  );

  // Render a single cell
  const renderCell = (cellId: string) => {
    const cell = cells.find((c) => c.id === cellId);
    if (!cell) return null;

    return (
      <TerminalCellComponent
        cell={cell}
        theme={theme}
        status={terminalStatuses[cell.id] || 'stopped'}
        onStop={() => handleCellStop(cell.id)}
        onRestart={() => handleCellRestart(cell.id)}
        onMaximize={() => onMaximize(cell)}
        onInput={(data) => handleCellInput(cell.id, data)}
        onResize={(cols, rows) => handleCellResize(cell.id, cols, rows)}
        registerTerminalRef={registerTerminalRef}
        t={t}
      />
    );
  };

  // Build grid template
  const gridTemplateColumns = sizesToTemplate(colSizes);
  const gridTemplateRows = sizesToTemplate(rowSizes);

  // Determine cell positions for grid-area
  const cellPositions = useMemo(() => {
    const positions: Record<string, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }> = {};

    for (let r = 0; r < cellGrid.length; r++) {
      for (let c = 0; c < cellGrid[r].length; c++) {
        const cellId = cellGrid[r][c];
        if (!cellId) continue;

        if (!positions[cellId]) {
          positions[cellId] = { rowStart: r + 1, rowEnd: r + 2, colStart: c + 1, colEnd: c + 2 };
        } else {
          positions[cellId].rowStart = Math.min(positions[cellId].rowStart, r + 1);
          positions[cellId].rowEnd = Math.max(positions[cellId].rowEnd, r + 2);
          positions[cellId].colStart = Math.min(positions[cellId].colStart, c + 1);
          positions[cellId].colEnd = Math.max(positions[cellId].colEnd, c + 2);
        }
      }
    }

    return positions;
  }, [cellGrid]);

  // Unique cell IDs in render order
  const uniqueCellIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const row of cellGrid) {
      for (const id of row) {
        if (id && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }
    return ids;
  }, [cellGrid]);

  return (
    <div
      ref={containerRef}
      className={`terminal-grid-container ${theme} w-full h-full flex-1`}
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns,
        gridTemplateRows,
        gap: '5px',
        padding: '4px',
        position: 'relative',
      }}
    >
      {uniqueCellIds.map((cellId) => {
        const pos = cellPositions[cellId];
        if (!pos) return null;
        return (
          <div
            key={cellId}
            className="grid-cell"
            style={{
              gridArea: `${pos.rowStart} / ${pos.colStart} / ${pos.rowEnd} / ${pos.colEnd}`,
              overflow: 'hidden',
            }}
          >
            {renderCell(cellId)}
          </div>
        );
      })}

      {/* Column resize handles */}
      {colSizes.length > 1 && colSizes.map((_, colIndex) => {
        if (colIndex >= colSizes.length - 1) return null;

        // Find contiguous segments of rows where cells are different across this column boundary
        const segments: { startRow: number; endRow: number }[] = [];
        let currentSegment: { startRow: number; endRow: number } | null = null;

        for (let rowIndex = 0; rowIndex < cellGrid.length; rowIndex++) {
          if (cellGrid[rowIndex][colIndex] !== cellGrid[rowIndex][colIndex + 1]) {
            if (!currentSegment) {
              currentSegment = { startRow: rowIndex, endRow: rowIndex };
              segments.push(currentSegment);
            } else {
              currentSegment.endRow = rowIndex;
            }
          } else {
            currentSegment = null;
          }
        }

        if (segments.length === 0) return null;

        const leftPercent = colSizes.slice(0, colIndex + 1).reduce((a, b) => a + b, 0);
        const colGapCount = colSizes.length - 1;
        const colTotalGap = colGapCount * 5;
        const colTotalReserved = 8 + colTotalGap;
        const leftPos = `calc(4px + (${leftPercent / 100} * (100% - ${colTotalReserved}px)) + ${colIndex * 5 + 2.5}px)`;

        const rowGapCount = rowSizes.length - 1;
        const rowTotalGap = rowGapCount * 5;
        const rowTotalReserved = 8 + rowTotalGap;

        return segments.map((seg, segIndex) => {
          const topPercent = rowSizes.slice(0, seg.startRow).reduce((a, b) => a + b, 0);
          const bottomPercent = rowSizes.slice(0, seg.endRow + 1).reduce((a, b) => a + b, 0);

          const topPos = `calc(4px + (${topPercent / 100} * (100% - ${rowTotalReserved}px)) + ${seg.startRow * 5}px)`;
          const bottomPos = `calc(4px + (${bottomPercent / 100} * (100% - ${rowTotalReserved}px)) + ${seg.endRow * 5}px)`;

          return (
            <div
              key={`col-resizer-${colIndex}-seg-${segIndex}`}
              className="grid-resizer-col"
              style={{
                position: 'absolute',
                left: leftPos,
                top: topPos,
                height: `calc(${bottomPos} - ${topPos})`,
                width: '5px',
                transform: 'translateX(-50%)',
                cursor: 'col-resize',
                zIndex: 10,
              }}
              onMouseDown={(e) => handleColResizeStart(colIndex, e)}
            />
          );
        });
      })}

      {/* Row resize handles */}
      {rowSizes.length > 1 && rowSizes.map((_, rowIndex) => {
        if (rowIndex >= rowSizes.length - 1) return null;

        // Find contiguous segments of columns where cells are different across this row boundary
        const segments: { startCol: number; endCol: number }[] = [];
        let currentSegment: { startCol: number; endCol: number } | null = null;

        for (let colIndex = 0; colIndex < (cellGrid[0]?.length || 0); colIndex++) {
          if (cellGrid[rowIndex][colIndex] !== cellGrid[rowIndex + 1][colIndex]) {
            if (!currentSegment) {
              currentSegment = { startCol: colIndex, endCol: colIndex };
              segments.push(currentSegment);
            } else {
              currentSegment.endCol = colIndex;
            }
          } else {
            currentSegment = null;
          }
        }

        if (segments.length === 0) return null;

        const topPercent = rowSizes.slice(0, rowIndex + 1).reduce((a, b) => a + b, 0);
        const rowGapCount = rowSizes.length - 1;
        const rowTotalGap = rowGapCount * 5;
        const rowTotalReserved = 8 + rowTotalGap;
        const topPos = `calc(4px + (${topPercent / 100} * (100% - ${rowTotalReserved}px)) + ${rowIndex * 5 + 2.5}px)`;

        const colGapCount = colSizes.length - 1;
        const colTotalGap = colGapCount * 5;
        const colTotalReserved = 8 + colTotalGap;

        return segments.map((seg, segIndex) => {
          const leftPercent = colSizes.slice(0, seg.startCol).reduce((a, b) => a + b, 0);
          const rightPercent = colSizes.slice(0, seg.endCol + 1).reduce((a, b) => a + b, 0);

          const leftPos = `calc(4px + (${leftPercent / 100} * (100% - ${colTotalReserved}px)) + ${seg.startCol * 5}px)`;
          const rightPos = `calc(4px + (${rightPercent / 100} * (100% - ${colTotalReserved}px)) + ${seg.endCol * 5}px)`;

          return (
            <div
              key={`row-resizer-${rowIndex}-seg-${segIndex}`}
              className="grid-resizer-row"
              style={{
                position: 'absolute',
                top: topPos,
                left: leftPos,
                width: `calc(${rightPos} - ${leftPos})`,
                height: '5px',
                transform: 'translateY(-50%)',
                cursor: 'row-resize',
                zIndex: 10,
              }}
              onMouseDown={(e) => handleRowResizeStart(rowIndex, e)}
            />
          );
        });
      })}
    </div>
  );
};

export default TerminalGrid;
