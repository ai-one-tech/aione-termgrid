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
  if (
    document.body.classList.contains('vscode-light') ||
    document.body.classList.contains('jb-light')
  ) {
    return 'light';
  }

  return 'dark';
};

export const getXtermTheme = () => {
  const styles = getComputedStyle(document.body);

  return {
    background: readCssVar(styles, ['--tg-terminal-bg'], '#1e1e1e'),
    foreground: readCssVar(styles, ['--tg-terminal-fg'], '#cccccc'),
    cursor: readCssVar(styles, ['--tg-terminal-cursor'], '#aeafad'),
    cursorAccent: readCssVar(styles, ['--tg-terminal-cursor-accent'], '#1e1e1e'),
    selectionBackground: readCssVar(
      styles,
      ['--vscode-terminal-selectionBackground', '--vscode-editor-selectionBackground', '--jb-editor-selection', '--editor-selection'],
      'rgba(128, 128, 128, 0.35)'
    ),
    black: readCssVar(styles, ['--tg-ansi-black'], '#000000'),
    red: readCssVar(styles, ['--tg-ansi-red'], '#cd3131'),
    green: readCssVar(styles, ['--tg-ansi-green'], '#0dbc79'),
    yellow: readCssVar(styles, ['--tg-ansi-yellow'], '#e5e510'),
    blue: readCssVar(styles, ['--tg-ansi-blue'], '#2472c8'),
    magenta: readCssVar(styles, ['--tg-ansi-magenta'], '#bc3fbc'),
    cyan: readCssVar(styles, ['--tg-ansi-cyan'], '#11a8cd'),
    white: readCssVar(styles, ['--tg-ansi-white'], '#e5e5e5'),
    brightBlack: readCssVar(styles, ['--tg-ansi-bright-black'], '#666666'),
    brightRed: readCssVar(styles, ['--tg-ansi-bright-red'], '#f14c4c'),
    brightGreen: readCssVar(styles, ['--tg-ansi-bright-green'], '#23d18b'),
    brightYellow: readCssVar(styles, ['--tg-ansi-bright-yellow'], '#f5f543'),
    brightBlue: readCssVar(styles, ['--tg-ansi-bright-blue'], '#3b8eea'),
    brightMagenta: readCssVar(styles, ['--tg-ansi-bright-magenta'], '#d670d6'),
    brightCyan: readCssVar(styles, ['--tg-ansi-bright-cyan'], '#29b8db'),
    brightWhite: readCssVar(styles, ['--tg-ansi-bright-white'], '#e5e5e5'),
  };
};
