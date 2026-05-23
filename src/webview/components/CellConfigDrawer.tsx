import React, { useState, useEffect, useRef } from 'react';
import { TerminalCell } from '../../shared/schema';
import { TranslationKey } from '../../shared/translations';
import { BORDER_COLORS } from '../../shared/constants';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface CellConfigDrawerProps {
  cell: TerminalCell | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (cellId: string, updates: Partial<TerminalCell>) => void;
  t: (key: TranslationKey) => string;
}

type PlatformKey = 'default' | 'win32' | 'darwin' | 'linux';

const PLATFORM_KEYS: { key: PlatformKey; labelKey: TranslationKey }[] = [
  { key: 'default', labelKey: 'default' },
  { key: 'win32', labelKey: 'windows' },
  { key: 'darwin', labelKey: 'macOS' },
  { key: 'linux', labelKey: 'linux' },
];

const CellConfigDrawer: React.FC<CellConfigDrawerProps> = ({
  cell,
  open,
  onOpenChange,
  onSave,
  t,
}) => {
  const [localCell, setLocalCell] = useState<TerminalCell | undefined>(cell);
  const [activePlatform, setActivePlatform] = useState<PlatformKey>('default');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalCell(cell);
    setActivePlatform('default');
  }, [cell]);

  if (!localCell) return null;

  const handleUpdate = (updates: Partial<TerminalCell>) => {
    setLocalCell((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleCommandChange = (platform: PlatformKey, value: string) => {
    const newCommand = { ...localCell.command, [platform]: value };
    handleUpdate({ command: newCommand });
  };

  const handleSave = () => {
    if (localCell) {
      const updates: Partial<TerminalCell> = {
        title: localCell.title,
        cwd: localCell.cwd,
        command: localCell.command,
        order: localCell.order,
        delay: localCell.delay,
        borderColor: localCell.borderColor,
      };
      onSave(localCell.id, updates);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="p-6 pb-4 shrink-0 border-b border-[var(--vscode-panel-border,#3c3c3c)]">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--vscode-focusBorder,#007fd4)]">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {localCell.title}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[var(--vscode-editor-foreground,#cccccc)]">{t('title')}</Label>
            <Input
              value={localCell.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              className="bg-[var(--vscode-input-background,#3c3c3c)] border-[var(--vscode-input-border,#3c3c3c)] text-[var(--vscode-editor-foreground,#cccccc)]"
            />
          </div>

          {/* Working Directory */}
          <div className="space-y-2">
            <Label className="text-[var(--vscode-editor-foreground,#cccccc)]">{t('workingDirectory')}</Label>
            <Input
              value={localCell.cwd}
              onChange={(e) => handleUpdate({ cwd: e.target.value })}
              className="bg-[var(--vscode-input-background,#3c3c3c)] border-[var(--vscode-input-border,#3c3c3c)] text-[var(--vscode-editor-foreground,#cccccc)]"
            />
          </div>

          {/* Command */}
          <div className="space-y-2">
            <Label className="text-[var(--vscode-editor-foreground,#cccccc)]">{t('command')}</Label>
            <div className="flex gap-1 flex-wrap">
              {PLATFORM_KEYS.map((p) => (
                <Button
                  key={p.key}
                  variant={activePlatform === p.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePlatform(p.key)}
                  className={activePlatform === p.key ? '' : 'border-[var(--vscode-panel-border,#3c3c3c)]'}
                >
                  {t(p.labelKey)}
                </Button>
              ))}
            </div>
            <Textarea
              value={localCell.command[activePlatform] || localCell.command.default}
              onChange={(e) => handleCommandChange(activePlatform, e.target.value)}
              rows={3}
              className="bg-[var(--vscode-input-background,#3c3c3c)] border-[var(--vscode-input-border,#3c3c3c)] text-[var(--vscode-editor-foreground,#cccccc)]"
            />
          </div>

          {/* Order and Delay */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[var(--vscode-editor-foreground,#cccccc)]">{t('order')}</Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={localCell.order}
                onChange={(e) => handleUpdate({ order: parseInt(e.target.value) || 1 })}
                className="bg-[var(--vscode-input-background,#3c3c3c)] border-[var(--vscode-input-border,#3c3c3c)] text-[var(--vscode-editor-foreground,#cccccc)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--vscode-editor-foreground,#cccccc)]">{t('delay')}</Label>
              <Input
                type="number"
                min={0}
                max={300}
                value={localCell.delay}
                onChange={(e) => handleUpdate({ delay: parseInt(e.target.value) || 0 })}
                className="bg-[var(--vscode-input-background,#3c3c3c)] border-[var(--vscode-input-border,#3c3c3c)] text-[var(--vscode-editor-foreground,#cccccc)]"
              />
            </div>
          </div>

          {/* Border Color */}
          <div className="space-y-2">
            <Label className="text-[var(--vscode-editor-foreground,#cccccc)]">{t('borderColor')}</Label>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                className={`w-8 h-8 rounded-md border-2 transition-all flex items-center justify-center text-xs text-[var(--vscode-descriptionForeground,#858585)] ${
                  !localCell.borderColor
                    ? 'border-[var(--vscode-focusBorder,#007fd4)] ring-2 ring-[var(--vscode-focusBorder,#007fd4)]'
                    : 'border-[var(--vscode-panel-border,#3c3c3c)]'
                }`}
                style={{ backgroundColor: 'var(--vscode-editor-background,#1e1e1e)' }}
                onClick={() => handleUpdate({ borderColor: undefined })}
                title="None"
              >
                —
              </button>
              {BORDER_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    localCell.borderColor === color
                      ? 'border-[var(--vscode-focusBorder,#007fd4)] ring-2 ring-[var(--vscode-focusBorder,#007fd4)]'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleUpdate({ borderColor: color })}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 shrink-0 border-t border-[var(--vscode-panel-border,#3c3c3c)] flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[var(--vscode-panel-border,#3c3c3c)]"
          >
            {t('cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CellConfigDrawer;
