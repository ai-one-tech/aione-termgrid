import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from '../config/configManager';
import { TermGridConfig, TerminalCell } from '../../shared/schema';
import { TerminalStatus } from '../../shared/types';
import { PtyManager } from '../terminal/ptyManager';

export class TermGridEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'aioneTermGrid.editor';
  private ptyManager: PtyManager | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configManager: ConfigManager
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Initialize PTY manager for this editor instance
    this.ptyManager = new PtyManager({
      workspaceRoot,
      onData: (cellId: string, data: string) => {
        webviewPanel.webview.postMessage({
          type: 'terminal:data',
          payload: { cellId, data },
        });
      },
      onStatusChange: (cellId: string, status: TerminalStatus) => {
        webviewPanel.webview.postMessage({
          type: 'terminal:status',
          payload: { cellId, status },
        });
      },
      onExit: (cellId: string, code: number) => {
        webviewPanel.webview.postMessage({
          type: 'terminal:exited',
          payload: { cellId, code },
        });
      },
    });

    // Set up webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    };

    // Set initial HTML
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Load config
    const config = await this.configManager.readConfig(document.uri.fsPath);
    if (config) {
      webviewPanel.webview.postMessage({
        type: 'config:loaded',
        payload: { config },
      });
    }

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'config:save':
          await this.handleSaveConfig(document, message.payload.config);
          break;
        case 'terminal:start':
          if (config) {
            await this.handleTerminalStart(message.payload.cellId, config);
          }
          break;
        case 'terminal:stop':
          await this.handleTerminalStop(message.payload.cellId);
          break;
        case 'terminal:restart':
          if (config) {
            await this.handleTerminalRestart(message.payload.cellId, config);
          }
          break;
        case 'terminal:input':
          await this.handleTerminalInput(message.payload.cellId, message.payload.data);
          break;
        case 'terminal:resize':
          await this.handleTerminalResize(
            message.payload.cellId,
            message.payload.cols,
            message.payload.rows
          );
          break;
      }
    });

    // Watch for document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // Config file changed externally
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      this.ptyManager?.dispose();
      this.ptyManager = null;
    });
  }

  private async handleTerminalStart(cellId: string, config: TermGridConfig | null): Promise<void> {
    if (!config || !this.ptyManager) {
      return;
    }

    const cell = config.cells.find((c) => c.id === cellId);
    if (!cell) {
      return;
    }

    try {
      await this.ptyManager.startCell(cell);
    } catch (error) {
      console.error(`Failed to start terminal ${cellId}:`, error);
    }
  }

  private async handleTerminalStop(cellId: string): Promise<void> {
    if (!this.ptyManager) {
      return;
    }

    try {
      await this.ptyManager.stopCell(cellId);
    } catch (error) {
      console.error(`Failed to stop terminal ${cellId}:`, error);
    }
  }

  private async handleTerminalRestart(cellId: string, config: TermGridConfig | null): Promise<void> {
    if (!config || !this.ptyManager) {
      return;
    }

    const cell = config.cells.find((c) => c.id === cellId);
    if (!cell) {
      return;
    }

    try {
      await this.ptyManager.restartCell(cell);
    } catch (error) {
      console.error(`Failed to restart terminal ${cellId}:`, error);
    }
  }

  private async handleTerminalInput(cellId: string, data: string): Promise<void> {
    if (!this.ptyManager) {
      return;
    }

    try {
      await this.ptyManager.sendInput(cellId, data);
    } catch (error) {
      console.error(`Failed to send input to terminal ${cellId}:`, error);
    }
  }

  private async handleTerminalResize(cellId: string, cols: number, rows: number): Promise<void> {
    if (!this.ptyManager) {
      return;
    }

    try {
      await this.ptyManager.resize(cellId, cols, rows);
    } catch (error) {
      console.error(`Failed to resize terminal ${cellId}:`, error);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'assets', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'assets', 'main.css')
    );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${styleUri}">
        <title>AiOne TermGrid</title>
      </head>
      <body>
        <div id="root"></div>
        <script src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  private async handleSaveConfig(
    document: vscode.TextDocument,
    config: TermGridConfig
  ): Promise<void> {
    const success = await this.configManager.writeConfig(document.uri.fsPath, config);
    if (success) {
      // Notify webview
      // webviewPanel.webview.postMessage({ type: 'config:saved' });
    }
  }
}
