import React, { useState } from 'react';
import { TermGridConfig } from '../../shared/schema';
import { TranslationKey } from '../../shared/translations';
import { RefreshIcon, SaveIcon, SettingsIcon, StopIcon, CopyIcon } from './Icons';
import { Button } from './ui/button';

interface ModifiedField {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

interface VSCodeDevWindow extends Window {
  __VSCODE_IS_DEV__?: boolean;
}

interface FloatingToolbarProps {
  isDirty: boolean;
  modifiedFields?: ModifiedField[];
  onSave: (config?: TermGridConfig) => void;
  onSaveAs: () => void;
  onStopAll: () => void;
  onRestartAll: () => void;
  onOpenSettings: () => void;
  onReloadWebview?: () => void;
  t: (key: TranslationKey) => string;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  isDirty,
  modifiedFields = [],
  onSave,
  onSaveAs,
  onStopAll,
  onRestartAll,
  onOpenSettings,
  onReloadWebview,
  t,
}) => {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  return (
    <div data-testid="FloatingToolbar" className="flex items-center justify-between gap-4 px-3 h-[32px] bg-background">
      <div className="flex items-center gap-3 relative">
        <h1 className="text-lg font-semibold">{t('appName')}</h1>
        {isDirty && (
          <>
            <span
              className="flex items-center gap-2 text-sm text-amber-500 cursor-help"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              title={modifiedFields.length > 0 ? `点击${showDebugInfo ? '隐藏' : '查看'}修改详情` : '未保存更改'}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {t('unsaved')}
              {modifiedFields.length > 0 && (
                <span className="text-xs text-amber-600/70">
                  ({modifiedFields.length}个字段)
                </span>
              )}
            </span>
            {showDebugInfo && modifiedFields.length > 0 && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md shadow-lg z-50 max-w-md max-h-48 overflow-auto">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                  修改的字段 ({modifiedFields.length}):
                </div>
                <ul className="text-xs space-y-1">
                  {modifiedFields.map((field, idx) => {
                    const oldVal = typeof field.oldValue === 'object'
                      ? JSON.stringify(field.oldValue)
                      : String(field.oldValue ?? 'null');
                    const newVal = typeof field.newValue === 'object'
                      ? JSON.stringify(field.newValue)
                      : String(field.newValue ?? 'null');
                    return (
                      <li key={idx} className="text-amber-600 dark:text-amber-400">
                        <span className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">
                          {field.path}
                        </span>
                        <div className="mt-0.5 ml-2 text-[10px] opacity-80">
                          <span className="line-through text-red-500">{oldVal}</span>
                          <span className="mx-1">→</span>
                          <span className="text-green-500">{newVal}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => onSave()} className="flex items-center gap-1.5 rounded-full h-6 px-2.5 text-xs">
              <SaveIcon size={12} />
              <span>{t('save')}</span>
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">

        {(window as VSCodeDevWindow).__VSCODE_IS_DEV__ && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onReloadWebview} 
              title="Reload Webview (Dev)"
              className="text-amber-500 hover:text-amber-600"
            >
              <RefreshIcon size={14} />
            </Button>
          </>
        )}
        
        <Button variant="ghost" size="icon" onClick={onRestartAll} title={t('restart')}>
          <RefreshIcon size={14} className="text-green-500" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onStopAll} title={t('stop')}>
          <StopIcon size={14} className="text-red-500" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="icon" onClick={onSaveAs} title={t('saveAs')}>
          <CopyIcon size={14} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenSettings} title={t('settings')}>
          <SettingsIcon size={14} />
        </Button>

      </div>
    </div>
  );
};

export default FloatingToolbar;
