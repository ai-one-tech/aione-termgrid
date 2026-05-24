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
        <DialogContent className="sm:max-w-md relative">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            style={{ color: 'var(--vscode-editor-foreground, #cccccc)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span className="sr-only">Close</span>
          </button>

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
                placeholder="my-config"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveAs} className="rounded-full">
              {t('saveConfiguration')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaveAsModal;
