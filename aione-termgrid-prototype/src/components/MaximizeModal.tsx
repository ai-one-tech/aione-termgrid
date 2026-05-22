import { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  RotateCcw,
  Minimize2,
  GripVertical,
  Folder,
} from 'lucide-react';
import type { TerminalCell as TerminalCellType } from '../types';

interface MaximizeModalProps {
  cell: TerminalCellType | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
}

export default function MaximizeModal({
  cell,
  isOpen,
  onClose,
  onStart,
  onStop,
  onRestart,
}: MaximizeModalProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (cell) {
      setLogs([
        `[${new Date().toISOString()}] Starting ${cell.title}...`,
        `[${new Date().toISOString()}] Working directory: ${cell.cwd}`,
        `[${new Date().toISOString()}] Command: ${cell.command.default}`,
        `[${new Date().toISOString()}] Process PID: ${Math.floor(Math.random() * 10000 + 1000)}`,
        `[${new Date().toISOString()}] Server listening on port ${3000 + Math.floor(Math.random() * 1000)}`,
        `[${new Date().toISOString()}] Connected to database`,
        `[${new Date().toISOString()}] Ready to accept connections`,
      ]);
    }
  }, [cell]);

  if (!isOpen || !cell) return null;

  const statusColors = {
    running: 'bg-status-running',
    stopped: 'bg-status-stopped',
    pending: 'bg-status-pending',
  };

  const statusText = {
    running: '运行中',
    stopped: '已停止',
    pending: '启动中',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh] bg-bg-secondary rounded-2xl border border-border shadow-float overflow-hidden flex flex-col"
        style={{ borderColor: cell.borderColor }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: cell.borderColor + '40' }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${statusColors[cell.status]} ${
                cell.status === 'running' ? 'animate-pulse' : ''
              }`}
            />
            <h2 className="text-lg font-semibold text-text-primary">{cell.title}</h2>
            <span className="text-xs text-text-muted px-2 py-0.5 rounded bg-bg-tertiary">
              {statusText[cell.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {cell.status === 'stopped' ? (
              <button
                onClick={() => onStart(cell.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-status-running/10 text-status-running hover:bg-status-running/20 transition-colors"
              >
                <Play className="w-4 h-4" />
                启动
              </button>
            ) : (
              <button
                onClick={() => onStop(cell.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-status-stopped/10 text-status-stopped hover:bg-status-stopped/20 transition-colors"
              >
                <Square className="w-4 h-4" />
                关闭
              </button>
            )}
            <button
              onClick={() => onRestart(cell.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-status-pending/10 text-status-pending hover:bg-status-pending/20 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重启
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
              title="缩小"
            >
              <Minimize2 className="w-5 h-5 text-text-muted" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="flex-1 bg-terminal-bg p-6 font-mono text-sm overflow-auto">
          <div className="text-terminal-text/80">
            <div className="mb-2 text-terminal-text/50">
              $ {cell.command.default}
            </div>
            {logs.map((log, i) => (
              <div key={i} className="py-0.5">
                <span className="text-terminal-text/40">{log}</span>
              </div>
            ))}
            {cell.status === 'running' && (
              <div className="animate-pulse mt-2">_</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-bg-tertiary">
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <Folder className="w-3 h-3" />
              <span>{cell.cwd}</span>
            </div>
            <div className="flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              <span>顺序: {cell.order}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>延迟: {cell.delay}s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">PID: {Math.floor(Math.random() * 10000 + 1000)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
