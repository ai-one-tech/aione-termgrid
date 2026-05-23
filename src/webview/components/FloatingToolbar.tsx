import React from 'react';
import { TranslationKey } from '../../shared/translations';
import { RefreshIcon, SaveIcon, SettingsIcon, StopIcon, CopyIcon } from './Icons';
import { Button } from './ui/button';

interface FloatingToolbarProps {
  isDirty: boolean;
  onSave: () => void;
  onSaveAs: () => void;
  onStopAll: () => void;
  onRestartAll: () => void;
  onOpenSettings: () => void;
  t: (key: TranslationKey) => string;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  isDirty,
  onSave,
  onSaveAs,
  onStopAll,
  onRestartAll,
  onOpenSettings,
  t,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 px-3 h-[44px] bg-background">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{t('appName')}</h1>
        {isDirty && (
          <>
            <span className="flex items-center gap-2 text-sm text-amber-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {t('unsaved')}
            </span>
            <Button variant="outline" size="sm" onClick={onSave} className="flex items-center gap-2 rounded-full">
              <SaveIcon size={14} />
              <span>{t('save')}</span>
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onRestartAll} title={t('restart')}>
          <RefreshIcon size={16} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onStopAll} title={t('stop')}>
          <StopIcon size={16} />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="icon" onClick={onSaveAs} title={t('saveAs')}>
          <CopyIcon size={16} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenSettings} title={t('settings')}>
          <SettingsIcon size={16} />
        </Button>
      </div>
    </div>
  );
};

export default FloatingToolbar;
