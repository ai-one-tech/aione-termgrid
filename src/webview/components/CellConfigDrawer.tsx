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

// Extract cell index from id like "cell-3" -> 3
const getCellIndex = (id: string): number => {
  const match = id.match(/^(?:cell|merged)-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Check icon component
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CellConfigDrawer: React.FC<CellConfigDrawerProps> = ({
  cell,
  open,
  onOpenChange,
  onSave,
  t,
}) => {
  const [localCell, setLocalCell] = useState<TerminalCell | undefined>(cell);
  const [commandError, setCommandError] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalCell(cell);
    setCommandError(false);
  }, [cell]);

  if (!localCell) return null;

  const cellIndex = getCellIndex(localCell.id);

  const handleUpdate = (updates: Partial<TerminalCell>) => {
    setLocalCell((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleCommandChange = (platform: PlatformKey, value: string) => {
    const command = localCell.command
      ? { ...localCell.command, default: localCell.command.default || '' }
      : { default: '' };

    if (value.trim() === '') {
      if (platform === 'default') {
        handleUpdate({ command: { ...command, default: '' } });
        return;
      }

      const nextCommand = { ...command };
      delete nextCommand[platform];
      handleUpdate({ command: nextCommand });
      return;
    }

    handleUpdate({ command: { ...command, [platform]: value } });
  };

  // Check if at least one command is filled
  const hasValidCommand = (): boolean => {
    if (!localCell.command) return false;
    return Object.values(localCell.command).some(
      (cmd) => cmd && cmd.trim() !== ''
    );
  };

  const handleSave = () => {
    if (!localCell) return;

    // Validate at least one command is filled
    if (!hasValidCommand()) {
      setCommandError(true);
      return;
    }

    setCommandError(false);
    const updates: Partial<TerminalCell> = {
      title: localCell.title,
      cwd: localCell.cwd,
      command: localCell.command,
      delay: localCell.delay,
      borderColor: localCell.borderColor,
    };
    onSave(localCell.id, updates);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="p-6 pb-4 shrink-0 border-b border-[var(--vscode-panel-border,#3c3c3c)]">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="text-[var(--vscode-descriptionForeground,#858585)] font-mono text-sm">#{cellIndex}</span>
            <span className="truncate">{localCell.title}</span>
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

          {/* Command - All platforms visible */}
          <div className="space-y-3">
            <Label className="text-[var(--vscode-editor-foreground,#cccccc)]">{t('command')}</Label>
            {PLATFORM_KEYS.map((p) => {
              const value = (localCell.command && localCell.command[p.key]) || '';
              const isDefault = p.key === 'default';
              const placeholder = t('enterCommand');

              return (
                <div key={p.key} className="space-y-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    isDefault
                      ? 'bg-[var(--vscode-focusBorder,#007fd4)] text-white'
                      : 'bg-[var(--vscode-panel-border,#3c3c3c)] text-[var(--vscode-descriptionForeground,#858585)]'
                  }`}>
                    {t(p.labelKey)}
                  </span>
                  <Textarea
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => handleCommandChange(p.key, e.target.value)}
                    rows={2}
                    className="bg-[var(--vscode-input-background,#3c3c3c)] border-[var(--vscode-input-border,#3c3c3c)] text-[var(--vscode-editor-foreground,#cccccc)] mt-1"
                  />
                </div>
              );
            })}
          </div>

          {/* Delay */}
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

          {/* Border Color */}
          <div className="space-y-2">
            <Label className="text-[var(--vscode-editor-foreground,#cccccc)]">{t('borderColor')}</Label>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                className={`w-8 h-8 rounded-md border-2 transition-all flex items-center justify-center ${
                  !localCell.borderColor
                    ? 'border-[var(--vscode-focusBorder,#007fd4)]'
                    : 'border-[var(--vscode-panel-border,#3c3c3c)]'
                }`}
                style={{ backgroundColor: 'var(--vscode-editor-background,#1e1e1e)' }}
                onClick={() => handleUpdate({ borderColor: undefined })}
                title="None"
              >
                {!localCell.borderColor ? (
                  <CheckIcon className="text-[var(--vscode-focusBorder,#007fd4)]" />
                ) : (
                  <span className="text-xs text-[var(--vscode-descriptionForeground,#858585)]">—</span>
                )}
              </button>
              {BORDER_COLORS.map((color) => {
                const isSelected = localCell.borderColor === color;
                return (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-md border-2 transition-all flex items-center justify-center ${
                      isSelected
                        ? 'border-transparent'
                        : 'border-transparent hover:border-[var(--vscode-panel-border,#3c3c3c)]'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleUpdate({ borderColor: color })}
                  >
                    {isSelected && <CheckIcon className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 shrink-0 border-t border-[var(--vscode-panel-border,#3c3c3c)]">
          {commandError && (
            <div className="mb-3 text-sm text-red-400">
              {t('commandRequired')}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCommandError(false);
                onOpenChange(false);
              }}
              className="border-[var(--vscode-panel-border,#3c3c3c)]"
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('save')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CellConfigDrawer;
