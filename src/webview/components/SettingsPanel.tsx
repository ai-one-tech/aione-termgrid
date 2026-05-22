import React, { useState } from 'react';
import { TermGridConfig, TerminalCell } from '../../shared/schema';
import { Theme } from '../../shared/types';
import { BORDER_COLORS } from '../../shared/constants';
import { TranslationKey } from '../../shared/constants';

interface SettingsPanelProps {
  config: TermGridConfig;
  theme: Theme;
  onClose: () => void;
  onSave: () => void;
  onConfigUpdate: (config: TermGridConfig) => void;
  t: (key: TranslationKey) => string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  theme,
  onClose,
  onSave,
  onConfigUpdate,
  t,
}) => {
  const [activeTab, setActiveTab] = useState<'layout' | 'cells'>('layout');
  const [selectedCell, setSelectedCell] = useState<string>(config.cells[0]?.id || '');
  const [localConfig, setLocalConfig] = useState<TermGridConfig>(config);

  // Update layout
  const updateLayout = (rows: number, cols: number) => {
    const updatedConfig = {
      ...localConfig,
      layout: { rows, cols },
    };
    setLocalConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
  };

  // Update cell
  const updateCell = (cellId: string, updates: Partial<TerminalCell>) => {
    const updatedCells = localConfig.cells.map((cell) =>
      cell.id === cellId ? { ...cell, ...updates } : cell
    );
    const updatedConfig = { ...localConfig, cells: updatedCells };
    setLocalConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
  };

  const currentCell = localConfig.cells.find((c) => c.id === selectedCell);

  return (
    <div className={`settings-panel-overlay ${theme}`}>
      <div className="settings-panel">
        <div className="settings-header">
          <h2>{t('gridSettings')}</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3L13 13M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('layout')}
          >
            {t('gridLayout')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'cells' ? 'active' : ''}`}
            onClick={() => setActiveTab('cells')}
          >
            {t('terminalConfiguration')}
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'layout' && (
            <div className="layout-settings">
              <div className="setting-group">
                <label>{t('quickLayout')}</label>
                <div className="layout-presets">
                  {[
                    { name: '2x1', rows: 2, cols: 1 },
                    { name: '2x2', rows: 2, cols: 2 },
                    { name: '3x2', rows: 3, cols: 2 },
                    { name: '3x3', rows: 3, cols: 3 },
                    { name: '4x2', rows: 4, cols: 2 },
                    { name: '4x3', rows: 4, cols: 3 },
                    { name: '4x4', rows: 4, cols: 4 },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      className={`preset-btn ${
                        localConfig.layout.rows === preset.rows &&
                        localConfig.layout.cols === preset.cols
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => updateLayout(preset.rows, preset.cols)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-group">
                  <label>{t('columns')}</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={localConfig.layout.cols}
                    onChange={(e) =>
                      updateLayout(localConfig.layout.rows, parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="setting-group">
                  <label>{t('rows')}</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={localConfig.layout.rows}
                    onChange={(e) =>
                      updateLayout(parseInt(e.target.value) || 1, localConfig.layout.cols)
                    }
                  />
                </div>
              </div>

              <div className="setting-group">
                <label>{t('mergeCells')}</label>
                <p className="setting-description">{t('mergeCellsDescription')}</p>
                <div className="merge-grid">
                  {Array.from({ length: localConfig.layout.rows }).map((_, row) =>
                    Array.from({ length: localConfig.layout.cols }).map((_, col) => (
                      <div
                        key={`${row}-${col}`}
                        className="merge-cell"
                        data-row={row}
                        data-col={col}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cells' && currentCell && (
            <div className="cell-settings">
              <div className="cell-selector">
                <select
                  value={selectedCell}
                  onChange={(e) => setSelectedCell(e.target.value)}
                >
                  {localConfig.cells.map((cell) => (
                    <option key={cell.id} value={cell.id}>
                      {cell.title} ({cell.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label>{t('title')}</label>
                <input
                  type="text"
                  value={currentCell.title}
                  onChange={(e) => updateCell(currentCell.id, { title: e.target.value })}
                />
              </div>

              <div className="setting-group">
                <label>{t('workingDirectory')}</label>
                <input
                  type="text"
                  value={currentCell.cwd}
                  onChange={(e) => updateCell(currentCell.id, { cwd: e.target.value })}
                />
              </div>

              <div className="setting-group">
                <label>{t('command')}</label>
                <div className="command-tabs">
                  <button className="command-tab active">{t('default')}</button>
                  <button className="command-tab">{t('windows')}</button>
                  <button className="command-tab">{t('linux')}</button>
                  <button className="command-tab">{t('macOS')}</button>
                </div>
                <textarea
                  value={currentCell.command.default}
                  onChange={(e) =>
                    updateCell(currentCell.id, {
                      command: { ...currentCell.command, default: e.target.value },
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="setting-row">
                <div className="setting-group">
                  <label>{t('order')}</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={currentCell.order}
                    onChange={(e) =>
                      updateCell(currentCell.id, { order: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="setting-group">
                  <label>{t('delay')}</label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={currentCell.delay}
                    onChange={(e) =>
                      updateCell(currentCell.id, { delay: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="setting-group">
                <label>{t('borderColor')}</label>
                <div className="color-picker">
                  {BORDER_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`color-option ${
                        currentCell.borderColor === color ? 'active' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateCell(currentCell.id, { borderColor: color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="save-btn" onClick={onSave}>
            {t('saveConfiguration')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
