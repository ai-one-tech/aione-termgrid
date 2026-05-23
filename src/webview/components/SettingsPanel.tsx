import React, { useState, useCallback } from 'react';
import { TermGridConfig, TerminalCell, MergedCell } from '../../shared/schema';
import { Language } from '../../shared/types';
import { BORDER_COLORS } from '../../shared/constants';
import { TranslationKey } from '../../shared/translations';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from './ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface SettingsPanelProps {
  config: TermGridConfig;
  language: Language;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onConfigUpdate: (config: TermGridConfig) => void;
  onChangeLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  language,
  open,
  onOpenChange,
  onSave,
  onConfigUpdate,
  onChangeLanguage,
  t,
}) => {
  const [selectedCell, setSelectedCell] = useState<string>(config.cells[0]?.id || '');
  const [localConfig, setLocalConfig] = useState<TermGridConfig>(config);
  // Merge selection state: [row, col] or null
  const [mergeStart, setMergeStart] = useState<[number, number] | null>(null);
  const [mergeEnd, setMergeEnd] = useState<[number, number] | null>(null);

  // Update layout
  const updateLayout = (rows: number, cols: number) => {
    // Filter out merged cells that are out of bounds
    const validMergedCells = (localConfig.mergedCells || []).filter(
      (m) =>
        m.startRow < rows &&
        m.endRow < rows &&
        m.startCol < cols &&
        m.endCol < cols &&
        m.startRow >= 0 &&
        m.endRow >= 0 &&
        m.startCol >= 0 &&
        m.endCol >= 0
    );

    // Update cell colSpan and rowSpan to fit new layout
    const updatedCells = localConfig.cells.map((cell, index) => {
      const cellRow = Math.floor(index / cols);
      const cellCol = index % cols;
      
      // Check if cell is part of a merged cell and should be hidden
      const mergedInfo = validMergedCells.find(
        (m) => cellRow >= m.startRow && cellRow <= m.endRow &&
               cellCol >= m.startCol && cellCol <= m.endCol
      );
      
      if (mergedInfo && !(cellRow === mergedInfo.startRow && cellCol === mergedInfo.startCol)) {
        // This cell should be hidden (part of a merged area but not the top-left cell)
        return { ...cell, hidden: true };
      }
      
      return { ...cell, hidden: false };
    });

    const updatedConfig = {
      ...localConfig,
      layout: { rows, cols },
      mergedCells: validMergedCells,
      cells: updatedCells,
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

  // Check if a grid cell is part of any merged cell
  const isInMergedCell = useCallback(
    (row: number, col: number): MergedCell | undefined => {
      return localConfig.mergedCells?.find(
        (m) =>
          row >= m.startRow &&
          row <= m.endRow &&
          col >= m.startCol &&
          col <= m.endCol
      );
    },
    [localConfig.mergedCells]
  );

  // Check if a grid cell is within current selection
  const isInSelection = (row: number, col: number): boolean => {
    if (!mergeStart || !mergeEnd) return false;
    const minRow = Math.min(mergeStart[0], mergeEnd[0]);
    const maxRow = Math.max(mergeStart[0], mergeEnd[0]);
    const minCol = Math.min(mergeStart[1], mergeEnd[1]);
    const maxCol = Math.max(mergeStart[1], mergeEnd[1]);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // Handle merge cell click
  const handleMergeCellClick = (row: number, col: number) => {
    if (!mergeStart) {
      setMergeStart([row, col]);
      setMergeEnd([row, col]);
    } else if (!mergeEnd || (mergeStart[0] === row && mergeStart[1] === col)) {
      // Clicked same cell, cancel
      setMergeStart(null);
      setMergeEnd(null);
    } else {
      // Complete selection
      const newStart: [number, number] = [
        Math.min(mergeStart[0], row),
        Math.min(mergeStart[1], col),
      ];
      const newEnd: [number, number] = [
        Math.max(mergeStart[0], row),
        Math.max(mergeStart[1], col),
      ];

      // Validate: selection must be at least 2 cells
      if (newStart[0] === newEnd[0] && newStart[1] === newEnd[1]) {
        setMergeStart(null);
        setMergeEnd(null);
        return;
      }

      // Check if any cell in selection is already merged
      const hasConflict = localConfig.mergedCells?.some((m) => {
        for (let r = newStart[0]; r <= newEnd[0]; r++) {
          for (let c = newStart[1]; c <= newEnd[1]; c++) {
            if (r >= m.startRow && r <= m.endRow && c >= m.startCol && c <= m.endCol) {
              return true;
            }
          }
        }
        return false;
      });

      if (hasConflict) {
        setMergeStart(null);
        setMergeEnd(null);
        return;
      }

      // Create merged cell with stable ID
      const newMergedCell: MergedCell = {
        id: `merged-${newStart[0]}-${newStart[1]}-${newEnd[0]}-${newEnd[1]}`,
        startRow: newStart[0],
        startCol: newStart[1],
        endRow: newEnd[0],
        endCol: newEnd[1],
      };

      const updatedConfig = {
        ...localConfig,
        mergedCells: [...(localConfig.mergedCells || []), newMergedCell],
      };
      setLocalConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
      setMergeStart(null);
      setMergeEnd(null);
    }
  };

  // Handle hover for visual feedback
  const handleMergeCellHover = (row: number, col: number) => {
    if (mergeStart) {
      setMergeEnd([row, col]);
    }
  };

  // Remove a merged cell
  const removeMergedCell = (id: string) => {
    const updatedConfig = {
      ...localConfig,
      mergedCells: (localConfig.mergedCells || []).filter((m) => m.id !== id),
    };
    setLocalConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
  };

  // Clear all merged cells
  const clearAllMergedCells = () => {
    const updatedConfig = {
      ...localConfig,
      mergedCells: [],
    };
    setLocalConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    setMergeStart(null);
    setMergeEnd(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">{t('gridSettings')}</SheetTitle>
          <SheetDescription>
            {t('settingsDescription') || 'Configure your terminal grid layout and cell settings'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="layout">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="layout">{t('gridLayout')}</TabsTrigger>
              <TabsTrigger value="cells">{t('terminalConfiguration')}</TabsTrigger>
            </TabsList>

            <TabsContent value="layout" className="mt-4 space-y-6">
              {/* Language Selection */}
              <div className="space-y-2">
                <Label>{t('interfaceLanguage')}</Label>
                <select
                  value={language}
                  onChange={(e) => onChangeLanguage(e.target.value as Language)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Quick Layout Presets */}
              <div className="space-y-2">
                <Label>{t('quickLayout')}</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: '2x1', rows: 2, cols: 1 },
                    { name: '2x2', rows: 2, cols: 2 },
                    { name: '3x2', rows: 3, cols: 2 },
                    { name: '3x3', rows: 3, cols: 3 },
                    { name: '4x2', rows: 4, cols: 2 },
                    { name: '4x3', rows: 4, cols: 3 },
                    { name: '4x4', rows: 4, cols: 4 },
                  ].map((preset) => (
                    <Button
                      key={preset.name}
                      variant={
                        localConfig.layout.rows === preset.rows &&
                        localConfig.layout.cols === preset.cols
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => updateLayout(preset.rows, preset.cols)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Rows and Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('columns')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={localConfig.layout.cols}
                    onChange={(e) =>
                      updateLayout(localConfig.layout.rows, parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('rows')}</Label>
                  <Input
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

              {/* Merge Cells */}
              <div className="space-y-4">
                <div>
                  <Label>{t('mergeCells')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">{t('mergeCellsDescription')}</p>
                </div>
                
                <div 
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${localConfig.layout.cols}, 100px)`,
                  }}
                >
                  {Array.from({ length: localConfig.layout.rows }).map((_, row) =>
                    Array.from({ length: localConfig.layout.cols }).map((_, col) => {
                      const merged = isInMergedCell(row, col);
                      const isSelected = isInSelection(row, col);
                      const isStart = mergeStart && mergeStart[0] === row && mergeStart[1] === col;

                      let cellClass = 'rounded-md border-2 flex items-center justify-center cursor-pointer transition-all relative';
                      if (merged) cellClass += ' bg-primary text-primary-foreground border-primary';
                      else if (isSelected) cellClass += ' bg-accent/30 border-primary shadow-md scale-[1.02]';
                      else cellClass += ' bg-muted border-muted-foreground hover:bg-accent hover:border-primary';

                      return (
                        <div
                          key={`${row}-${col}`}
                          className={cellClass}
                          style={{ width: '100px', height: '100px' }}
                          data-row={row}
                          data-col={col}
                          onClick={() => handleMergeCellClick(row, col)}
                          onMouseEnter={() => handleMergeCellHover(row, col)}
                          title={
                            merged
                              ? `Merged: ${merged.id} (${merged.startRow},${merged.startCol}) → (${merged.endRow},${merged.endCol})`
                              : isStart
                                ? 'Click another cell to merge'
                                : 'Click to select'
                          }
                        >
                          {merged && (
                            <span className="text-xs">
                              {merged.endRow - merged.startRow + 1}×
                              {merged.endCol - merged.startCol + 1}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Merged Cells List */}
                {localConfig.mergedCells && localConfig.mergedCells.length > 0 && (
                  <div className="border rounded-md p-4 bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{t('mergedCells')}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={clearAllMergedCells}
                      >
                        {t('clearAll')}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {localConfig.mergedCells.map((m) => (
                        <div key={m.id} className="flex items-center justify-between bg-background p-2 rounded">
                          <span className="font-mono text-sm">
                            ({m.startRow},{m.startCol}) → ({m.endRow},{m.endCol})
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => removeMergedCell(m.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="cells" className="mt-4 space-y-6">
              {currentCell && (
                <>
                  <div className="space-y-2">
                    <Label>{t('cell')}</Label>
                    <select
                      value={selectedCell}
                      onChange={(e) => setSelectedCell(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {localConfig.cells.map((cell) => (
                        <option key={cell.id} value={cell.id}>
                          {cell.title} ({cell.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('title')}</Label>
                    <Input
                      value={currentCell.title}
                      onChange={(e) => updateCell(currentCell.id, { title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('workingDirectory')}</Label>
                    <Input
                      value={currentCell.cwd}
                      onChange={(e) => updateCell(currentCell.id, { cwd: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('command')}</Label>
                    <div className="flex gap-2 mb-2">
                      <Button variant="default" size="sm">{t('default')}</Button>
                      <Button variant="outline" size="sm">{t('windows')}</Button>
                      <Button variant="outline" size="sm">{t('linux')}</Button>
                      <Button variant="outline" size="sm">{t('macOS')}</Button>
                    </div>
                    <Textarea
                      value={currentCell.command.default}
                      onChange={(e) =>
                        updateCell(currentCell.id, {
                          command: { ...currentCell.command, default: e.target.value },
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('order')}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={currentCell.order}
                        onChange={(e) =>
                          updateCell(currentCell.id, { order: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('delay')}</Label>
                      <Input
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

                  <div className="space-y-2">
                    <Label>{t('borderColor')}</Label>
                    <div className="flex gap-2 flex-wrap">
                      {BORDER_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-md border-2 transition-all ${
                            currentCell.borderColor === color ? 'border-ring ring-2 ring-ring' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateCell(currentCell.id, { borderColor: color })}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-8">
          <Button onClick={onSave} className="w-full">
            {t('saveConfiguration')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
