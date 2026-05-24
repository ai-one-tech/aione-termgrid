// Message type constants
export const MESSAGE_TYPES = {
  // Host -> WebView
  CONFIG_LOADED: 'config:loaded',
  CONFIG_UPDATED: 'config:updated',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_STATUS: 'terminal:status',
  TERMINAL_EXITED: 'terminal:exited',
  TREE_REFRESH: 'tree:refresh',

  // WebView -> Host
  CONFIG_SAVE: 'config:save',
  TERMINAL_START: 'terminal:start',
  TERMINAL_STOP: 'terminal:stop',
  TERMINAL_RESTART: 'terminal:restart',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  CELL_UPDATE: 'cell:update',
  LAYOUT_CHANGE: 'layout:change',
} as const;

// Terminal status
export const TERMINAL_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  PENDING: 'pending',
  ERROR: 'error',
} as const;

// Grid limits
export const GRID_LIMITS = {
  MAX_ROWS: 4,
  MAX_COLS: 4,
  MAX_CELLS: 16,
  MIN_ROWS: 1,
  MIN_COLS: 1,
} as const;

// Default values
export const DEFAULTS = {
  SHELL: 'bash',
  CWD: '.',
  DELAY: 0,
  BORDER_COLOR: '#22c55e',
} as const;

// File paths
export const PATHS = {
  CONFIG_DIR: '.term-grid',
  CONFIG_EXT: '.tg',
} as const;

// Theme colors from design tokens
export const DESIGN_TOKENS = {
  dark: {
    bgPrimary: '#0f172a',
    bgCard: '#1e293b',
    bgMuted: '#334155',
    bgHover: '#475569',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    accent: '#22c55e',
    destructive: '#ef4444',
    border: '#475569',
  },
  light: {
    bgPrimary: '#ffffff',
    bgCard: '#f8fafc',
    bgMuted: '#e2e8f0',
    bgHover: '#cbd5e1',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    accent: '#22c55e',
    destructive: '#ef4444',
    border: '#cbd5e1',
  },
} as const;

// Border color options
export const BORDER_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
];
