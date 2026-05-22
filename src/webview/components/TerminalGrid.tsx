import React, { useCallback } from 'react';
import GridLayout from 'react-grid-layout';
import { TermGridConfig, TerminalCell } from '../../shared/schema';
import { Theme, GridLayoutItem, TerminalStatus } from '../../shared/types';
import { TranslationKey } from '../../shared/constants';
import TerminalCellComponent from './TerminalCell';
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
  const { layout, cells } = config;

  // Generate layout items
  const generateLayout = (): GridLayoutItem[] => {
    const items: GridLayoutItem[] = [];
    let currentX = 0;

    cells.forEach((cell) => {
      const colSpan = cell.colSpan || 1;
      const rowSpan = cell.rowSpan || 1;

      // Calculate position
      const x = currentX % layout.cols;
      const y = Math.floor(currentX / layout.cols);

      items.push({
        i: cell.id,
        x: x * 3, // Use 3x multiplier for finer control
        y: y * 3,
        w: colSpan * 3,
        h: rowSpan * 3,
        minW: 1,
        minH: 1,
      });

      currentX += colSpan;
    });

    return items;
  };

  const gridLayout = generateLayout();

  // Handle layout change
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

      onConfigUpdate({
        ...config,
        cells: updatedCells,
      });
    },
    [cells, config, onConfigUpdate]
  );

  // Handle cell start
  const handleCellStart = useCallback(
    (cellId: string) => {
      const vscode = (window as any).vscode;
      if (vscode) {
        vscode.postMessage({
          type: 'terminal:start',
          payload: { cellId },
        });
      }
    },
    []
  );

  // Handle cell stop
  const handleCellStop = useCallback(
    (cellId: string) => {
      const vscode = (window as any).vscode;
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
      const vscode = (window as any).vscode;
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
    <div className={`terminal-grid-container ${theme}`}>
      <GridLayout
        className="terminal-grid"
        layout={gridLayout}
        cols={layout.cols * 3}
        rowHeight={100}
        width={1200}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isDraggable={true}
        isResizable={true}
        margin={[8, 8]}
        containerPadding={[0, 0]}
      >
        {cells.map((cell) => (
          <div key={cell.id} className="grid-cell">
            <TerminalCellComponent
              cell={cell}
              theme={theme}
              status={terminalStatuses[cell.id] || 'stopped'}
              onStart={() => handleCellStart(cell.id)}
              onStop={() => handleCellStop(cell.id)}
              onRestart={() => handleCellRestart(cell.id)}
              onMaximize={() => onMaximize(cell)}
              onInput={(data) => handleCellInput(cell.id, data)}
              onResize={(cols, rows) => handleCellResize(cell.id, cols, rows)}
              t={t}
            />
          </div>
        ))}
      </GridLayout>
    </div>
  );
};

export default TerminalGrid;
