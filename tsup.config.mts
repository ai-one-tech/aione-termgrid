import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension/extension.ts'],
  outDir: 'out',
  format: ['cjs'],
  target: 'node18',
  platform: 'node',
  external: ['vscode', 'node-pty'],
  noExternal: ['yaml', 'zod'],
  bundle: true,
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.extension.json',
});
