import type { TermGridConfig, TerminalCell, LayoutPreset } from './schema';

// Terminal status
export type TerminalStatus = 'running' | 'stopped' | 'pending' | 'error';

// Config file item for sidebar
export interface ConfigFile {
  id: string;
  name: string;
  path: string;
  status: TerminalStatus;
  lastModified: number;
}

// Layout grid item for react-grid-layout
export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

// Theme type
export type Theme = 'dark' | 'light';

// Language type
export type Language = 'en' | 'zh';

// Terminal instance state
export interface TerminalInstance {
  id: string;
  cell: TerminalCell;
  status: TerminalStatus;
  pty?: unknown;
  output: string;
  cols: number;
  rows: number;
}

// Message types for Extension Host <-> WebView communication

// Host -> WebView
export interface ConfigLoadedMessage {
  type: 'config:loaded';
  payload: { config: TermGridConfig };
}

export interface ConfigUpdatedMessage {
  type: 'config:updated';
  payload: { config: TermGridConfig };
}

export interface TerminalDataMessage {
  type: 'terminal:data';
  payload: { cellId: string; data: string };
}

export interface TerminalStatusMessage {
  type: 'terminal:status';
  payload: { cellId: string; status: TerminalStatus };
}

export interface TerminalExitedMessage {
  type: 'terminal:exited';
  payload: { cellId: string; code: number };
}

export interface TreeRefreshMessage {
  type: 'tree:refresh';
  payload: { files: ConfigFile[] };
}

export interface ConfigSavedAsMessage {
  type: 'config:savedAs';
  payload: { filePath: string };
}

export interface ConfigSavedMessage {
  type: 'config:saved';
  payload: { config: TermGridConfig };
}

export interface TerminalTestDataMessage {
  type: 'terminal:testData';
  payload: { data: string };
}

export interface TerminalTestExitMessage {
  type: 'terminal:testExit';
  payload: { code: number };
}

export type ExtensionMessage =
  | ConfigLoadedMessage
  | ConfigUpdatedMessage
  | TerminalDataMessage
  | TerminalStatusMessage
  | TerminalExitedMessage
  | TreeRefreshMessage
  | ConfigSavedAsMessage
  | ConfigSavedMessage
  | TerminalTestDataMessage
  | TerminalTestExitMessage;

// WebView -> Host
export interface ConfigSaveMessage {
  type: 'config:save';
  payload: { config: TermGridConfig };
}

export interface TerminalStartMessage {
  type: 'terminal:start';
  payload: { cellId: string };
}

export interface TerminalStopMessage {
  type: 'terminal:stop';
  payload: { cellId: string };
}

export interface TerminalRestartMessage {
  type: 'terminal:restart';
  payload: { cellId: string };
}

export interface TerminalRestartAllMessage {
  type: 'terminal:restartAll';
  payload: Record<string, never>;
}

export interface ConfigSaveAsMessage {
  type: 'config:saveAs';
  payload: { name: string; config: TermGridConfig };
}

export interface TerminalInputMessage {
  type: 'terminal:input';
  payload: { cellId: string; data: string };
}

export interface TerminalResizeMessage {
  type: 'terminal:resize';
  payload: { cellId: string; cols: number; rows: number };
}

export interface CellUpdateMessage {
  type: 'cell:update';
  payload: { cell: TerminalCell };
}

export interface LayoutChangeMessage {
  type: 'layout:change';
  payload: { layout: GridLayoutItem[] };
}

export interface WebviewReloadMessage {
  type: 'webview:reload';
  payload: Record<string, never>;
}

export interface WebviewReadyMessage {
  type: 'webview:ready';
  payload: Record<string, never>;
}

export interface TerminalTestStartMessage {
  type: 'terminal:testStart';
  payload: { cell: TerminalCell };
}

export interface TerminalTestStopMessage {
  type: 'terminal:testStop';
  payload: Record<string, never>;
}

export type WebviewMessage =
  | ConfigSaveMessage
  | ConfigSaveAsMessage
  | TerminalStartMessage
  | TerminalStopMessage
  | TerminalRestartMessage
  | TerminalRestartAllMessage
  | TerminalInputMessage
  | TerminalResizeMessage
  | CellUpdateMessage
  | LayoutChangeMessage
  | WebviewReloadMessage
  | WebviewReadyMessage
  | TerminalTestStartMessage
  | TerminalTestStopMessage;

// Layout presets
export const LAYOUT_PRESETS: LayoutPreset[] = [
  { name: '1x1', rows: 1, cols: 1, description: 'Single terminal' },
  { name: '1x2', rows: 1, cols: 2, description: 'Two terminals side by side' },
  { name: '2x1', rows: 2, cols: 1, description: 'Two terminals stacked' },
  { name: '2x2', rows: 2, cols: 2, description: 'Four terminals (2x2)' },
  { name: '2x3', rows: 2, cols: 3, description: 'Six terminals (2x3)' },
  { name: '3x2', rows: 3, cols: 2, description: 'Six terminals (3x2)' },
  { name: '3x3', rows: 3, cols: 3, description: 'Nine terminals (3x3)' },
  { name: '4x2', rows: 4, cols: 2, description: 'Eight terminals (4x2)' },
  { name: '4x3', rows: 4, cols: 3, description: 'Twelve terminals (4x3)' },
  { name: '4x4', rows: 4, cols: 4, description: 'Sixteen terminals (4x4)' },
];

// Default configuration
export const DEFAULT_CONFIG: TermGridConfig = {
  name: 'new-config',
  layout: { rows: 2, cols: 2 },
  cells: [
    {
      id: 'cell-1',
      title: 'Terminal 1',
      cwd: '.',
      delay: 0,
    },
    {
      id: 'cell-2',
      title: 'Terminal 2',
      cwd: '.',
      delay: 0,
    },
    {
      id: 'cell-3',
      title: 'Terminal 3',
      cwd: '.',
      delay: 0,
    },
    {
      id: 'cell-4',
      title: 'Terminal 4',
      cwd: '.',
      delay: 0,
    },
  ],
  mergedCells: [],
  language: 'zh',
};
