import * as vscode from 'vscode';
import { ConfigManager } from '../config/configManager';
import { TermGridConfig } from '../../shared/schema';
import { TerminalStatus } from '../../shared/types';
import { PtyManager } from '../terminal/ptyManager';

export class TermGridEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'aioneTermGrid.editor';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly configManager: ConfigManager
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    let disposed = false;
    let config: TermGridConfig | undefined = undefined;
    const panelDisposables: vscode.Disposable[] = [];

    const postMessage = (message: unknown) => {
      if (disposed) {
        return;
      }
      webviewPanel.webview.postMessage(message).then(
        () => {},
        () => {}
      );
    };

    // Initialize PTY manager for this editor instance
    const ptyManager = new PtyManager({
      workspaceRoot,
      onData: (cellId: string, data: string) => {
        postMessage({
          type: 'terminal:data',
          payload: { cellId, data },
        });
      },
      onStatusChange: (cellId: string, status: TerminalStatus) => {
        postMessage({
          type: 'terminal:status',
          payload: { cellId, status },
        });
      },
      onExit: (cellId: string, code: number) => {
        postMessage({
          type: 'terminal:exited',
          payload: { cellId, code },
        });
      },
    });

    const disposePanelResources = () => {
      if (disposed) {
        return;
      }
      disposed = true;
      for (const d of panelDisposables.splice(0)) {
        try {
          d.dispose();
        } catch (error) {
          void error;
        }
      }
      ptyManager.dispose();
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // Config file changed externally
      }
    });
    panelDisposables.push(changeDocumentSubscription);

    const onMessageDisposable = webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'config:save':
          await this.handleSaveConfig(document, message.payload.config);
          break;
        case 'config:saveAs':
          await this.handleSaveAsConfig(webviewPanel, message.payload.name, message.payload.config);
          break;
        case 'terminal:start':
          if (config) {
            await this.handleTerminalStart(ptyManager, message.payload.cellId, config);
          }
          break;
        case 'terminal:stop':
          await this.handleTerminalStop(ptyManager, message.payload.cellId);
          break;
        case 'terminal:restart':
          if (config) {
            await this.handleTerminalRestart(ptyManager, message.payload.cellId, config);
          }
          break;
        case 'terminal:restartAll':
          if (config) {
            await this.handleTerminalRestartAll(ptyManager, config);
          }
          break;
        case 'terminal:input':
          await this.handleTerminalInput(ptyManager, message.payload.cellId, message.payload.data);
          break;
        case 'terminal:resize':
          await this.handleTerminalResize(
            ptyManager,
            message.payload.cellId,
            message.payload.cols,
            message.payload.rows
          );
          break;
      }
    });
    panelDisposables.push(onMessageDisposable);

    webviewPanel.onDidDispose(() => {
      disposePanelResources();
    });

    if (token.isCancellationRequested) {
      disposePanelResources();
      return;
    }

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
    config = await this.configManager.readConfig(document.uri.fsPath);
    if (disposed || token.isCancellationRequested) {
      return;
    }
    if (config) {
      postMessage({
        type: 'config:loaded',
        payload: { config },
      });
    }
  }

  private async handleTerminalStart(
    ptyManager: PtyManager,
    cellId: string,
    config: TermGridConfig | undefined
  ): Promise<void> {
    if (!config) {
      return;
    }

    const cell = config.cells.find((c) => c.id === cellId);
    if (!cell) {
      return;
    }

    try {
      await ptyManager.startCell(cell);
    } catch (error) {
      console.error(`Failed to start terminal ${cellId}:`, error);
    }
  }

  private async handleTerminalStop(ptyManager: PtyManager, cellId: string): Promise<void> {
    try {
      await ptyManager.stopCell(cellId);
    } catch (error) {
      console.error(`Failed to stop terminal ${cellId}:`, error);
    }
  }

  private async handleTerminalRestart(
    ptyManager: PtyManager,
    cellId: string,
    config: TermGridConfig | undefined
  ): Promise<void> {
    if (!config) {
      return;
    }

    const cell = config.cells.find((c) => c.id === cellId);
    if (!cell) {
      return;
    }

    try {
      await ptyManager.restartCell(cell);
    } catch (error) {
      console.error(`Failed to restart terminal ${cellId}:`, error);
    }
  }

  private async handleTerminalRestartAll(
    ptyManager: PtyManager,
    config: TermGridConfig | undefined
  ): Promise<void> {
    if (!config) {
      return;
    }

    try {
      await ptyManager.restartAll(config.cells);
    } catch (error) {
      console.error('Failed to restart all terminals:', error);
    }
  }

  private async handleTerminalInput(
    ptyManager: PtyManager,
    cellId: string,
    data: string
  ): Promise<void> {
    try {
      await ptyManager.sendInput(cellId, data);
    } catch (error) {
      console.error(`Failed to send input to terminal ${cellId}:`, error);
    }
  }

  private async handleTerminalResize(
    ptyManager: PtyManager,
    cellId: string,
    cols: number,
    rows: number
  ): Promise<void> {
    try {
      await ptyManager.resize(cellId, cols, rows);
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

  private async handleSaveAsConfig(
    webviewPanel: vscode.WebviewPanel,
    name: string,
    config: TermGridConfig
  ): Promise<void> {
    const filePath = await this.configManager.createConfig(name, config);
    if (filePath) {
      // Notify webview
      webviewPanel.webview.postMessage({
        type: 'config:savedAs',
        payload: { filePath },
      });
      
      // Open the new file
      const newUri = vscode.Uri.file(filePath);
      await vscode.commands.executeCommand('vscode.open', newUri);
    }
  }
}
