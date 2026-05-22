import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TermGridConfig, TerminalCell } from '../shared/schema';
import { ExtensionMessage, WebviewMessage, TerminalStatus, Theme, Language } from '../shared/types';
import { TRANSLATIONS } from '../shared/constants';
import FloatingToolbar from './components/FloatingToolbar';
import TerminalGrid from './components/TerminalGrid';
import SettingsPanel from './components/SettingsPanel';
import MaximizeModal from './components/MaximizeModal';
import NewConfigModal from './components/NewConfigModal';
import './styles/index.css';

interface AppProps {
  vscode: any;
}

// Terminal data buffer for each cell
interface TerminalDataBuffer {
  cellId: string;
  data: string;
}

const App: React.FC<AppProps> = ({ vscode }) => {
  const [config, setConfig] = useState<TermGridConfig | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [maximizedCell, setMaximizedCell] = useState<TerminalCell | null>(null);
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguage] = useState<Language>('en');
  const [terminalStatuses, setTerminalStatuses] = useState<Record<string, TerminalStatus>>({});
  const [terminalData, setTerminalData] = useState<Record<string, string>>({});
  const terminalRefs = useRef<Record<string, { write: (data: string) => void; clear: () => void }>>({});

  // Listen for messages from extension host
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage;

      switch (message.type) {
        case 'config:loaded':
        case 'config:updated':
          setConfig(message.payload.config);
          setTheme(message.payload.config.theme || 'dark');
          setLanguage((message.payload.config.language as Language) || 'en');
          break;
        case 'terminal:data':
          setTerminalData((prev) => ({
            ...prev,
            [message.payload.cellId]: (prev[message.payload.cellId] || '') + message.payload.data,
          }));
          // Write data to terminal if ref exists
          if (terminalRefs.current[message.payload.cellId]) {
            terminalRefs.current[message.payload.cellId].write(message.payload.data);
          }
          break;
        case 'terminal:status':
          setTerminalStatuses((prev) => ({
            ...prev,
            [message.payload.cellId]: message.payload.status,
          }));
          break;
        case 'terminal:exited':
          setTerminalStatuses((prev) => ({
            ...prev,
            [message.payload.cellId]: 'stopped',
          }));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send message to extension host
  const sendMessage = useCallback((message: WebviewMessage) => {
    vscode.postMessage(message);
  }, [vscode]);

  // Save configuration
  const handleSave = useCallback(() => {
    if (config) {
      sendMessage({
        type: 'config:save',
        payload: { config },
      });
      setIsDirty(false);
    }
  }, [config, sendMessage]);

  // Update configuration
  const handleConfigUpdate = useCallback((newConfig: TermGridConfig) => {
    setConfig(newConfig);
    setIsDirty(true);
  }, []);

  // Start all terminals
  const handleStartAll = useCallback(() => {
    if (config) {
      config.cells.forEach((cell) => {
        sendMessage({
          type: 'terminal:start',
          payload: { cellId: cell.id },
        });
      });
    }
  }, [config, sendMessage]);

  // Stop all terminals
  const handleStopAll = useCallback(() => {
    if (config) {
      config.cells.forEach((cell) => {
        sendMessage({
          type: 'terminal:stop',
          payload: { cellId: cell.id },
        });
      });
    }
  }, [config, sendMessage]);

  // Restart all terminals
  const handleRestartAll = useCallback(() => {
    if (config) {
      config.cells.forEach((cell) => {
        sendMessage({
          type: 'terminal:restart',
          payload: { cellId: cell.id },
        });
      });
    }
  }, [config, sendMessage]);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      if (config) {
        handleConfigUpdate({ ...config, theme: newTheme });
      }
      return newTheme;
    });
  }, [config, handleConfigUpdate]);

  // Language change
  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    if (config) {
      handleConfigUpdate({ ...config, language: lang });
    }
  }, [config, handleConfigUpdate]);

  // Translation helper
  const t = useCallback(
    (key: keyof typeof TRANSLATIONS.en) => {
      return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key];
    },
    [language]
  );

  // Handle terminal input
  const handleTerminalInput = useCallback((cellId: string, data: string) => {
    sendMessage({
      type: 'terminal:input',
      payload: { cellId, data },
    });
  }, [sendMessage]);

  // Handle terminal resize
  const handleTerminalResize = useCallback((cellId: string, cols: number, rows: number) => {
    sendMessage({
      type: 'terminal:resize',
      payload: { cellId, cols, rows },
    });
  }, [sendMessage]);

  // Register terminal ref
  const registerTerminalRef = useCallback((cellId: string, ref: { write: (data: string) => void; clear: () => void } | null) => {
    if (ref) {
      terminalRefs.current[cellId] = ref;
    } else {
      delete terminalRefs.current[cellId];
    }
  }, []);

  if (!config) {
    return (
      <div className={`app-container ${theme}`}>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`app-container ${theme}`}>
      <FloatingToolbar
        config={config}
        isDirty={isDirty}
        theme={theme}
        language={language}
        onSave={handleSave}
        onStartAll={handleStartAll}
        onStopAll={handleStopAll}
        onRestartAll={handleRestartAll}
        onOpenSettings={() => setShowSettings(true)}
        onToggleTheme={toggleTheme}
        onChangeLanguage={changeLanguage}
        t={t}
      />

      <TerminalGrid
        config={config}
        theme={theme}
        terminalStatuses={terminalStatuses}
        onConfigUpdate={handleConfigUpdate}
        onMaximize={setMaximizedCell}
        onInput={handleTerminalInput}
        onResize={handleTerminalResize}
        registerTerminalRef={registerTerminalRef}
        t={t}
      />

      {showSettings && (
        <SettingsPanel
          config={config}
          theme={theme}
          onClose={() => setShowSettings(false)}
          onSave={handleSave}
          onConfigUpdate={handleConfigUpdate}
          t={t}
        />
      )}

      {maximizedCell && (
        <MaximizeModal
          cell={maximizedCell}
          theme={theme}
          status={terminalStatuses[maximizedCell.id] || 'stopped'}
          onClose={() => setMaximizedCell(null)}
          onInput={(data) => handleTerminalInput(maximizedCell.id, data)}
          t={t}
        />
      )}

      {showNewConfig && (
        <NewConfigModal
          theme={theme}
          onClose={() => setShowNewConfig(false)}
          onCreate={(name, layout) => {
            // Handle new config creation
            setShowNewConfig(false);
          }}
          t={t}
        />
      )}
    </div>
  );
};

export default App;
