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
  ORDER: 1,
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

// Language translations
export const TRANSLATIONS = {
  en: {
    appName: 'AiOne TermGrid',
    newConfig: 'New Configuration',
    fileName: 'File Name',
    quickLayout: 'Quick Layout',
    createConfiguration: 'Create Configuration',
    gridSettings: 'Grid Settings',
    gridLayout: 'Grid Layout',
    columns: 'Columns',
    rows: 'Rows',
    mergeCells: 'Merge Cells',
    mergeCellsDescription: 'Select cells to merge into a larger terminal area.',
    terminalConfiguration: 'Terminal Configuration',
    title: 'Title',
    workingDirectory: 'Working Directory',
    command: 'Command',
    default: 'Default',
    windows: 'Windows',
    linux: 'Linux',
    macOS: 'macOS',
    order: 'Order',
    delay: 'Delay (ms)',
    borderColor: 'Border Color',
    saveConfiguration: 'Save Configuration',
    start: 'Start',
    stop: 'Stop',
    restart: 'Restart',
    zoom: 'Zoom',
    close: 'Close',
    settings: 'Settings',
    save: 'Save',
    unsaved: 'Unsaved',
    running: 'Running',
    stopped: 'Stopped',
    pending: 'Pending',
    error: 'Error',
  },
  zh: {
    appName: 'AiOne TermGrid',
    newConfig: '新建配置',
    fileName: '文件名',
    quickLayout: '快速布局',
    createConfiguration: '创建配置',
    gridSettings: '网格设置',
    gridLayout: '网格布局',
    columns: '列数',
    rows: '行数',
    mergeCells: '合并单元格',
    mergeCellsDescription: '选择要合并为更大终端区域的单元格。',
    terminalConfiguration: '终端配置',
    title: '标题',
    workingDirectory: '工作目录',
    command: '命令',
    default: '默认',
    windows: 'Windows',
    linux: 'Linux',
    macOS: 'macOS',
    order: '顺序',
    delay: '延迟 (ms)',
    borderColor: '边框颜色',
    saveConfiguration: '保存配置',
    start: '启动',
    stop: '停止',
    restart: '重启',
    zoom: '放大',
    close: '关闭',
    settings: '设置',
    save: '保存',
    unsaved: '未保存',
    running: '运行中',
    stopped: '已停止',
    pending: '等待中',
    error: '错误',
  },
  ja: {
    appName: 'AiOne TermGrid',
    newConfig: '新規設定',
    fileName: 'ファイル名',
    quickLayout: 'クイックレイアウト',
    createConfiguration: '設定を作成',
    gridSettings: 'グリッド設定',
    gridLayout: 'グリッドレイアウト',
    columns: '列数',
    rows: '行数',
    mergeCells: 'セルを結合',
    mergeCellsDescription: 'セルを選択して大きなターミナル領域に結合します。',
    terminalConfiguration: 'ターミナル設定',
    title: 'タイトル',
    workingDirectory: '作業ディレクトリ',
    command: 'コマンド',
    default: 'デフォルト',
    windows: 'Windows',
    linux: 'Linux',
    macOS: 'macOS',
    order: '順序',
    delay: '延遲 (ms)',
    borderColor: '枠線の色',
    saveConfiguration: '設定を保存',
    start: '開始',
    stop: '停止',
    restart: '再起動',
    zoom: '拡大',
    close: '閉じる',
    settings: '設定',
    save: '保存',
    unsaved: '未保存',
    running: '実行中',
    stopped: '停止',
    pending: '待機中',
    error: 'エラー',
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.en;
export type Language = keyof typeof TRANSLATIONS;
