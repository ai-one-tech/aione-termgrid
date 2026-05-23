import React from 'react';
import { TermGridConfig } from '../../shared/schema';
import { TranslationKey } from '../../shared/translations';
import { RefreshIcon, SaveIcon, SettingsIcon, StopIcon, CopyIcon } from './Icons';
import { Button } from './ui/button';

interface FloatingToolbarProps {
  isDirty: boolean;
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
  onSave,
  onSaveAs,
  onStopAll,
  onRestartAll,
  onOpenSettings,
  onReloadWebview,
  t,
}) => {
  return (
    <div data-testid="FloatingToolbar" className="flex items-center justify-between gap-4 px-3 h-[32px] bg-background">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{t('appName')}</h1>
        {isDirty && (
          <>
            <span className="flex items-center gap-2 text-sm text-amber-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {t('unsaved')}
            </span>
            <Button variant="outline" size="sm" onClick={() => onSave()} className="flex items-center gap-1.5 rounded-full h-6 px-2.5 text-xs">
              <SaveIcon size={12} />
              <span>{t('save')}</span>
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
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

        {(window as any).__VSCODE_IS_DEV__ && (
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
      </div>
    </div>
  );
};

export default FloatingToolbar;
