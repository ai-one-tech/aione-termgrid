import React, { useState } from 'react';
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

interface SaveAsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAs: (name: string) => void;
  t: (key: TranslationKey) => string;
}

const SaveAsModal: React.FC<SaveAsModalProps> = ({
  open,
  onOpenChange,
  onSaveAs,
  t,
}) => {
  const [fileName, setFileName] = useState('');

  const handleSaveAs = () => {
    if (!fileName.trim()) return;
    onSaveAs(fileName);
    onOpenChange(false);
    setFileName('');
  };

  return (
    <div data-testid="SaveAsModal">
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('saveAsTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('fileName')}</Label>
            <Input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="my-config.tg"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSaveAs}>
            {t('saveConfiguration')}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaveAsModal;
