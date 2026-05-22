export type TerminalStatus = 'running' | 'stopped' | 'pending';

export interface PlatformCommand {
  win32?: string;
  darwin?: string;
  linux?: string;
  default: string;
}

export interface TerminalCell {
  id: string;
  title: string;
  status: TerminalStatus;
  borderColor: string;
  cwd: string;
  command: PlatformCommand;
  order: number;
  delay: number;
  colSpan?: number;
  rowSpan?: number;
}

export interface GridLayout {
  rows: number;
  cols: number;
}

export interface TermGridConfig {
  id: string;
  name: string;
  layout: GridLayout;
  cells: TerminalCell[];
  mergedCells?: { start: [number, number]; end: [number, number] }[];
}

export interface ConfigFile {
  id: string;
  name: string;
  path: string;
  status: 'saved' | 'unsaved';
  lastModified: string;
}
