import { useState } from 'react';
import { X, FileText, LayoutGrid } from 'lucide-react';

interface NewConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, rows: number, cols: number) => void;
}

export default function NewConfigModal({
  isOpen,
  onClose,
  onCreate,
}: NewConfigModalProps) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入配置文件名称');
      return;
    }
    if (!name.endsWith('.tg')) {
      setError('文件名必须以 .tg 结尾');
      return;
    }
    onCreate(name, rows, cols);
    setName('');
    setRows(2);
    setCols(2);
    setError('');
    onClose();
  };

  const presets = [
    { label: '2 x 2', r: 2, c: 2 },
    { label: '3 x 3', r: 3, c: 3 },
    { label: '2 x 3', r: 2, c: 3 },
    { label: '3 x 2', r: 3, c: 2 },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[480px] bg-bg-secondary rounded-2xl border border-border shadow-float overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">新建配置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-text-muted" />
              配置文件名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="例如: backend-services.tg"
              className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent placeholder:text-text-muted/50"
            />
            {error && <p className="text-xs text-status-stopped">{error}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-text-muted" />
              默认布局
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setRows(preset.r);
                    setCols(preset.c);
                  }}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    rows === preset.r && cols === preset.c
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-bg-tertiary text-text-secondary hover:border-accent/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">行数</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">列数</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={cols}
                  onChange={(e) => setCols(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-text-secondary hover:bg-bg-hover transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
