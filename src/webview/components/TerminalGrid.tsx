import React, { useCallback, useRef, useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import { TermGridConfig, TerminalCell } from '../../shared/schema';
import { Theme, GridLayoutItem, TerminalStatus } from '../../shared/types';
import { TranslationKey } from '../../shared/translations';
import TerminalCellComponent from './TerminalCell';
import GridResizer from './GridResizer';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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
  const { layout, cells, mergedCells } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);
  const [containerHeight, setContainerHeight] = useState(400);
  const [rowHeight, setRowHeight] = useState(Math.floor(400 / (layout.rows * 3)));

  // Resize observer to handle container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setGridWidth(width);
        setContainerHeight(height);
        
        const calculatedRowHeight = Math.max(20, Math.floor(height / (layout.rows * 3)));
        setRowHeight(calculatedRowHeight);
      }
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [layout.rows]);

  // Generate layout items with merged cell support
  const generateLayout = (): GridLayoutItem[] => {
    const items: GridLayoutItem[] = [];
    const usedPositions = new Set<string>();
    let cellIndex = 0;

    // First pass: process merged cells
    if (mergedCells && mergedCells.length > 0) {
      mergedCells.forEach((merged) => {
        if (cellIndex >= cells.length) return;

        // Check if this merged area has already been processed
        const mergedKey = `${merged.startRow}-${merged.startCol}`;
        if (usedPositions.has(mergedKey)) return;

        const cell = cells[cellIndex];
        const mergedW = (merged.endCol - merged.startCol + 1) * 3;
        const mergedH = (merged.endRow - merged.startRow + 1) * 3;
        
        items.push({
          i: cell.id,
          x: merged.startCol * 3,
          y: merged.startRow * 3,
          w: mergedW,
          h: mergedH,
          minW: 1,
          minH: 1,
        });

        // Mark all positions in this merged area as used
        for (let r = merged.startRow; r <= merged.endRow; r++) {
          for (let c = merged.startCol; c <= merged.endCol; c++) {
            usedPositions.add(`${r}-${c}`);
          }
        }

        cellIndex++;
      });
    }

    // Second pass: process remaining cells that are not in any merged area
    for (let row = 0; row < layout.rows && cellIndex < cells.length; row++) {
      for (let col = 0; col < layout.cols && cellIndex < cells.length; col++) {
        const posKey = `${row}-${col}`;
        if (usedPositions.has(posKey)) continue;

        const cell = cells[cellIndex];
        const colSpan = cell.colSpan || 1;
        const rowSpan = cell.rowSpan || 1;

        items.push({
          i: cell.id,
          x: col * 3,
          y: row * 3,
          w: colSpan * 3,
          h: rowSpan * 3,
          minW: 1,
          minH: 1,
        });

        usedPositions.add(posKey);
        cellIndex++;
      }
    }

    return items;
  };

  // Get visible cells (skip cells that are part of merged areas but not the starting cell)
  const getVisibleCells = (): TerminalCell[] => {
    if (!mergedCells || mergedCells.length === 0) return cells;

    const visibleCells: TerminalCell[] = [];
    const usedPositions = new Set<string>();
    let cellIndex = 0;

    // First, include cells that are start of merged areas
    mergedCells.forEach((merged) => {
      if (cellIndex >= cells.length) return;
      
      const mergedKey = `${merged.startRow}-${merged.startCol}`;
      if (!usedPositions.has(mergedKey)) {
        visibleCells.push(cells[cellIndex]);
        usedPositions.add(mergedKey);
        
        // Mark all positions in this merged area
        for (let r = merged.startRow; r <= merged.endRow; r++) {
          for (let c = merged.startCol; c <= merged.endCol; c++) {
            usedPositions.add(`${r}-${c}`);
          }
        }
        
        cellIndex++;
      }
    });

    // Then add remaining cells not in any merged area
    for (let row = 0; row < layout.rows && cellIndex < cells.length; row++) {
      for (let col = 0; col < layout.cols && cellIndex < cells.length; col++) {
        const posKey = `${row}-${col}`;
        if (!usedPositions.has(posKey)) {
          visibleCells.push(cells[cellIndex]);
          usedPositions.add(posKey);
          cellIndex++;
        }
      }
    }

    return visibleCells;
  };

  const gridLayout = generateLayout();
  const visibleCells = getVisibleCells();

  // Handle layout change from react-grid-layout (disabled for now but kept for future use)
  const handleLayoutChange = useCallback(
    (newLayout: GridLayoutItem[]) => {
      // Calculate new colSpan/rowSpan based on layout changes
      const updatedCells = cells.map((cell) => {
        const layoutItem = newLayout.find((item) => item.i === cell.id);
        if (layoutItem) {
          return {
            ...cell,
            colSpan: Math.max(1, Math.round(layoutItem.w / 3)),
            rowSpan: Math.max(1, Math.round(layoutItem.h / 3)),
          };
        }
        return cell;
      });

      // Update merged cells based on layout changes
      const updatedMergedCells =
        mergedCells?.map((m) => {
          // Find if any cell in this merged area has changed position
          const cellsInMerge = newLayout.filter((item) => {
            const cell = cells.find((c) => c.id === item.i);
            if (!cell) return false;
            const col = Math.floor(item.x / 3);
            const row = Math.floor(item.y / 3);
            return col >= m.startCol && col <= m.endCol && row >= m.startRow && row <= m.endRow;
          });

          if (cellsInMerge.length > 0) {
            // Recalculate merged bounds based on actual layout
            const minX = Math.min(...cellsInMerge.map((item) => item.x));
            const minY = Math.min(...cellsInMerge.map((item) => item.y));
            const maxX = Math.max(...cellsInMerge.map((item) => item.x + item.w));
            const maxY = Math.max(...cellsInMerge.map((item) => item.y + item.h));

            return {
              ...m,
              startCol: Math.floor(minX / 3),
              startRow: Math.floor(minY / 3),
              endCol: Math.floor((maxX - 3) / 3),
              endRow: Math.floor((maxY - 3) / 3),
            };
          }
          return m;
        }) || [];

      // Filter out merged cells that are out of bounds
      const validMergedCells = updatedMergedCells.filter(
        (m) =>
          m.startRow < layout.rows &&
          m.endRow < layout.rows &&
          m.startCol < layout.cols &&
          m.endCol < layout.cols &&
          m.startRow >= 0 &&
          m.endRow >= 0 &&
          m.startCol >= 0 &&
          m.endCol >= 0
      );

      onConfigUpdate({
        ...config,
        cells: updatedCells,
        mergedCells: validMergedCells,
      });
    },
    [cells, config, layout.cols, layout.rows, mergedCells, onConfigUpdate]
  );

  // Handle cell stop
  const handleCellStop = useCallback(
    (cellId: string) => {
      const vscode = (window as unknown as { vscode?: { postMessage: (msg: unknown) => void } }).vscode;
      if (vscode) {
        vscode.postMessage({
          type: 'terminal:stop',
          payload: { cellId },
        });
      }
    },
    []
  );

  // Handle cell restart
  const handleCellRestart = useCallback(
    (cellId: string) => {
      const vscode = (window as unknown as { vscode?: { postMessage: (msg: unknown) => void } }).vscode;
      if (vscode) {
        vscode.postMessage({
          type: 'terminal:restart',
          payload: { cellId },
        });
      }
    },
    []
  );

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

  return (
    <div 
      ref={containerRef}
      className={`terminal-grid-container ${theme} w-full h-full flex-1`}
      style={{ width: '100%', height: '100%' }}
    >
      <GridLayout
        className="terminal-grid"
        layout={gridLayout}
        cols={layout.cols * 3}
        rowHeight={rowHeight}
        width={gridWidth}
        onLayoutChange={handleLayoutChange}
        isDraggable={false}
        isResizable={false}
        margin={[6, 6]}
        containerPadding={[6, 6]}
      >
        {visibleCells.map((cell) => (
          <div key={cell.id} className="grid-cell">
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
          </div>
        ))}
      </GridLayout>
      
      <GridResizer
        rows={layout.rows}
        cols={layout.cols}
        containerWidth={gridWidth}
        containerHeight={containerHeight}
      />
    </div>
  );
};

export default TerminalGrid;
