import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// VS Code API
const vscode = acquireVsCodeApi();

// Store vscode API globally
(window as any).vscode = vscode;

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App vscode={vscode} />
  </React.StrictMode>
);
