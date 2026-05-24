import React, { useState, useCallback } from 'react';
import { TermGridConfig, TerminalCell, MergedCell } from '../../shared/schema';
import { Language } from '../../shared/types';
import { TranslationKey } from '../../shared/translations';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import CellConfigDrawer from './CellConfigDrawer';

interface SettingsPanelProps {
  config: TermGridConfig;
  language: Language;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: TermGridConfig) => void;
  onChangeLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  language,
  open,
  onOpenChange,
  onSave,
  onChangeLanguage,
  t,
}) => {
  const [localConfig, setLocalConfig] = useState<TermGridConfig>(config);
  // Merge selection state: array of selected [row, col]
  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  // Merge mode toggle
  const [mergeMode, setMergeMode] = useState(false);
  // Cell config drawer state
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);

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

    const totalCells = rows * cols;
    const existingCells = localConfig.cells;
    const newCells = [...existingCells];

    // Add new cells if layout requires more
    if (totalCells > existingCells.length) {
      for (let i = existingCells.length; i < totalCells; i++) {
        newCells.push({
          id: `cell-${i + 1}`,
          title: `Terminal ${i + 1}`,
          cwd: '.',
          delay: 0,
        });
      }
    }

    // Remove excess cells if layout requires fewer
    if (totalCells < existingCells.length) {
      newCells.splice(totalCells);
    }

    const updatedConfig = {
      ...localConfig,
      layout: { rows, cols },
      cells: newCells,
      mergedCells: validMergedCells,
    };
    setLocalConfig(updatedConfig);
  };

  // Update cell
  const updateCell = (cellId: string, updates: Partial<TerminalCell>) => {
    const updatedCells = localConfig.cells.map((cell) =>
      cell.id === cellId ? { ...cell, ...updates } : cell
    );
    const updatedConfig = { ...localConfig, cells: updatedCells };
    setLocalConfig(updatedConfig);
  };

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

  // Check if a grid cell is the start (top-left) of a merged cell
  const isMergedCellStart = useCallback(
    (row: number, col: number): MergedCell | undefined => {
      return localConfig.mergedCells?.find(
        (m) => row === m.startRow && col === m.startCol
      );
    },
    [localConfig.mergedCells]
  );

  // Get cell index (1-based) for a given row/col in the grid
  const getCellIndex = useCallback(
    (row: number, col: number): number => {
      const cols = localConfig.layout.cols;
      return row * cols + col + 1;
    },
    [localConfig.layout.cols]
  );

  // Get cell id for a given row/col in the grid
  const getCellId = useCallback(
    (row: number, col: number): string => {
      const index = getCellIndex(row, col);
      return localConfig.cells[index - 1]?.id || '';
    },
    [getCellIndex, localConfig.cells]
  );

  // Get cell data for a given row/col in the grid
  const getCellData = useCallback(
    (row: number, col: number): TerminalCell | undefined => {
      const index = getCellIndex(row, col);
      return localConfig.cells[index - 1];
    },
    [getCellIndex, localConfig.cells]
  );

  // Get all cell indices covered by a merged cell (comma-separated string)
  const getMergedCellIndices = useCallback(
    (merged: MergedCell): string => {
      const indices: number[] = [];
      for (let r = merged.startRow; r <= merged.endRow; r++) {
        for (let c = merged.startCol; c <= merged.endCol; c++) {
          indices.push(getCellIndex(r, c));
        }
      }
      return indices.join(', ');
    },
    [getCellIndex]
  );

  // Check if a grid cell is selected
  const isCellSelected = (row: number, col: number): boolean => {
    return selectedCells.some(([r, c]) => r === row && c === col);
  };

  // Check if a selection is valid (same row or same col, all unmerged, at least 2 cells)
  const isValidSelection = (cells: [number, number][]): boolean => {
    if (cells.length < 2) return false;
    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const allSameRow = rows.every((r) => r === rows[0]);
    const allSameCol = cols.every((c) => c === cols[0]);
    if (!allSameRow && !allSameCol) return false;
    // Check none are already merged
    return !cells.some(([r, c]) => isInMergedCell(r, c));
  };

  // Get the bounding box of selected cells
  const getSelectionBounds = (cells: [number, number][]): { startRow: number; startCol: number; endRow: number; endCol: number } | null => {
    if (cells.length === 0) return null;
    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    return {
      startRow: Math.min(...rows),
      startCol: Math.min(...cols),
      endRow: Math.max(...rows),
      endCol: Math.max(...cols),
    };
  };

  // Handle grid cell click
  const handleGridCellClick = (row: number, col: number) => {
    if (mergeMode) {
      handleMergeCellClick(row, col);
    } else {
      // Open config drawer for this cell
      const merged = isMergedCellStart(row, col);
      if (merged) {
        // For merged cell, use the top-left cell's id
        const cellId = getCellId(merged.startRow, merged.startCol);
        if (cellId) {
          setEditingCellId(cellId);
          setConfigDrawerOpen(true);
        }
      } else {
        const cellId = getCellId(row, col);
        if (cellId) {
          setEditingCellId(cellId);
          setConfigDrawerOpen(true);
        }
      }
    }
  };

  // Handle merge cell click
  const handleMergeCellClick = (row: number, col: number) => {
    // If already merged, ignore
    if (isInMergedCell(row, col)) return;

    const alreadySelected = isCellSelected(row, col);

    if (alreadySelected) {
      // Deselect this cell
      const newSelection = selectedCells.filter(([r, c]) => !(r === row && c === col));
      setSelectedCells(newSelection);
      return;
    }

    // Try adding the new cell
    const newSelection: [number, number][] = [...selectedCells, [row, col]];

    // Validate: must be same row or same col, and not merged
    if (newSelection.length === 1) {
      setSelectedCells(newSelection);
      return;
    }

    const rows = newSelection.map(([r]) => r);
    const cols = newSelection.map(([, c]) => c);
    const allSameRow = rows.every((r) => r === rows[0]);
    const allSameCol = cols.every((c) => c === cols[0]);

    if (!allSameRow && !allSameCol) {
      // Invalid: not same row or same col, start new selection with this cell
      setSelectedCells([[row, col]]);
      return;
    }

    // Check if any selected cell is already merged
    const hasMerged = newSelection.some(([r, c]) => isInMergedCell(r, c));
    if (hasMerged) {
      setSelectedCells([[row, col]]);
      return;
    }

    setSelectedCells(newSelection);
  };

  // Handle merge button click
  const handleMerge = () => {
    if (!isValidSelection(selectedCells)) return;
    const bounds = getSelectionBounds(selectedCells);
    if (!bounds) return;

    const newMergedCell: MergedCell = {
      id: `merged-${bounds.startRow}-${bounds.startCol}-${bounds.endRow}-${bounds.endCol}`,
      startRow: bounds.startRow,
      startCol: bounds.startCol,
      endRow: bounds.endRow,
      endCol: bounds.endCol,
    };

    const updatedConfig = {
      ...localConfig,
      mergedCells: [...(localConfig.mergedCells || []), newMergedCell],
    };
    setLocalConfig(updatedConfig);
    setSelectedCells([]);
  };

  // Cancel selection
  const handleCancelSelection = () => {
    setSelectedCells([]);
  };

  // Remove a merged cell
  const removeMergedCell = (id: string) => {
    const updatedConfig = {
      ...localConfig,
      mergedCells: (localConfig.mergedCells || []).filter((m) => m.id !== id),
    };
    setLocalConfig(updatedConfig);
  };

  // Clear all merged cells
  const clearAllMergedCells = () => {
    const updatedConfig = {
      ...localConfig,
      mergedCells: [],
    };
    setLocalConfig(updatedConfig);
    setSelectedCells([]);
  };

  const editingCell = editingCellId ? localConfig.cells.find((c) => c.id === editingCellId) : undefined;

  return (
    <div data-testid="SettingsPanel">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full">
          {/* Fixed header */}
          <SheetHeader className="p-6 pt-1 pb-4 shrink-0">
            <SheetTitle className="text-xl font-semibold">{t('gridSettings')}</SheetTitle>
            <SheetDescription>
              {t('settingsDescription') || 'Configure your terminal grid layout and cell settings'}
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-6">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label>{t('interfaceLanguage')}</Label>
              <select
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value as Language)}
                className="w-full rounded-md border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-3 py-2 text-sm text-[var(--vscode-editor-foreground,#cccccc)] ring-offset-background focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder,#007fd4)] focus:ring-offset-2"
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

            {/* Grid Preview with Click to Configure */}
            <div className="space-y-4">
              <div>
                <Label>{t('clickToConfigure')}</Label>
                <p className="text-sm text-[var(--vscode-descriptionForeground,#858585)] mt-1">{t('clickToConfigureDescription')}</p>
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${localConfig.layout.cols}, 100px)`,
                  gridTemplateRows: `repeat(${localConfig.layout.rows}, 100px)`,
                  gap: '8px',
                }}
              >
                {Array.from({ length: localConfig.layout.rows }).map((_, row) =>
                  Array.from({ length: localConfig.layout.cols }).map((_, col) => {
                    const merged = isInMergedCell(row, col);
                    const mergedStart = isMergedCellStart(row, col);
                    const selected = isCellSelected(row, col);
                    const cellIndex = getCellIndex(row, col);
                    const cellData = getCellData(row, col);

                    // If this cell is part of a merged area but not the start, don't render it
                    if (merged && !mergedStart) {
                      return null;
                    }

                    let cellClass = 'rounded-md border-2 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden';
                    if (mergeMode && selected) cellClass += ' bg-[var(--vscode-list-hoverBackground,#2a2d2e)] border-[#22c55e] shadow-md scale-[1.02]';
                    else if (mergeMode) cellClass += ' bg-[var(--vscode-sideBar-background,#252526)] border-[var(--vscode-panel-border,#3c3c3c)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)] hover:border-[var(--vscode-focusBorder,#007fd4)]';
                    else cellClass += ' bg-[var(--vscode-sideBar-background,#252526)] border-[var(--vscode-panel-border,#3c3c3c)] hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)] hover:border-[var(--vscode-focusBorder,#007fd4)]';

                    // Calculate grid span for merged cells
                    const gridStyle: React.CSSProperties = {
                      width: '100%',
                      height: '100%',
                    };
                    if (mergedStart) {
                      const rowSpan = mergedStart.endRow - mergedStart.startRow + 1;
                      const colSpan = mergedStart.endCol - mergedStart.startCol + 1;
                      gridStyle.gridRow = `span ${rowSpan}`;
                      gridStyle.gridColumn = `span ${colSpan}`;
                    }

                    return (
                      <div
                        key={`${row}-${col}`}
                        className={cellClass}
                        style={gridStyle}
                        data-row={row}
                        data-col={col}
                        onClick={() => handleGridCellClick(row, col)}
                        title={
                          mergeMode
                            ? selected
                              ? 'Click to deselect'
                              : 'Click to select for merge'
                            : mergedStart
                              ? `Click to configure merged cell (${mergedStart.startRow},${mergedStart.startCol}) → (${mergedStart.endRow},${mergedStart.endCol})`
                              : `Click to configure cell ${cellIndex}`
                        }
                      >
                        {/* Cell content */}
                        <div className="flex flex-col items-center gap-1 w-full px-2">
                          {mergeMode ? (
                            <span className="text-sm text-[var(--vscode-descriptionForeground,#858585)]">
                              {cellIndex}
                            </span>
                          ) : (
                            <>
                              <span className="text-xs font-medium text-[var(--vscode-editor-foreground,#cccccc)] truncate w-full text-center">
                                {cellData?.title || `Terminal ${cellIndex}`}
                              </span>
                              <span className="text-[10px] text-[var(--vscode-descriptionForeground,#858585)]">
                                {cellIndex}
                              </span>
                              {/* Edit icon on hover */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--vscode-descriptionForeground,#858585)]">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Merge indicator */}
                        {mergedStart && !mergeMode && (
                          <div className="absolute bottom-1 left-1">
                            <span className="text-[10px] text-[var(--vscode-descriptionForeground,#858585)]">
                              {getMergedCellIndices(mergedStart)}
                            </span>
                          </div>
                        )}

                        {/* Config gear icon (visible on hover) */}
                        {!mergeMode && (
                          <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--vscode-focusBorder,#007fd4)]">
                              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Merge mode toggle */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMergeMode(!mergeMode);
                    setSelectedCells([]);
                  }}
                >
                  {mergeMode ? t('exitMergeMode') : t('mergeCells')}
                </Button>
                {mergeMode && (
                  <span className="text-sm text-[var(--vscode-descriptionForeground,#858585)]">
                    {t('mergeCellsDescription')}
                  </span>
                )}
              </div>

              {/* Merge action buttons */}
              {mergeMode && selectedCells.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--vscode-descriptionForeground,#858585)]">
                    {isValidSelection(selectedCells)
                      ? `${t('mergeCells')} (${selectedCells.length} ${t('cell')})`
                      : selectedCells.length < 2
                        ? t('selectMoreCells')
                        : t('sameRowOrColOnly')}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelSelection}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleMerge}
                      disabled={!isValidSelection(selectedCells)}
                    >
                      {t('merge')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Merged Cells List */}
              {localConfig.mergedCells && localConfig.mergedCells.length > 0 && (
                <div className="border border-[var(--vscode-panel-border,#3c3c3c)] rounded-md p-3 bg-[var(--vscode-sideBar-background,#252526)]">
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
                    {localConfig.mergedCells.map((m) => {
                      const startIndex = getCellIndex(m.startRow, m.startCol);
                      const endIndex = getCellIndex(m.endRow, m.endCol);
                      const rowCount = m.endRow - m.startRow + 1;
                      const colCount = m.endCol - m.startCol + 1;
                      return (
                        <div key={m.id} className="flex items-center justify-between bg-[var(--vscode-editor-background,#1e1e1e)] p-2 rounded">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-[var(--vscode-editor-foreground,#cccccc)]">
                              Terminal {startIndex}{startIndex !== endIndex ? ` ~ ${endIndex}` : ''}
                            </span>
                            <span className="text-xs text-[var(--vscode-descriptionForeground,#858585)]">
                              {language === 'zh'
                                ? `第${m.startRow + 1}行 第${m.startCol + 1}列 → 第${m.endRow + 1}行 第${m.endCol + 1}列 (${rowCount}×${colCount})`
                                : `Row ${m.startRow + 1} Col ${m.startCol + 1} → Row ${m.endRow + 1} Col ${m.endCol + 1} (${rowCount}×${colCount})`
                              }
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-[var(--vscode-descriptionForeground,#858585)] hover:text-red-400"
                            onClick={() => removeMergedCell(m.id)}
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed footer */}
          <div className="p-6 pt-4 shrink-0 border-t border-[var(--vscode-panel-border,#3c3c3c)]">
            <Button
              onClick={() => {
                onSave(localConfig);
                onOpenChange(false);
              }}
              variant="outline"
              className="rounded-full"
            >
              {t('saveConfiguration')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cell Config Drawer */}
      <CellConfigDrawer
        cell={editingCell}
        open={configDrawerOpen}
        onOpenChange={setConfigDrawerOpen}
        onSave={updateCell}
        t={t}
      />
    </div>
  );
};

export default SettingsPanel;
