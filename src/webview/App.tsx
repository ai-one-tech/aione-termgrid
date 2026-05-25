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

const MAX_TERMINAL_BUFFER_LENGTH = 200_000;

// Type for tracking modified fields
type ModifiedField = {
  path: string;
  oldValue: unknown;
  newValue: unknown;
};

// Compare two objects and return modified fields
function getModifiedFields(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  prefix = ''
): ModifiedField[] {
  const modified: ModifiedField[] = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldObj?.[key];
    const newVal = newObj?.[key];

    if (typeof oldVal === 'object' && oldVal !== null &&
        typeof newVal === 'object' && newVal !== null &&
        !Array.isArray(oldVal) && !Array.isArray(newVal)) {
      // Recurse into nested objects
      modified.push(...getModifiedFields(
        oldVal as Record<string, unknown>,
        newVal as Record<string, unknown>,
        path
      ));
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      modified.push({
        path,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return modified;
}

const App: React.FC<AppProps> = ({ vscode }) => {
  const [config, setConfig] = useState<TermGridConfig | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [modifiedFields, setModifiedFields] = useState<ModifiedField[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [maximizedCell, setMaximizedCell] = useState<TerminalCell | null>(null);
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getEditorThemeKind());
  const [language, setLanguage] = useState<Language>('zh');
  const [terminalStatuses, setTerminalStatuses] = useState<Record<string, TerminalStatus>>({});
  const terminalData = useRef<Record<string, string>>({});
  const terminalRefs = useRef<Record<string, Set<{ write: (data: string) => void; clear: () => void }>>>({});

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
          // When config is loaded/updated from file, reset dirty state
          setIsDirty(false);
          setModifiedFields([]);
          break;
        case 'config:saved':
          // Config saved successfully, reset dirty state
          setIsDirty(false);
          setModifiedFields([]);
          break;
        case 'terminal:data': {
          const nextData = (terminalData.current[message.payload.cellId] || '') + message.payload.data;
          terminalData.current = {
            ...terminalData.current,
            [message.payload.cellId]: nextData.slice(-MAX_TERMINAL_BUFFER_LENGTH),
          };
          // Write data to all terminal refs if they exist
          const refs = terminalRefs.current[message.payload.cellId];
          if (refs) {
            refs.forEach(ref => ref.write(message.payload.data));
          }
          break;
        }
        case 'terminal:status':
          if (message.payload.status === 'pending') {
            terminalData.current = {
              ...terminalData.current,
              [message.payload.cellId]: '',
            };
            const refs = terminalRefs.current[message.payload.cellId];
            if (refs) {
              refs.forEach(ref => ref.clear());
            }
          }
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

  // Notify extension host that webview is ready
  useEffect(() => {
    sendMessage({
      type: 'webview:ready',
      payload: {},
    });
  }, [sendMessage]);

  // Save configuration
  const handleSave = useCallback((configToSave?: TermGridConfig) => {
    const targetConfig = configToSave || config;
    if (targetConfig) {
      sendMessage({
        type: 'config:save',
        payload: { config: targetConfig },
      });
      // Update the displayed config if saving from settings panel
      if (configToSave && configToSave !== config) {
        setConfig(configToSave);
      }
      // Note: isDirty will be reset when we receive 'config:saved' message from extension
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
      setModifiedFields([]);
    }
  }, [config, sendMessage]);

  // Update configuration
  const handleConfigUpdate = useCallback((newConfig: TermGridConfig) => {
    setConfig((prevConfig) => {
      // Only mark as dirty if the config has actually changed
      if (prevConfig && JSON.stringify(prevConfig) !== JSON.stringify(newConfig)) {
        setIsDirty(true);
        // Calculate and store modified fields for debugging
        const changes = getModifiedFields(
          prevConfig as Record<string, unknown>,
          newConfig as Record<string, unknown>
        );
        setModifiedFields(changes);
      }
      return newConfig;
    });
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

  // Reload webview
  const handleReloadWebview = useCallback(() => {
    sendMessage({
      type: 'webview:reload',
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
  const registerTerminalRef = useCallback((cellId: string, ref: { write: (data: string) => void; clear: () => void }, action: 'register' | 'unregister') => {
    if (action === 'register') {
      if (!terminalRefs.current[cellId]) {
        terminalRefs.current[cellId] = new Set();
      }
      terminalRefs.current[cellId].add(ref);
      const existingData = terminalData.current[cellId];
      if (existingData) {
        ref.write(existingData);
      }
    } else {
      const refs = terminalRefs.current[cellId];
      if (refs) {
        refs.delete(ref);
        if (refs.size === 0) {
          delete terminalRefs.current[cellId];
        }
      }
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
        modifiedFields={modifiedFields}
        onSave={handleSave}
        onSaveAs={() => setShowSaveAs(true)}
        onStopAll={handleStopAll}
        onRestartAll={handleRestartAll}
        onOpenSettings={() => setShowSettings(true)}
        onReloadWebview={handleReloadWebview}
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
        key={config.name}
        config={config}
        language={language}
        open={showSettings}
        onOpenChange={setShowSettings}
        onSave={handleSave}
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
        onResize={(cols, rows) => maximizedCell && handleTerminalResize(maximizedCell.id, cols, rows)}
        registerTerminalRef={registerTerminalRef}
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
