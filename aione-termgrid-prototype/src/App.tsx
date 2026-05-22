import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TerminalCellComponent from './components/TerminalCell';
import FloatingToolbar from './components/FloatingToolbar';
import SettingsPanel from './components/SettingsPanel';
import MaximizeModal from './components/MaximizeModal';
import NewConfigModal from './components/NewConfigModal';
import { mockConfigFiles, mockGridConfig } from './data/mockData';
import type { ConfigFile, TermGridConfig, TerminalCell, GridLayout } from './types';

export default function App() {
  const [configs, setConfigs] = useState<ConfigFile[]>(mockConfigFiles);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(mockConfigFiles[0].id);
  const [gridConfig, setGridConfig] = useState<TermGridConfig>(mockGridConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [maximizedCell, setMaximizedCell] = useState<TerminalCell | null>(null);
  const [showNewConfig, setShowNewConfig] = useState(false);

  const activeConfig = configs.find((c) => c.id === activeConfigId);

  const handleSelectConfig = useCallback((id: string) => {
    setActiveConfigId(id);
    const config = configs.find((c) => c.id === id);
    if (config) {
      setGridConfig((prev) => ({
        ...prev,
        name: config.name,
      }));
    }
  }, [configs]);

  const handleLayoutChange = useCallback((layout: GridLayout) => {
    setGridConfig((prev) => ({ ...prev, layout }));
  }, []);

  const handleSave = useCallback(() => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === activeConfigId ? { ...c, lastModified: new Date().toLocaleString('zh-CN') } : c
      )
    );
  }, [activeConfigId]);

  const handleCellStart = useCallback((id: string) => {
    setGridConfig((prev) => ({
      ...prev,
      cells: prev.cells.map((c) => (c.id === id ? { ...c, status: 'running' as const } : c)),
    }));
  }, []);

  const handleCellStop = useCallback((id: string) => {
    setGridConfig((prev) => ({
      ...prev,
      cells: prev.cells.map((c) => (c.id === id ? { ...c, status: 'stopped' as const } : c)),
    }));
  }, []);

  const handleCellRestart = useCallback((id: string) => {
    setGridConfig((prev) => ({
      ...prev,
      cells: prev.cells.map((c) => (c.id === id ? { ...c, status: 'pending' as const } : c)),
    }));
    setTimeout(() => {
      setGridConfig((prev) => ({
        ...prev,
        cells: prev.cells.map((c) => (c.id === id ? { ...c, status: 'running' as const } : c)),
      }));
    }, 1500);
  }, []);

  const handleMaximize = useCallback((cell: TerminalCell) => {
    setMaximizedCell(cell);
  }, []);

  const handleCellUpdate = useCallback((updatedCell: TerminalCell) => {
    setGridConfig((prev) => ({
      ...prev,
      cells: prev.cells.map((c) => (c.id === updatedCell.id ? updatedCell : c)),
    }));
  }, []);

  const handleStartAll = useCallback(() => {
    setGridConfig((prev) => ({
      ...prev,
      cells: prev.cells.map((c) => ({ ...c, status: 'running' as const })),
    }));
  }, []);

  const handleStopAll = useCallback(() => {
    setGridConfig((prev) => ({
      ...prev,
      cells: prev.cells.map((c) => ({ ...c, status: 'stopped' as const })),
    }));
  }, []);

  const handleRestartAll = useCallback(() => {
    setGridConfig((prev) => ({
      ...prev,
      cells: prev.cells.map((c) => ({ ...c, status: 'pending' as const })),
    }));
    setTimeout(() => {
      setGridConfig((prev) => ({
        ...prev,
        cells: prev.cells.map((c) => ({ ...c, status: 'running' as const })),
      }));
    }, 2000);
  }, []);

  const handleNewConfig = useCallback((name: string, rows: number, cols: number) => {
    const newConfig: ConfigFile = {
      id: Date.now().toString(),
      name,
      path: `.term-grid/${name}`,
      status: 'saved',
      lastModified: new Date().toLocaleString('zh-CN'),
    };
    setConfigs((prev) => [...prev, newConfig]);
    setActiveConfigId(newConfig.id);
    setGridConfig((prev) => ({
      ...prev,
      id: newConfig.id,
      name: newConfig.name,
      layout: { rows, cols },
      cells: Array.from({ length: rows * cols }, (_, i) => ({
        id: `cell-${i}`,
        title: `Terminal ${i + 1}`,
        status: 'stopped',
        borderColor: '#6366f1',
        cwd: '/projects',
        command: { default: 'echo "Hello World"' },
        order: i + 1,
        delay: 0,
      })),
    }));
  }, []);

  return (
    <div className="flex h-screen w-screen bg-bg-primary overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        configs={configs}
        activeConfigId={activeConfigId}
        onSelectConfig={handleSelectConfig}
        onNewConfig={() => setShowNewConfig(true)}
        onStartAll={handleStartAll}
        onStopAll={handleStopAll}
        onRestartAll={handleRestartAll}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Floating Toolbar */}
        {activeConfig && (
          <FloatingToolbar
            config={gridConfig}
            onLayoutChange={handleLayoutChange}
            onSave={handleSave}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* Grid Area */}
        <div className="flex-1 p-6 pt-20 overflow-auto">
          {activeConfig ? (
            <div
              className="grid gap-4 h-full"
              style={{
                gridTemplateColumns: `repeat(${gridConfig.layout.cols}, 1fr)`,
                gridTemplateRows: `repeat(${gridConfig.layout.rows}, 1fr)`,
              }}
            >
              {gridConfig.cells.map((cell) => (
                <TerminalCellComponent
                  key={cell.id}
                  cell={cell}
                  onStart={handleCellStart}
                  onStop={handleCellStop}
                  onRestart={handleCellRestart}
                  onMaximize={handleMaximize}
                  onEdit={() => setShowSettings(true)}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📁</div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  选择一个配置文件
                </h2>
                <p className="text-sm text-text-muted">
                  从左侧列表中选择一个 .tg 文件开始编辑
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        layout={gridConfig.layout}
        onLayoutChange={handleLayoutChange}
        cells={gridConfig.cells}
        onCellUpdate={handleCellUpdate}
      />

      {/* Maximize Modal */}
      <MaximizeModal
        cell={maximizedCell}
        isOpen={!!maximizedCell}
        onClose={() => setMaximizedCell(null)}
        onStart={handleCellStart}
        onStop={handleCellStop}
        onRestart={handleCellRestart}
      />

      {/* New Config Modal */}
      <NewConfigModal
        isOpen={showNewConfig}
        onClose={() => setShowNewConfig(false)}
        onCreate={handleNewConfig}
      />
    </div>
  );
}
