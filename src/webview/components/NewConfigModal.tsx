import React, { useState } from 'react';
import { LAYOUT_PRESETS } from '../../shared/types';
import { TranslationKey } from '../../shared/translations';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface NewConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, layout: { rows: number; cols: number }) => void;
  t: (key: TranslationKey) => string;
}

const NewConfigModal: React.FC<NewConfigModalProps> = ({
  open,
  onOpenChange,
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
      onOpenChange(false);
      setFileName('');
    }
  };

  return (
    <div data-testid="NewConfigModal">
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('newConfig')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('fileName')}</Label>
            <Input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="my-config"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('quickLayout')}</Label>
            <div className="grid grid-cols-4 gap-2">
              {LAYOUT_PRESETS.slice(0, 8).map((preset) => (
                <Button
                  key={preset.name}
                  variant={selectedLayout === preset.name ? 'default' : 'outline'}
                  onClick={() => setSelectedLayout(preset.name)}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCreate}>
            {t('createConfiguration')}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewConfigModal;
