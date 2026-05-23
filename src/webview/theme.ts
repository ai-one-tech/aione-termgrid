import { Theme } from '../shared/types';

const readCssVar = (
  styles: CSSStyleDeclaration,
  variableNames: string[],
  fallback: string
): string => {
  for (const variableName of variableNames) {
    const value = styles.getPropertyValue(variableName).trim();
    if (value) {
      return value;
    }
  }

  return fallback;
};

export const getEditorThemeKind = (): Theme => {
  if (document.body.classList.contains('vscode-light')) {
    return 'light';
  }

  return 'dark';
};

export const getXtermTheme = () => {
  const styles = getComputedStyle(document.body);

  return {
    background: readCssVar(
      styles,
      ['--vscode-terminal-background', '--vscode-editor-background'],
      '#1e1e1e'
    ),
    foreground: readCssVar(
      styles,
      ['--vscode-terminal-foreground', '--vscode-editor-foreground'],
      '#cccccc'
    ),
    cursor: readCssVar(
      styles,
      ['--vscode-terminalCursor-foreground', '--vscode-editorCursor-foreground'],
      '#aeafad'
    ),
    cursorAccent: readCssVar(
      styles,
      ['--vscode-terminalCursor-background', '--vscode-editor-background'],
      '#1e1e1e'
    ),
    selectionBackground: readCssVar(
      styles,
      ['--vscode-terminal-selectionBackground', '--vscode-editor-selectionBackground'],
      'rgba(128, 128, 128, 0.35)'
    ),
    black: readCssVar(styles, ['--vscode-terminal-ansiBlack'], '#000000'),
    red: readCssVar(styles, ['--vscode-terminal-ansiRed'], '#cd3131'),
    green: readCssVar(styles, ['--vscode-terminal-ansiGreen'], '#0dbc79'),
    yellow: readCssVar(styles, ['--vscode-terminal-ansiYellow'], '#e5e510'),
    blue: readCssVar(styles, ['--vscode-terminal-ansiBlue'], '#2472c8'),
    magenta: readCssVar(styles, ['--vscode-terminal-ansiMagenta'], '#bc3fbc'),
    cyan: readCssVar(styles, ['--vscode-terminal-ansiCyan'], '#11a8cd'),
    white: readCssVar(styles, ['--vscode-terminal-ansiWhite'], '#e5e5e5'),
    brightBlack: readCssVar(styles, ['--vscode-terminal-ansiBrightBlack'], '#666666'),
    brightRed: readCssVar(styles, ['--vscode-terminal-ansiBrightRed'], '#f14c4c'),
    brightGreen: readCssVar(styles, ['--vscode-terminal-ansiBrightGreen'], '#23d18b'),
    brightYellow: readCssVar(styles, ['--vscode-terminal-ansiBrightYellow'], '#f5f543'),
    brightBlue: readCssVar(styles, ['--vscode-terminal-ansiBrightBlue'], '#3b8eea'),
    brightMagenta: readCssVar(styles, ['--vscode-terminal-ansiBrightMagenta'], '#d670d6'),
    brightCyan: readCssVar(styles, ['--vscode-terminal-ansiBrightCyan'], '#29b8db'),
    brightWhite: readCssVar(styles, ['--vscode-terminal-ansiBrightWhite'], '#e5e5e5'),
  };
};
