import React, { useState, useEffect, useRef } from 'react';
import { TerminalCell } from '../../shared/schema';
import { TranslationKey } from '../../shared/translations';
import { BORDER_COLORS } from '../../shared/constants';
import { cn } from '../lib/utils';
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
import TerminalTestModal from './TerminalTestModal';

// Auto-resizing Textarea component
const AutoResizeTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    resize();
  }, [props.value, props.placeholder]);

  return (
    <Textarea
      {...props}
      ref={textareaRef}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
      className={cn("resize-none overflow-hidden min-h-[unset]", props.className)}
    />
  );
};

// Label with optional required asterisk
const RequiredLabel: React.FC<{ children: React.ReactNode; required?: boolean; className?: string }> = ({ children, required, className }) => (
  <Label className={className}>
    {children}
    {required && <span className="text-red-500 ml-1 font-bold">*</span>}
  </Label>
);

interface CellConfigDrawerProps {
  cell: TerminalCell | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (cellId: string, updates: Partial<TerminalCell>) => void;
  onTest: (cell: TerminalCell) => void;
  onStopTest: () => void;
  testOutput: string;
  testExitCode: number | null;
  registerTerminalRef: (cellId: string, ref: { write: (data: string) => void; clear: () => void }, action: 'register' | 'unregister') => void;
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

// X icon component for "None"
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CellConfigDrawer: React.FC<CellConfigDrawerProps> = ({
  cell,
  open,
  onOpenChange,
  onSave,
  onTest,
  onStopTest,
  testOutput,
  testExitCode,
  registerTerminalRef,
  t,
}) => {
  const [localCell, setLocalCell] = useState<TerminalCell | undefined>(cell);
  const [envFilesText, setEnvFilesText] = useState('');
  const [manualEnvText, setManualEnvText] = useState('');
  const [commandError, setCommandError] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLocalCell(cell);
    setCommandError(false);

    if (cell) {
      setEnvFilesText((cell.envFiles || []).join('\n'));
      const envLines = Object.entries(cell.env || {})
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      setManualEnvText(envLines);
    }
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

  // Check if default command is filled
  const hasValidCommand = (): boolean => {
    return !!(localCell.command?.default && localCell.command.default.trim() !== '');
  };

  const handleSave = () => {
    if (!localCell) return;

    // Validate at least default command is filled
    if (!hasValidCommand()) {
      setCommandError(true);
      return;
    }

    // Parse env files
    const envFiles = envFilesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

    // Parse manual env
    const env: Record<string, string> = {};
    manualEnvText.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        const value = trimmed.substring(index + 1).trim();
        if (key) env[key] = value;
      }
    });

    setCommandError(false);
    const updates: Partial<TerminalCell> = {
      title: localCell.title,
      cwd: localCell.cwd,
      command: localCell.command,
      order: localCell.order,
      delay: localCell.delay,
      borderColor: localCell.borderColor,
      envFiles,
      env,
    };
    onSave(localCell.id, updates);
    onOpenChange(false);
  };

  const handleTest = () => {
    if (!localCell) return;

    // Build temporary cell object with current values
    const envFiles = envFilesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

    const env: Record<string, string> = {};
    manualEnvText.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        const value = trimmed.substring(index + 1).trim();
        if (key) env[key] = value;
      }
    });

    const testCellData: TerminalCell = {
      ...localCell,
      envFiles,
      env,
    };

    onTest(testCellData);
    setTestModalOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} className="sm:max-w-md">
      <SheetContent className="w-full p-0 flex flex-col h-full">
        <SheetHeader className="p-6 pb-4 shrink-0 border-b border-border">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm">#{cellIndex}</span>
            <span className="truncate" title={localCell.title}>{localCell.title}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <RequiredLabel required className="text-foreground">{t('title')}</RequiredLabel>
            <Input
              value={localCell.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              className="bg-secondary border-input text-foreground"
            />
          </div>

          {/* Working Directory */}
          <div className="space-y-2">
            <RequiredLabel required className="text-foreground">{t('workingDirectory')}</RequiredLabel>
            <Input
              value={localCell.cwd}
              onChange={(e) => handleUpdate({ cwd: e.target.value })}
              className="bg-secondary border-input text-foreground"
            />
          </div>

          {/* Command - All platforms visible */}
          <div className="space-y-3">
            <Label className="text-foreground">{t('command')}</Label>
            {PLATFORM_KEYS.map((p) => {
              const value = (localCell.command && localCell.command[p.key]) || '';
              const isDefault = p.key === 'default';
              const placeholder = t('enterCommand');

              return (
                <div key={p.key} className="space-y-1">
                  <span className={`text-xs px-2 py-0.5 rounded flex items-center w-fit ${
                    isDefault
                      ? 'bg-[var(--vscode-focusBorder,var(--editor-foreground, #007fd4))] text-white'
                      : 'bg-[var(--vscode-panel-border,var(--editor-foreground, #3c3c3c))] text-muted-foreground'
                  }`}>
                    {t(p.labelKey)}
                    {isDefault && <span className="text-red-400 ml-1 font-bold text-[10px]">*</span>}
                  </span>
                  <AutoResizeTextarea
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => handleCommandChange(p.key, e.target.value)}
                    rows={2}
                    className="bg-secondary border-input text-foreground mt-1"
                  />
                </div>
              );
            })}
          </div>

          {/* Environment Variables */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label className="text-foreground">{t('envFiles')}</Label>
              <AutoResizeTextarea
                value={envFilesText}
                placeholder={t('envFilesPlaceholder')}
                onChange={(e) => setEnvFilesText(e.target.value)}
                rows={2}
                className="bg-secondary border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">{t('manualEnv')}</Label>
              <AutoResizeTextarea
                value={manualEnvText}
                placeholder={t('manualEnvPlaceholder')}
                onChange={(e) => setManualEnvText(e.target.value)}
                rows={3}
                className="bg-secondary border-input text-foreground font-mono text-xs"
              />
            </div>
          </div>

          {/* Order and Delay */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">{t('order')}</Label>
              <Input
                type="number"
                min={1}
                value={localCell.order}
                onChange={(e) => handleUpdate({ order: parseInt(e.target.value) || 1 })}
                className="bg-secondary border-input text-foreground"
              />
              <p className="text-[10px] text-muted-foreground leading-tight">
                {t('orderDescription' as any)}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">{t('delay')}</Label>
              <Input
                type="number"
                min={0}
                max={60000}
                value={localCell.delay}
                onChange={(e) => handleUpdate({ delay: parseInt(e.target.value) || 0 })}
                className="bg-secondary border-input text-foreground"
              />
              <p className="text-[10px] text-muted-foreground leading-tight">
                {t('delayDescription' as any)}
              </p>
            </div>
          </div>

          {/* Border Color */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('borderColor')}</Label>
            <div className="flex gap-2 flex-wrap items-center">
              <button
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                  !localCell.borderColor
                    ? 'border-ring'
                    : 'border-border'
                } hover:border-ring`}
                style={{ 
                  backgroundColor: !localCell.borderColor 
                    ? 'var(--vscode-list-hoverBackground, var(--editor-background, rgba(127,127,127,0.1)))' 
                    : 'var(--vscode-editor-background,var(--editor-background, #1e1e1e))' 
                }}
                onClick={() => handleUpdate({ borderColor: undefined })}
                title="None"
              >
                <XIcon className={!localCell.borderColor ? "text-ring" : "text-muted-foreground opacity-40"} />
              </button>
              {BORDER_COLORS.map((color) => {
                const isSelected = localCell.borderColor === color;
                return (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSelected
                        ? 'border-ring'
                        : 'border-transparent hover:border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleUpdate({ borderColor: color })}
                  >
                    {isSelected && <CheckIcon className="text-white drop-shadow-sm" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 shrink-0 border-t border-border flex items-center justify-between">
          <div className="flex-1">
            <Button
              variant="outline"
              onClick={handleTest}
              className="border-border text-foreground"
              disabled={!hasValidCommand()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {t('test')}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {commandError && (
              <div className="text-sm text-red-400 mr-2">
                {t('commandRequired')}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setCommandError(false);
                onOpenChange(false);
              }}
              className="border-border"
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

    {localCell && (
      <TerminalTestModal
        open={testModalOpen}
        onOpenChange={setTestModalOpen}
        cell={localCell}
        output={testOutput}
        exitCode={testExitCode}
        onStop={onStopTest}
        registerTerminalRef={registerTerminalRef}
        t={t}
      />
    )}
  </>
  );
};

export default CellConfigDrawer;
