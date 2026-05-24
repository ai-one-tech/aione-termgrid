import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { TermGridConfig, TerminalCell } from '../../shared/schema';
import { Theme, TerminalStatus } from '../../shared/types';
import { TranslationKey } from '../../shared/translations';
import TerminalCellComponent from './TerminalCell';

interface TerminalGridProps {
  config: TermGridConfig;
  theme: Theme;
  terminalStatuses: Record<string, TerminalStatus>;
  onConfigUpdate: (config: TermGridConfig) => void;
  onMaximize: (cell: TerminalCell) => void;
  onInput: (cellId: string, data: string) => void;
  onResize: (cellId: string, cols: number, rows: number) => void;
  registerTerminalRef: (cellId: string, ref: { write: (data: string) => void; clear: () => void } | null) => void;
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

  let cellIndex = 0;

  // Place merged cells first
  if (mergedCells && mergedCells.length > 0) {
    mergedCells.forEach((merged) => {
      if (cellIndex >= cells.length) return;
      const cell = cells[cellIndex];
      for (let r = merged.startRow; r <= merged.endRow && r < layout.rows; r++) {
        for (let c = merged.startCol; c <= merged.endCol && c < layout.cols; c++) {
          grid[r][c] = cell.id;
        }
      }
      cellIndex++;
    });
  }

  // Place remaining cells
  for (let row = 0; row < layout.rows && cellIndex < cells.length; row++) {
    for (let col = 0; col < layout.cols && cellIndex < cells.length; col++) {
      if (grid[row][col] !== null) continue;
      const cell = cells[cellIndex];
      const colSpan = Math.min(cell.colSpan || 1, layout.cols - col);
      const rowSpan = Math.min(cell.rowSpan || 1, layout.rows - row);

      for (let r = row; r < row + rowSpan && r < layout.rows; r++) {
        for (let c = col; c < col + colSpan && c < layout.cols; c++) {
          grid[r][c] = cell.id;
        }
      }
      cellIndex++;
    }
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
  const { layout, cells } = config;
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the cell grid mapping
  const cellGrid = useMemo(() => buildCellGrid(config), [config]);
  const rowCellIds = useMemo(() => getRowCellIds(cellGrid), [cellGrid]);
  const columnCellIds = useMemo(() => getColumnCellIds(cellGrid), [cellGrid]);

  // Column and row sizes (percentages)
  const [colSizes, setColSizes] = useState<number[]>(() =>
    getDefaultSizes(columnCellIds.map((ids) => ids[0]).filter(Boolean) as string[], 'col', config)
  );
  const [rowSizes, setRowSizes] = useState<number[]>(() =>
    getDefaultSizes(rowCellIds.map((ids) => ids[0]).filter(Boolean) as string[], 'row', config)
  );

  // Sync sizes when config changes
  useEffect(() => {
    setColSizes(getDefaultSizes(columnCellIds.map((ids) => ids[0]).filter(Boolean) as string[], 'col', config));
    setRowSizes(getDefaultSizes(rowCellIds.map((ids) => ids[0]).filter(Boolean) as string[], 'row', config));
  }, [config, columnCellIds, rowCellIds]);

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
        const deltaPx = e.clientX - colDrag.startX;
        const deltaPercent = (deltaPx / containerWidth) * 100;

        const newSizes = [...colDrag.startSizes];
        const leftSize = newSizes[colDrag.index] + deltaPercent;
        const rightSize = newSizes[colDrag.index + 1] - deltaPercent;

        if (leftSize > 5 && rightSize > 5) {
          newSizes[colDrag.index] = leftSize;
          newSizes[colDrag.index + 1] = rightSize;
          setColSizes(newSizes);
        }
      }

      if (rowDrag) {
        const containerHeight = containerRef.current?.clientHeight || 1;
        const deltaPx = e.clientY - rowDrag.startY;
        const deltaPercent = (deltaPx / containerHeight) * 100;

        const newSizes = [...rowDrag.startSizes];
        const topSize = newSizes[rowDrag.index] + deltaPercent;
        const bottomSize = newSizes[rowDrag.index + 1] - deltaPercent;

        if (topSize > 5 && bottomSize > 5) {
          newSizes[rowDrag.index] = topSize;
          newSizes[rowDrag.index + 1] = bottomSize;
          setRowSizes(newSizes);
        }
      }
    };

    const handleMouseUp = () => {
      if (colDrag) {
        // Update colSpan based on new sizes
        const totalCols = layout.cols;
        const updatedCells = cells.map((cell) => {
          for (let c = 0; c < columnCellIds.length; c++) {
            const idx = columnCellIds[c].indexOf(cell.id);
            if (idx !== -1) {
              const size = colSizes[c] || 0;
              const newSpan = Math.max(1, Math.round((size / 100) * totalCols));
              return { ...cell, colSpan: newSpan };
            }
          }
          return cell;
        });
        onConfigUpdate({ ...config, cells: updatedCells });
        setColDrag(null);
      }

      if (rowDrag) {
        // Update rowSpan based on new sizes
        const totalRows = layout.rows;
        const updatedCells = cells.map((cell) => {
          for (let r = 0; r < rowCellIds.length; r++) {
            const idx = rowCellIds[r].indexOf(cell.id);
            if (idx !== -1) {
              const size = rowSizes[r] || 0;
              const newSpan = Math.max(1, Math.round((size / 100) * totalRows));
              return { ...cell, rowSpan: newSpan };
            }
          }
          return cell;
        });
        onConfigUpdate({ ...config, cells: updatedCells });
        setRowDrag(null);
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
  }, [colDrag, rowDrag, colSizes, rowSizes, cells, config, layout.cols, layout.rows, columnCellIds, rowCellIds, onConfigUpdate]);

  // Handle cell stop
  const handleCellStop = useCallback((cellId: string) => {
    const vscode = (window as unknown as { vscode?: { postMessage: (msg: unknown) => void } }).vscode;
    if (vscode) {
      vscode.postMessage({ type: 'terminal:stop', payload: { cellId } });
    }
  }, []);

  // Handle cell restart
  const handleCellRestart = useCallback((cellId: string) => {
    const vscode = (window as unknown as { vscode?: { postMessage: (msg: unknown) => void } }).vscode;
    if (vscode) {
      vscode.postMessage({ type: 'terminal:restart', payload: { cellId } });
    }
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
      {colSizes.length > 1 && colSizes.map((_, index) => {
        if (index >= colSizes.length - 1) return null;
        // Calculate position: sum of previous column sizes
        const leftPercent = colSizes.slice(0, index + 1).reduce((a, b) => a + b, 0);
        return (
          <div
            key={`col-resizer-${index}`}
            className="grid-resizer-col"
            style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              top: 0,
              bottom: 0,
              width: '4px',
              transform: 'translateX(-50%)',
              cursor: 'col-resize',
              zIndex: 10,
            }}
            onMouseDown={(e) => handleColResizeStart(index, e)}
          />
        );
      })}

      {/* Row resize handles */}
      {rowSizes.length > 1 && rowSizes.map((_, index) => {
        if (index >= rowSizes.length - 1) return null;
        const topPercent = rowSizes.slice(0, index + 1).reduce((a, b) => a + b, 0);
        return (
          <div
            key={`row-resizer-${index}`}
            className="grid-resizer-row"
            style={{
              position: 'absolute',
              top: `${topPercent}%`,
              left: 0,
              right: 0,
              height: '4px',
              transform: 'translateY(-50%)',
              cursor: 'row-resize',
              zIndex: 10,
            }}
            onMouseDown={(e) => handleRowResizeStart(index, e)}
          />
        );
      })}
    </div>
  );
};

export default TerminalGrid;
