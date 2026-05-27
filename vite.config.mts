import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@extension': path.resolve(__dirname, 'src/extension'),
      '@webview': path.resolve(__dirname, 'src/webview'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Disable minification: esbuild's identifier mangling breaks @xterm/xterm's
    // const enum pattern in requestMode(), causing "ReferenceError: r is not defined"
    // at runtime. Safe to skip since this is a local VSCode webview bundle.
    minify: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/webview/main.tsx'),
      },
      output: {
        preserveModules: false,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
