import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';

interface LoadXtermAddonsOptions {
  enableSearch?: boolean;
}

interface LoadXtermAddonsResult {
  fit: FitAddon;
  search?: SearchAddon;
}

export const loadXtermAddons = (
  terminal: Terminal,
  options: LoadXtermAddonsOptions = {}
): LoadXtermAddonsResult => {
  const fit = new FitAddon();

  terminal.loadAddon(fit);

  let search: SearchAddon | undefined;
  if (options.enableSearch) {
    search = new SearchAddon();
    terminal.loadAddon(search);
  }

  try {
    const webgl = new WebglAddon();
    terminal.loadAddon(webgl);
  } catch (error) {
    // Fall back to the default renderer if WebGL is unavailable.
    console.warn('Unable to enable xterm WebGL addon.', error);
  }

  return {
    fit,
    search,
  };
};
