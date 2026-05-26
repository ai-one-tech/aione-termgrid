import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { TerminalCell as TerminalCellType } from '../../shared/schema';
import { Theme, TerminalStatus } from '../../shared/types';
import { TranslationKey } from '../../shared/translations';
import { getXtermTheme } from '../theme';
import { loadXtermAddons } from '../lib/xtermAddons';
import { MaximizeIcon, RefreshIcon, StopIcon } from './Icons';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import '@xterm/xterm/css/xterm.css';

interface TerminalCellProps {
  cell: TerminalCellType;
  theme: Theme;
  status: TerminalStatus;
  onStop: () => void;
  onRestart: () => void;
  onMaximize: () => void;
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  registerTerminalRef: (cellId: string, ref: { write: (data: string) => void; clear: () => void }, action: 'register' | 'unregister') => void;
  t: (key: TranslationKey) => string;
}

const TerminalCellComponent: React.FC<TerminalCellProps> = ({
  cell,
  theme,
  status,
  onStop,
  onRestart,
  onMaximize,
  onInput,
  onResize,
  registerTerminalRef,
  t,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<ReturnType<typeof loadXtermAddons>['fit'] | null>(null);
  const onInputRef = useRef(onInput);
  const onResizeRef = useRef(onResize);
  // Use external status directly to avoid setState in effect

  useEffect(() => {
    onInputRef.current = onInput;
  }, [onInput]);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: getXtermTheme(),
      cursorBlink: true,
      scrollback: 5000,
      allowTransparency: true,
      cursorStyle: 'block',
    });

    const { fit } = loadXtermAddons(terminal);
    terminal.open(terminalRef.current);

    // Delay fit to ensure container has dimensions
    requestAnimationFrame(() => {
      fit.fit();
      const { cols, rows } = terminal;
      onResizeRef.current(cols, rows);
    });

    // Handle input
    terminal.onData((data) => {
      onInputRef.current(data);
    });

    terminalInstance.current = terminal;
    fitAddon.current = fit;

    // Register terminal ref
    const ref = {
      write: (data: string) => terminal.write(data),
      clear: () => terminal.clear(),
    };
    registerTerminalRef(cell.id, ref, 'register');

    return () => {
      registerTerminalRef(cell.id, ref, 'unregister');
      terminal.dispose();
    };
  }, [theme, cell.id, registerTerminalRef]);

  // Handle resize
  useEffect(() => {
    if (!terminalRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current && terminalInstance.current) {
        // Use requestAnimationFrame to ensure the DOM has updated before fitting
        requestAnimationFrame(() => {
          if (fitAddon.current && terminalInstance.current) {
            fitAddon.current.fit();
            const { cols, rows } = terminalInstance.current;
            onResizeRef.current(cols, rows);
          }
        });
      }
    });

    resizeObserver.observe(terminalRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Don't render if cell is hidden (part of a merged area)
  if ((cell as TerminalCellType & { hidden?: boolean }).hidden) {
    return null;
  }

  // Status indicator color
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#22c55e';
      case 'stopped':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case 'running':
        return t('running');
      case 'stopped':
        return t('stopped');
      case 'pending':
        return t('pending');
      case 'error':
        return t('error');
      default:
        return '';
    }
  };

  return (
    <div data-testid="TerminalCell" className="h-full">
      <Card
        className="h-full flex flex-col overflow-hidden"
        style={
          cell.borderColor
            ? {
                borderColor: cell.borderColor + '80',
                '--cell-border-color': cell.borderColor,
              } as React.CSSProperties
            : undefined
        }
      >
        <CardHeader className="px-3 py-1 flex flex-row items-center justify-between border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${status === 'running' ? 'animate-pulse' : ''
                }`}
              style={{ backgroundColor: getStatusColor() }}
              title={getStatusText()}
            />
            <span className="truncate" title={cell.title}>{cell.title}</span>
            <span className="text-xs text-muted-foreground ml-1">
              {getStatusText()}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRestart}
              title={t('restart')}
            >
              <RefreshIcon size={14} className="text-green-500" />
            </Button>
            {
              status !== 'stopped' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onStop}
                  title={t('stop')}
                >
                  <StopIcon size={14} className="text-red-500" />
                </Button>
              )
            }
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMaximize}
              title={t('zoom')}
            >
              <MaximizeIcon size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden relative">
          <div 
            ref={terminalRef} 
            className="absolute inset-0" 
            style={{ backgroundColor: 'var(--vscode-terminal-background, var(--vscode-editor-background, #1e1e1e))' }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TerminalCellComponent;
