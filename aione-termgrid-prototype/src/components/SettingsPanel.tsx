import { useState } from 'react';
import {
  X,
  Monitor,
  Command,
  Folder,
  Palette,
  Hash,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TerminalCell, GridLayout } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  layout: GridLayout;
  onLayoutChange: (layout: GridLayout) => void;
  cells: TerminalCell[];
  onCellUpdate: (cell: TerminalCell) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  layout,
  onLayoutChange,
  cells,
  onCellUpdate,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'layout' | 'cells'>('layout');
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [localLayout, setLocalLayout] = useState(layout);

  if (!isOpen) return null;

  const handleLayoutApply = () => {
    onLayoutChange(localLayout);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[640px] max-h-[85vh] bg-bg-secondary rounded-2xl border border-border shadow-float overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">页面设置</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4">
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'layout'
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            布局设置
          </button>
          <button
            onClick={() => setActiveTab('cells')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'cells'
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            终端配置
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-text-muted" />
                  网格布局
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-text-muted mb-1 block">行数</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={localLayout.rows}
                      onChange={(e) =>
                        setLocalLayout({ ...localLayout, rows: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-text-muted mb-1 block">列数</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={localLayout.cols}
                      onChange={(e) =>
                        setLocalLayout({ ...localLayout, cols: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <button
                  onClick={handleLayoutApply}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
                >
                  应用布局
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Hash className="w-4 h-4 text-text-muted" />
                  快速预设
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['2x2', '3x3', '2x3', '3x2', '1x4', '4x1'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        const [r, c] = preset.split('x').map(Number);
                        setLocalLayout({ rows: r, cols: c });
                      }}
                      className="px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cells' && (
            <div className="space-y-3">
              {cells.map((cell) => (
                <div
                  key={cell.id}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedCell(expandedCell === cell.id ? null : cell.id)
                    }
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cell.borderColor }}
                      />
                      <span className="text-sm font-medium text-text-primary">
                        {cell.title}
                      </span>
                    </div>
                    {expandedCell === cell.id ? (
                      <ChevronUp className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    )}
                  </button>

                  {expandedCell === cell.id && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-text-muted mb-1 block">标题</label>
                          <input
                            type="text"
                            value={cell.title}
                            onChange={(e) =>
                              onCellUpdate({ ...cell, title: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted mb-1 block flex items-center gap-1">
                            <Palette className="w-3 h-3" />
                            边框颜色
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={cell.borderColor}
                              onChange={(e) =>
                                onCellUpdate({ ...cell, borderColor: e.target.value })
                              }
                              className="w-10 h-9 rounded-lg border border-border cursor-pointer"
                            />
                            <input
                              type="text"
                              value={cell.borderColor}
                              onChange={(e) =>
                                onCellUpdate({ ...cell, borderColor: e.target.value })
                              }
                              className="flex-1 px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-text-muted mb-1 block flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          工作目录
                        </label>
                        <input
                          type="text"
                          value={cell.cwd}
                          onChange={(e) =>
                            onCellUpdate({ ...cell, cwd: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-text-muted mb-1 block flex items-center gap-1">
                          <Command className="w-3 h-3" />
                          启动命令
                        </label>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-text-muted">默认</label>
                            <input
                              type="text"
                              value={cell.command.default}
                              onChange={(e) =>
                                onCellUpdate({
                                  ...cell,
                                  command: { ...cell.command, default: e.target.value },
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-text-muted">Windows</label>
                              <input
                                type="text"
                                value={cell.command.win32 || ''}
                                onChange={(e) =>
                                  onCellUpdate({
                                    ...cell,
                                    command: { ...cell.command, win32: e.target.value },
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-text-muted">macOS</label>
                              <input
                                type="text"
                                value={cell.command.darwin || ''}
                                onChange={(e) =>
                                  onCellUpdate({
                                    ...cell,
                                    command: { ...cell.command, darwin: e.target.value },
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-text-muted">Linux</label>
                              <input
                                type="text"
                                value={cell.command.linux || ''}
                                onChange={(e) =>
                                  onCellUpdate({
                                    ...cell,
                                    command: { ...cell.command, linux: e.target.value },
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-text-muted mb-1 block flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            执行顺序
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={cell.order}
                            onChange={(e) =>
                              onCellUpdate({ ...cell, order: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted mb-1 block flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            启动延迟 (秒)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={cell.delay}
                            onChange={(e) =>
                              onCellUpdate({ ...cell, delay: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
