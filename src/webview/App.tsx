import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TermGridConfig, TerminalCell } from '../shared/schema';
import { ExtensionMessage, WebviewMessage, TerminalStatus, Theme, Language } from '../shared/types';
import { TRANSLATIONS, TranslationKey } from '../shared/translations';
import FloatingToolbar from './components/FloatingToolbar';
import TerminalGrid from './components/TerminalGrid';
import SettingsPanel from './components/SettingsPanel';
import MaximizeModal from './components/MaximizeModal';
import NewConfigModal from './components/NewConfigModal';
import SaveAsModal from './components/SaveAsModal';
import { getEditorThemeKind } from './theme';
import './styles/index.css';

interface VSCodeApi {
  postMessage(message: unknown): void;
}

interface AppProps {
  vscode: VSCodeApi;
}

const App: React.FC<AppProps> = ({ vscode }) => {
  const [config, setConfig] = useState<TermGridConfig | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [maximizedCell, setMaximizedCell] = useState<TerminalCell | null>(null);
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getEditorThemeKind());
  const [language, setLanguage] = useState<Language>('zh');
  const [terminalStatuses, setTerminalStatuses] = useState<Record<string, TerminalStatus>>({});
  const [, setTerminalData] = useState<Record<string, string>>({});
  const terminalRefs = useRef<Record<string, { write: (data: string) => void; clear: () => void }>>({});

  useEffect(() => {
    const syncEditorTheme = () => {
      setTheme(getEditorThemeKind());
    };

    syncEditorTheme();

    const observer = new MutationObserver(syncEditorTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    return () => observer.disconnect();
  }, []);

  // Listen for messages from extension host
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage;

      switch (message.type) {
        case 'config:loaded':
        case 'config:updated':
          setConfig(message.payload.config);
          setLanguage((message.payload.config.language as Language) || 'zh');
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

  // Save as configuration
  const handleSaveAs = useCallback((name: string) => {
    if (config) {
      sendMessage({
        type: 'config:saveAs',
        payload: { name, config },
      });
      setIsDirty(false);
    }
  }, [config, sendMessage]);

  // Update configuration
  const handleConfigUpdate = useCallback((newConfig: TermGridConfig) => {
    setConfig(newConfig);
    setIsDirty(true);
  }, []);

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
    sendMessage({
      type: 'terminal:restartAll',
      payload: {},
    });
  }, [sendMessage]);

  // Language change
  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    if (config) {
      handleConfigUpdate({ ...config, language: lang });
    }
  }, [config, handleConfigUpdate]);

  // Translation helper
  const t = useCallback(
    (key: TranslationKey) => {
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
        <div className="loading">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className={`app-container flex flex-col h-screen w-screen overflow-hidden ${theme}`}>
      <FloatingToolbar
        isDirty={isDirty}
        onSave={handleSave}
        onSaveAs={() => setShowSaveAs(true)}
        onStopAll={handleStopAll}
        onRestartAll={handleRestartAll}
        onOpenSettings={() => setShowSettings(true)}
        t={t}
      />

      <div className="flex-1 overflow-hidden">
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
      </div>

      <SettingsPanel
        config={config}
        language={language}
        open={showSettings}
        onOpenChange={setShowSettings}
        onSave={handleSave}
        onConfigUpdate={handleConfigUpdate}
        onChangeLanguage={changeLanguage}
        t={t}
      />

      <MaximizeModal
        cell={maximizedCell}
        theme={theme}
        status={maximizedCell ? terminalStatuses[maximizedCell.id] || 'stopped' : 'stopped'}
        open={!!maximizedCell}
        onOpenChange={(open) => !open && setMaximizedCell(null)}
        onInput={(data) => maximizedCell && handleTerminalInput(maximizedCell.id, data)}
        t={t}
      />

      <NewConfigModal
        open={showNewConfig}
        onOpenChange={setShowNewConfig}
        onCreate={() => {
          // Handle new config creation
          setShowNewConfig(false);
        }}
        t={t}
      />

      <SaveAsModal
        open={showSaveAs}
        onOpenChange={setShowSaveAs}
        onSaveAs={handleSaveAs}
        t={t}
      />
    </div>
  );
};

export default App;
