import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { TerminalCell } from '../../shared/schema';
import { TranslationKey } from '../../shared/translations';
import { getXtermTheme } from '../theme';
import { loadXtermAddons } from '../lib/xtermAddons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import '@xterm/xterm/css/xterm.css';

interface TerminalTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: TerminalCell;
  output: string; // Used for initial buffer
  exitCode: number | null;
  onStop: () => void;
  registerTerminalRef: (cellId: string, ref: { write: (data: string) => void; clear: () => void }, action: 'register' | 'unregister') => void;
  t: (key: TranslationKey) => string;
}

const TerminalTestModal: React.FC<TerminalTestModalProps> = ({
  open,
  onOpenChange,
  cell,
  output,
  exitCode,
  onStop,
  registerTerminalRef,
  t,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<ReturnType<typeof loadXtermAddons>['fit'] | null>(null);

  useEffect(() => {
    if (!open || !terminalRef.current) return;

    const terminal = new Terminal({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: getXtermTheme(),
      cursorBlink: true,
      scrollback: 10000,
      allowTransparency: true,
      cursorStyle: 'block',
      readonly: true,
    });

    const { fit } = loadXtermAddons(terminal);
    terminal.open(terminalRef.current);

    // Initial output
    if (output) {
      terminal.write(output);
    }

    requestAnimationFrame(() => {
      fit.fit();
    });

    terminalInstance.current = terminal;
    fitAddon.current = fit;

    const ref = {
      write: (data: string) => terminal.write(data),
      clear: () => terminal.clear(),
    };
    registerTerminalRef('test', ref, 'register');

    return () => {
      registerTerminalRef('test', ref, 'unregister');
      terminal.dispose();
    };
  }, [open, registerTerminalRef]);

  // Handle resize
  useEffect(() => {
    if (!open || !terminalRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current) {
        requestAnimationFrame(() => {
          fitAddon.current?.fit();
        });
      }
    });

    resizeObserver.observe(terminalRef.current);
    return () => resizeObserver.disconnect();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) onStop();
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span>{t('testResult')}</span>
            <span className="text-sm font-normal text-[var(--vscode-descriptionForeground,#858585)]">
              - {cell.title}
            </span>
            {exitCode !== null && (
              <span className={`ml-4 text-sm font-bold ${exitCode === 0 ? 'text-green-500' : 'text-red-500'}`}>
                {exitCode === 0 ? t('testSuccess') : `${t('testFailed')} (${exitCode})`}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 bg-[var(--vscode-editor-background,#1e1e1e)] text-[var(--vscode-descriptionForeground,#858585)] text-xs flex justify-between border-b border-[var(--vscode-panel-border,#3c3c3c)] shrink-0">
          <span>{t('workingDirectory')}: {cell.cwd}</span>
        </div>

        <div className="flex-1 min-h-0 bg-background overflow-hidden relative">
          <div 
            ref={terminalRef} 
            className="absolute inset-0" 
            style={{ backgroundColor: 'var(--vscode-terminal-background, var(--vscode-editor-background, #1e1e1e))' }}
          />
        </div>

        <DialogFooter className="p-4 border-t shrink-0 bg-background">
          <Button 
            variant="outline" 
            onClick={() => {
              onStop();
              onOpenChange(false);
            }}
          >
            {t('close')}
          </Button>
          {exitCode === null && (
            <Button variant="destructive" onClick={onStop}>
              {t('stop')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TerminalTestModal;
