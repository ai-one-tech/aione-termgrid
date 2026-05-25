import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { SearchAddon } from '@xterm/addon-search';
import { TerminalCell } from '../../shared/schema';
import { Theme, TerminalStatus } from '../../shared/types';
import { TranslationKey } from '../../shared/translations';
import { getXtermTheme } from '../theme';
import { loadXtermAddons } from '../lib/xtermAddons';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import TerminalSearch from './TerminalSearch';
import { Search } from 'lucide-react';
import { Button } from './ui/button';
import '@xterm/xterm/css/xterm.css';

interface MaximizeModalProps {
  cell: TerminalCell | null;
  theme: Theme;
  status: TerminalStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  registerTerminalRef: (cellId: string, ref: { write: (data: string) => void; clear: () => void }, action: 'register' | 'unregister') => void;
  t: (key: TranslationKey) => string;
}

const MaximizeModal: React.FC<MaximizeModalProps> = ({
  cell,
  theme,
  status,
  open,
  onOpenChange,
  onInput,
  onResize,
  registerTerminalRef,
  t,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<ReturnType<typeof loadXtermAddons>['fit'] | null>(null);
  const [searchAddon, setSearchAddon] = useState<SearchAddon | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Initialize terminal
  useEffect(() => {
    if (!open || !cell || !terminalRef.current) return;

    const terminal = new Terminal({
      fontSize: 16,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: getXtermTheme(),
      cursorBlink: true,
      scrollback: 10000,
      allowTransparency: true,
      cursorStyle: 'block',
    });

    const { fit, search } = loadXtermAddons(terminal, { enableSearch: true });
    terminal.open(terminalRef.current);

    // Delay fit to ensure container has dimensions
    requestAnimationFrame(() => {
      fit.fit();
      onResize(terminal.cols, terminal.rows);
    });

    // Handle input
    terminal.onData((data) => {
      onInput(data);
    });

    terminalInstance.current = terminal;
    fitAddon.current = fit;
    setSearchAddon(search ?? null);

    // Register terminal ref to receive data
    const ref = {
      write: (data: string) => terminal.write(data),
      clear: () => terminal.clear(),
    };
    registerTerminalRef(cell.id, ref, 'register');

    return () => {
      registerTerminalRef(cell.id, ref, 'unregister');
      setSearchAddon(null);
      terminal.dispose();
    };
  }, [cell, open, theme, onInput, onResize, registerTerminalRef]);

  // Handle resize
  useEffect(() => {
    if (!open || !terminalRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current && terminalInstance.current) {
        requestAnimationFrame(() => {
          if (fitAddon.current && terminalInstance.current) {
            fitAddon.current.fit();
            onResize(terminalInstance.current.cols, terminalInstance.current.rows);
          }
        });
      }
    });

    resizeObserver.observe(terminalRef.current);
    return () => resizeObserver.disconnect();
  }, [open, onResize]);

  // Handle search keyboard shortcut
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Status indicator color
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#22c55e';
      case 'stopped':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case 'running':
        return t('running');
      case 'stopped':
        return t('stopped');
      case 'pending':
        return t('pending');
      case 'error':
        return t('error');
      default:
        return '';
    }
  };

  if (!cell) {
    return null;
  }

  return (
    <div data-testid="MaximizeModal">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[96vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-2 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${
                status === 'running' ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: getStatusColor() }}
              title={getStatusText()}
            />
            {cell.title}
            <span className="text-xs text-muted-foreground ml-1">
              {getStatusText()}
            </span>
          </DialogTitle>
          
          <div className="flex items-center gap-2 pr-8">
            <Button
              variant={showSearch ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSearch(!showSearch)}
              title="Search (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {showSearch && searchAddon && (
          <TerminalSearch
            searchAddon={searchAddon}
            t={t}
            onClose={() => setShowSearch(false)}
          />
        )}
        
        <div ref={terminalRef} className="flex-1 w-full h-full bg-background" />
      </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaximizeModal;
