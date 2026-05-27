import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getHostBridge } from './lib/bridge';
import './styles/index.css';

// Safely initialize VS Code API if it is available
if (typeof acquireVsCodeApi === 'function') {
  const vscode = acquireVsCodeApi();
  (window as unknown as Record<string, unknown>).vscode = vscode;
}

const bridge = getHostBridge();

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App bridge={bridge} />
  </React.StrictMode>
);
