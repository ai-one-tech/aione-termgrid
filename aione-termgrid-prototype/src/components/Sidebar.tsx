import { useState } from 'react';
import {
  FileText,
  Plus,
  Play,
  Square,
  RotateCcw,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';
import type { ConfigFile } from '../types';

interface SidebarProps {
  configs: ConfigFile[];
  activeConfigId: string | null;
  onSelectConfig: (id: string) => void;
  onNewConfig: () => void;
  onStartAll: () => void;
  onStopAll: () => void;
  onRestartAll: () => void;
}

export default function Sidebar({
  configs,
  activeConfigId,
  onSelectConfig,
  onNewConfig,
  onStartAll,
  onStopAll,
  onRestartAll,
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <aside
      className={`flex flex-col bg-bg-secondary border-r border-border transition-all duration-300 ${
        isExpanded ? 'w-72' : 'w-12'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        {isExpanded && (
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-text-primary">
              .term-grid
            </span>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-bg-hover transition-colors"
        >
          <ChevronRight
            className={`w-4 h-4 text-text-secondary transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </button>
      </div>

      {/* Action Buttons */}
      {isExpanded && (
        <div className="flex items-center gap-1 p-2 border-b border-border">
          <button
            onClick={onStartAll}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-status-running/10 text-status-running hover:bg-status-running/20 transition-colors"
          >
            <Play className="w-3 h-3" />
            启动
          </button>
          <button
            onClick={onStopAll}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-status-stopped/10 text-status-stopped hover:bg-status-stopped/20 transition-colors"
          >
            <Square className="w-3 h-3" />
            关闭
          </button>
          <button
            onClick={onRestartAll}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded bg-status-pending/10 text-status-pending hover:bg-status-pending/20 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重启
          </button>
        </div>
      )}

      {/* New Config Button */}
      {isExpanded && (
        <div className="p-2">
          <button
            onClick={onNewConfig}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded border border-dashed border-border-light text-text-secondary hover:border-accent hover:text-accent hover:bg-accent-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            新建配置
          </button>
        </div>
      )}

      {/* Config List */}
      <div className="flex-1 overflow-y-auto">
        {configs.map((config) => (
          <button
            key={config.id}
            onClick={() => onSelectConfig(config.id)}
            onDoubleClick={() => onSelectConfig(config.id)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
              activeConfigId === config.id
                ? 'bg-accent/10 border-l-2 border-l-accent'
                : 'border-l-2 border-l-transparent hover:bg-bg-hover'
            }`}
          >
            <FileText
              className={`w-4 h-4 flex-shrink-0 ${
                activeConfigId === config.id
                  ? 'text-accent'
                  : 'text-text-muted'
              }`}
            />
            {isExpanded && (
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate text-text-primary">
                  {config.name}
                </div>
                <div className="text-xs text-text-muted truncate">
                  {config.lastModified}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
