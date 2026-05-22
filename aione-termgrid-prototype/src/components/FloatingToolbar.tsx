import { useState } from 'react';
import {
  Settings,
  Save,
  Grid3X3,
  LayoutGrid,
  Rows2,
  Columns2,
  ChevronDown,
  Check,
} from 'lucide-react';
import type { GridLayout, TermGridConfig } from '../types';

interface FloatingToolbarProps {
  config: TermGridConfig;
  onLayoutChange: (layout: GridLayout) => void;
  onSave: () => void;
  onOpenSettings: () => void;
}

const presetLayouts: { label: string; layout: GridLayout; icon: React.ReactNode }[] = [
  { label: '2 x 2', layout: { rows: 2, cols: 2 }, icon: <LayoutGrid className="w-4 h-4" /> },
  { label: '3 x 3', layout: { rows: 3, cols: 3 }, icon: <Grid3X3 className="w-4 h-4" /> },
  { label: '2 x 3', layout: { rows: 2, cols: 3 }, icon: <Rows2 className="w-4 h-4" /> },
  { label: '3 x 2', layout: { rows: 3, cols: 2 }, icon: <Columns2 className="w-4 h-4" /> },
  { label: '1 x 4', layout: { rows: 1, cols: 4 }, icon: <LayoutGrid className="w-4 h-4" /> },
  { label: '4 x 1', layout: { rows: 4, cols: 1 }, icon: <LayoutGrid className="w-4 h-4" /> },
];

export default function FloatingToolbar({
  config,
  onLayoutChange,
  onSave,
  onOpenSettings,
}: FloatingToolbarProps) {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-secondary/95 backdrop-blur-md border border-border shadow-float">
      {/* File Name */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-bg-tertiary">
        <span className="text-sm font-medium text-text-primary">{config.name}</span>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-status-running">
            <Check className="w-3 h-3" />
            已保存
          </span>
        )}
      </div>

      <div className="w-px h-5 bg-border" />

      {/* Layout Presets */}
      <div className="relative">
        <button
          onClick={() => setShowLayoutMenu(!showLayoutMenu)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
        >
          <LayoutGrid className="w-4 h-4" />
          <span>布局</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showLayoutMenu ? 'rotate-180' : ''}`} />
        </button>

        {showLayoutMenu && (
          <div className="absolute top-full left-0 mt-2 w-48 p-2 rounded-xl bg-bg-secondary border border-border shadow-float">
            {presetLayout.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onLayoutChange(preset.layout);
                  setShowLayoutMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  config.layout.rows === preset.layout.rows &&
                  config.layout.cols === preset.layout.cols
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {preset.icon}
                <span>{preset.label}</span>
                {config.layout.rows === preset.layout.rows &&
                  config.layout.cols === preset.layout.cols && (
                  <Check className="w-3 h-3 ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Layout Display */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-tertiary text-xs text-text-muted">
        <span>{config.layout.rows}</span>
        <span>x</span>
        <span>{config.layout.cols}</span>
      </div>

      <div className="w-px h-5 bg-border" />

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
      >
        <Settings className="w-4 h-4" />
        <span>设置</span>
      </button>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
      >
        <Save className="w-4 h-4" />
        <span>保存</span>
      </button>
    </div>
  );
}

// Fix: define presetLayout
const presetLayout = [
  { label: '2 x 2', layout: { rows: 2, cols: 2 }, icon: <LayoutGrid className="w-4 h-4" /> },
  { label: '3 x 3', layout: { rows: 3, cols: 3 }, icon: <Grid3X3 className="w-4 h-4" /> },
  { label: '2 x 3', layout: { rows: 2, cols: 3 }, icon: <Rows2 className="w-4 h-4" /> },
  { label: '3 x 2', layout: { rows: 3, cols: 2 }, icon: <Columns2 className="w-4 h-4" /> },
  { label: '1 x 4', layout: { rows: 1, cols: 4 }, icon: <LayoutGrid className="w-4 h-4" /> },
  { label: '4 x 1', layout: { rows: 4, cols: 1 }, icon: <LayoutGrid className="w-4 h-4" /> },
];
