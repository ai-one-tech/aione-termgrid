import React, { useState } from 'react';
import { Theme, LAYOUT_PRESETS } from '../../shared/types';
import { TranslationKey } from '../../shared/constants';

interface NewConfigModalProps {
  theme: Theme;
  onClose: () => void;
  onCreate: (name: string, layout: { rows: number; cols: number }) => void;
  t: (key: TranslationKey) => string;
}

const NewConfigModal: React.FC<NewConfigModalProps> = ({
  theme,
  onClose,
  onCreate,
  t,
}) => {
  const [fileName, setFileName] = useState('');
  const [selectedLayout, setSelectedLayout] = useState('2x2');

  const handleCreate = () => {
    if (!fileName.trim()) return;
    
    const preset = LAYOUT_PRESETS.find((p) => p.name === selectedLayout);
    if (preset) {
      onCreate(fileName, { rows: preset.rows, cols: preset.cols });
    }
  };

  return (
    <div className={`new-config-modal-overlay ${theme}`} onClick={onClose}>
      <div className="new-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('newConfig')}</h2>
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

        <div className="modal-content">
          <div className="form-group">
            <label>{t('fileName')}</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="my-config.tg"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>{t('quickLayout')}</label>
            <div className="layout-options">
              {LAYOUT_PRESETS.slice(0, 8).map((preset) => (
                <button
                  key={preset.name}
                  className={`layout-option ${
                    selectedLayout === preset.name ? 'active' : ''
                  }`}
                  onClick={() => setSelectedLayout(preset.name)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="create-btn" onClick={handleCreate}>
            {t('createConfiguration')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewConfigModal;
