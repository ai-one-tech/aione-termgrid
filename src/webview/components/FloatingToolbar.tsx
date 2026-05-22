import React from 'react';
import { TermGridConfig } from '../../shared/schema';
import { Theme, Language } from '../../shared/types';
import { LAYOUT_PRESETS } from '../../shared/types';
import { TranslationKey } from '../../shared/constants';

interface FloatingToolbarProps {
  config: TermGridConfig;
  isDirty: boolean;
  theme: Theme;
  language: Language;
  onSave: () => void;
  onStartAll: () => void;
  onStopAll: () => void;
  onRestartAll: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onChangeLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  config,
  isDirty,
  theme,
  language,
  onSave,
  onStartAll,
  onStopAll,
  onRestartAll,
  onOpenSettings,
  onToggleTheme,
  onChangeLanguage,
  t,
}) => {
  return (
    <div className={`floating-toolbar ${theme}`}>
      <div className="toolbar-left">
        <h1 className="app-title">{t('appName')}</h1>
        {isDirty && (
          <span className="unsaved-indicator">
            <span className="dot" />
            {t('unsaved')}
          </span>
        )}
      </div>

      <div className="toolbar-center">
        <div className="layout-presets">
          {LAYOUT_PRESETS.slice(0, 8).map((preset) => (
            <button
              key={preset.name}
              className={`preset-btn ${
                config.layout.rows === preset.rows && config.layout.cols === preset.cols
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                // Handle layout change
              }}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-right">
        <button className="toolbar-btn" onClick={onStartAll} title={t('start')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2L13 8L3 14V2Z" fill="currentColor" />
          </svg>
        </button>
        <button className="toolbar-btn" onClick={onStopAll} title={t('stop')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="3" width="10" height="10" fill="currentColor" />
          </svg>
        </button>
        <button className="toolbar-btn" onClick={onRestartAll} title={t('restart')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2.5A5.5 5.5 0 0 0 2.5 8A5.5 5.5 0 0 0 8 13.5A5.5 5.5 0 0 0 13.5 8"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M13.5 4V8H9.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>

        <div className="toolbar-divider" />

        <button className="toolbar-btn" onClick={onToggleTheme} title="Toggle Theme">
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        <select
          className="language-select"
          value={language}
          onChange={(e) => onChangeLanguage(e.target.value as Language)}
        >
          <option value="en">EN</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>

        <button className="toolbar-btn settings-btn" onClick={onOpenSettings} title={t('settings')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 1V3M8 13V15M1 8H3M13 8H15M3.05 3.05L4.46 4.46M11.54 11.54L12.95 12.95M3.05 12.95L4.46 11.54M11.54 4.46L12.95 3.05"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>

        <button className="toolbar-btn save-btn" onClick={onSave} title={t('save')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 11.5V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V11.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M8 3V11M8 11L5 8M8 11L11 8" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FloatingToolbar;
