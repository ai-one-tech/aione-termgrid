import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalCell as TerminalCellType } from '../../shared/schema';
import { Theme, TerminalStatus } from '../../shared/types';
import { TranslationKey } from '../../shared/constants';
import '@xterm/xterm/css/xterm.css';

interface TerminalCellProps {
  cell: TerminalCellType;
  theme: Theme;
  status: TerminalStatus;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onMaximize: () => void;
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  t: (key: TranslationKey) => string;
}

const TerminalCellComponent: React.FC<TerminalCellProps> = ({
  cell,
  theme,
  status: externalStatus,
  onStart,
  onStop,
  onRestart,
  onMaximize,
  onInput,
  onResize,
  t,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<TerminalStatus>(externalStatus);

  // Sync external status
  useEffect(() => {
    setStatus(externalStatus);
  }, [externalStatus]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: theme === 'dark' ? '#0f172a' : '#ffffff',
        foreground: theme === 'dark' ? '#f8fafc' : '#0f172a',
        cursor: theme === 'dark' ? '#22c55e' : '#0f172a',
        selectionBackground: theme === 'dark' ? '#334155' : '#e2e8f0',
        black: '#0f172a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
      cursorBlink: true,
      scrollback: 5000,
      allowTransparency: true,
      cursorStyle: 'block',
    });

    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(terminalRef.current);

    // Delay fit to ensure container has dimensions
    requestAnimationFrame(() => {
      fit.fit();
      const { cols, rows } = terminal;
      onResize(cols, rows);
    });

    // Handle input
    terminal.onData((data) => {
      onInput(data);
    });

    terminalInstance.current = terminal;
    fitAddon.current = fit;

    return () => {
      terminal.dispose();
    };
  }, [theme, onInput, onResize]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon.current && terminalInstance.current) {
        fitAddon.current.fit();
        const { cols, rows } = terminalInstance.current;
        onResize(cols, rows);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onResize]);

  // Expose write method for parent
  useEffect(() => {
    (terminalRef.current as any)?.__terminal?.dispose();
    if (terminalRef.current) {
      (terminalRef.current as any).__terminal = {
        write: (data: string) => terminalInstance.current?.write(data),
        clear: () => terminalInstance.current?.clear(),
      };
    }
  }, []);

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

  return (
    <div
      className={`terminal-cell ${theme}`}
      style={{ borderColor: cell.borderColor }}
    >
      {/* Cell Header */}
      <div className="cell-header">
        <div className="cell-title">
          <span
            className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className="title-text">{cell.title}</span>
        </div>

        <div className="cell-actions">
          <button
            className="cell-btn"
            onClick={onStart}
            title={t('start')}
            disabled={status === 'running'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 2L13 8L3 14V2Z" fill="currentColor" />
            </svg>
          </button>

          <button
            className="cell-btn"
            onClick={onStop}
            title={t('stop')}
            disabled={status === 'stopped'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="3" width="10" height="10" fill="currentColor" />
            </svg>
          </button>

          <button
            className="cell-btn"
            onClick={onRestart}
            title={t('restart')}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2.5A5.5 5.5 0 0 0 2.5 8A5.5 5.5 0 0 0 8 13.5A5.5 5.5 0 0 0 13.5 8"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </button>

          <button
            className="cell-btn"
            onClick={onMaximize}
            title={t('zoom')}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 9V13H7M9 3H13V7M13 3L9 7M7 13L3 9"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div
        ref={terminalRef}
        className="terminal-container"
        style={{
          backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        }}
      />
    </div>
  );
};

export default TerminalCellComponent;
