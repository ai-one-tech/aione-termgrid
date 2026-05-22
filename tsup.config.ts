import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension/extension.ts'],
  outDir: 'out',
  format: ['cjs'],
  target: 'node18',
  platform: 'node',
  external: ['vscode', 'node-pty'],
  bundle: true,
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.extension.json',
});
