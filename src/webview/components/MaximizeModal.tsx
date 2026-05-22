import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalCell } from '../../shared/schema';
import { Theme, TerminalStatus } from '../../shared/types';
import { TranslationKey } from '../../shared/constants';
import '@xterm/xterm/css/xterm.css';

interface MaximizeModalProps {
  cell: TerminalCell;
  theme: Theme;
  status: TerminalStatus;
  onClose: () => void;
  onInput: (data: string) => void;
  t: (key: TranslationKey) => string;
}

const MaximizeModal: React.FC<MaximizeModalProps> = ({
  cell,
  theme,
  status,
  onClose,
  onInput,
  t,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      fontSize: 16,
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
      scrollback: 10000,
      allowTransparency: true,
      cursorStyle: 'block',
    });

    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(terminalRef.current);

    // Delay fit to ensure container has dimensions
    requestAnimationFrame(() => {
      fit.fit();
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
  }, [theme, cell.id, onInput]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      fitAddon.current?.fit();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    <div className={`maximize-modal-overlay ${theme}`} onClick={onClose}>
      <div className="maximize-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span
              className="status-dot"
              style={{ backgroundColor: getStatusColor() }}
            />
            <span>{cell.title}</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3L13 13M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
        <div
          ref={terminalRef}
          className="maximized-terminal"
          style={{
            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
          }}
        />
      </div>
    </div>
  );
};

export default MaximizeModal;
