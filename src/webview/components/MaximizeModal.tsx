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
  t: (key: TranslationKey) => string;
}

const MaximizeModal: React.FC<MaximizeModalProps> = ({
  cell,
  theme,
  status,
  open,
  onOpenChange,
  onInput,
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
    });

    // Handle input
    terminal.onData((data) => {
      onInput(data);
    });

    terminalInstance.current = terminal;
    fitAddon.current = fit;
    setSearchAddon(search ?? null);

    return () => {
      setSearchAddon(null);
      terminal.dispose();
    };
  }, [cell, open, theme, onInput]);

  // Handle resize
  useEffect(() => {
    if (!open) return;

    const handleResize = () => {
      fitAddon.current?.fit();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-2xl w-[90vw] h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
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
          
          <Button
            variant={showSearch ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSearch(!showSearch)}
            title="Search (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        {showSearch && searchAddon && (
          <TerminalSearch
            searchAddon={searchAddon}
            t={t}
            onClose={() => setShowSearch(false)}
          />
        )}
        
        <div ref={terminalRef} className="flex-1 w-full h-full" />
      </DialogContent>
    </Dialog>
  );
};

export default MaximizeModal;
