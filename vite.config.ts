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
