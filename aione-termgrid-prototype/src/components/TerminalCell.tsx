import { useState } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Maximize2,
  Settings2,
  GripVertical,
} from 'lucide-react';
import type { TerminalCell as TerminalCellType, TerminalStatus } from '../types';

interface TerminalCellProps {
  cell: TerminalCellType;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onMaximize: (cell: TerminalCellType) => void;
  onEdit: (id: string) => void;
}

const statusColors: Record<TerminalStatus, string> = {
  running: 'bg-status-running',
  stopped: 'bg-status-stopped',
  pending: 'bg-status-pending',
};

const statusText: Record<TerminalStatus, string> = {
  running: '运行中',
  stopped: '已停止',
  pending: '启动中',
};

export default function TerminalCellComponent({
  cell,
  onStart,
  onStop,
  onRestart,
  onMaximize,
  onEdit,
}: TerminalCellProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-glow"
      style={{ borderColor: cell.borderColor }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${statusColors[cell.status]} ${
              cell.status === 'running' ? 'animate-pulse' : ''
            }`}
          />
          <span className="text-xs font-medium text-text-secondary">
            {statusText[cell.status]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {cell.status === 'stopped' ? (
            <button
              onClick={() => onStart(cell.id)}
              className="p-1 rounded hover:bg-bg-hover transition-colors"
              title="启动"
            >
              <Play className="w-3.5 h-3.5 text-status-running" />
            </button>
          ) : (
            <button
              onClick={() => onStop(cell.id)}
              className="p-1 rounded hover:bg-bg-hover transition-colors"
              title="关闭"
            >
              <Square className="w-3.5 h-3.5 text-status-stopped" />
            </button>
          )}
          <button
            onClick={() => onRestart(cell.id)}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
            title="重启"
          >
            <RotateCcw className="w-3.5 h-3.5 text-status-pending" />
          </button>
          <button
            onClick={() => onMaximize(cell)}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
            title="放大"
          >
            <Maximize2 className="w-3.5 h-3.5 text-text-muted" />
          </button>
          <button
            onClick={() => onEdit(cell.id)}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
            title="编辑"
          >
            <Settings2 className="w-3.5 h-3.5 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative bg-terminal-bg p-3 font-mono text-xs overflow-hidden">
        <div className="text-terminal-text/60">
          <div>$ {cell.command.default}</div>
          {cell.status === 'running' && (
            <>
              <div className="mt-1">&gt; Starting {cell.title}...</div>
              <div className="mt-1">&gt; Working directory: {cell.cwd}</div>
              <div className="mt-1">&gt; Server listening on port 3000</div>
              <div className="mt-1">&gt; Connected to database</div>
              <div className="mt-1 animate-pulse">_</div>
            </>
          )}
          {cell.status === 'stopped' && (
            <div className="mt-1 text-status-stopped/60">Process exited with code 0</div>
          )}
          {cell.status === 'pending' && (
            <>
              <div className="mt-1 animate-pulse">&gt; Waiting... (delay: {cell.delay}s)</div>
            </>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary border-t border-border">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-text-muted cursor-grab" />
          <span className="text-xs text-text-secondary font-medium truncate max-w-[120px]">
            {cell.title}
          </span>
        </div>
        <span className="text-xs text-text-muted">{cell.cwd}</span>
      </div>
    </div>
  );
}
