import * as vscode from 'vscode';
import YAML from 'yaml';
import { ConfigManager } from '../config/configManager';
import { TermGridConfig, TermGridConfigSchema } from '../../shared/schema';
import { TerminalStatus } from '../../shared/types';
import { PtyManager } from '../terminal/ptyManager';

interface SharedEditorState {
  ptyManager: PtyManager;
  config: TermGridConfig | undefined;
  panels: Set<vscode.WebviewPanel>;
  isReopening?: boolean;
  showCloseWarning?: boolean;
}

// Registry to look up shared state by document file path
const editorRegistry = new Map<string, SharedEditorState>();

// Track documents currently being saved to skip change events
const savingDocuments = new Set<string>();

export function getEditorPtyManager(filePath: string): { ptyManager: PtyManager; getConfig: () => TermGridConfig | undefined } | undefined {
  const state = editorRegistry.get(filePath);
  if (!state) return undefined;
  return {
    ptyManager: state.ptyManager,
    getConfig: () => state.config,
  };
}

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
    const filePath = document.uri.fsPath;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    // Get or create shared state for this document
    let state = editorRegistry.get(filePath);
    if (!state) {
      const ptyManager = new PtyManager({
        workspaceRoot,
        getInitialDelay: () => editorRegistry.get(filePath)?.config?.initialDelay ?? 2000,
        onData: (cellId: string, data: string) => {
          this.broadcast(filePath, {
            type: 'terminal:data',
            payload: { cellId, data },
          });
        },
        onStatusChange: (cellId: string, status: TerminalStatus) => {
          this.broadcast(filePath, {
            type: 'terminal:status',
            payload: { cellId, status },
          });
        },
        onExit: (cellId: string, code: number) => {
          this.broadcast(filePath, {
            type: 'terminal:exited',
            payload: { cellId, code },
          });
        },
      });

      state = {
        ptyManager,
        config: this.parseConfig(document),
        panels: new Set(),
      };
      if (state.config) {
        this.configManager.updateCache(filePath, state.config);
      }
      editorRegistry.set(filePath, state);
    }

    state.panels.add(webviewPanel);
    const ptyManager = state.ptyManager;

    const postMessage = (message: unknown) => {
      webviewPanel.webview.postMessage(message).then(undefined, () => {});
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // Skip change events triggered by our own save operation
        if (savingDocuments.has(filePath)) return;
        const newConfig = this.parseConfig(document);
        if (newConfig && state) {
          state.config = newConfig;
          this.configManager.updateCache(filePath, newConfig);
          this.broadcast(filePath, {
            type: 'config:updated',
            payload: { config: newConfig },
          });
        }
      }
    });

    const onMessageDisposable = webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (!state) return;
      
      switch (message.type) {
        case 'config:save':
          await this.handleSaveConfig(document, message.payload.config);
          break;
        case 'config:saveAs':
          await this.handleSaveAsConfig(webviewPanel, message.payload.name, message.payload.config);
          break;
        case 'terminal:start':
          if (state.config) {
            await this.handleTerminalStart(ptyManager, message.payload.cellId, state.config);
          }
          break;
        case 'terminal:stop':
          await this.handleTerminalStop(ptyManager, message.payload.cellId);
          break;
        case 'terminal:restart':
          if (state.config) {
            await this.handleTerminalRestart(ptyManager, message.payload.cellId, state.config);
          }
          break;
        case 'terminal:restartAll':
          if (state.config) {
            await this.handleTerminalRestartAll(ptyManager, state.config);
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
        case 'terminal:testStart':
          await ptyManager.testCell(
            message.payload.cell,
            (data) => postMessage({ type: 'terminal:testData', payload: { data } }),
            (code) => postMessage({ type: 'terminal:testExit', payload: { code } })
          );
          break;
        case 'terminal:testStop':
          await ptyManager.stopTest();
          break;
        case 'webview:reload':
          webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
          break;
        case 'webview:ready':
          if (state.config) {
            postMessage({
              type: 'config:loaded',
              payload: { 
                config: state.config,
                showCloseWarning: state.showCloseWarning 
              },
            });
            
            // Reset warning after sending
            state.showCloseWarning = false;

            // Send current terminal statuses and data
            for (const cell of state.config.cells) {
              const status = state.ptyManager.getStatus(cell.id);
              if (status !== 'stopped') {
                postMessage({
                  type: 'terminal:status',
                  payload: { cellId: cell.id, status },
                });
                
                const buffer = state.ptyManager.getBuffer(cell.id);
                if (buffer) {
                  postMessage({
                    type: 'terminal:data',
                    payload: { cellId: cell.id, data: buffer },
                  });
                }
              }
            }
          }
          break;
      }
    });

    webviewPanel.onDidDispose(async () => {
      changeDocumentSubscription.dispose();
      onMessageDisposable.dispose();
      
      if (state) {
        state.panels.delete(webviewPanel);
        
        // Check if there are running terminals and this is the last panel
        if (state.ptyManager.hasActiveTerminals() && state.panels.size === 0 && !state.isReopening) {
          state.isReopening = true;
          state.showCloseWarning = true;
          
          // Prevent closing by reopening the document
          setTimeout(async () => {
            await vscode.commands.executeCommand('vscode.open', document.uri, { preview: false });
            if (state) state.isReopening = false;
          }, 100);
          
          return;
        }

        if (state.panels.size === 0) {
          state.ptyManager.dispose();
          editorRegistry.delete(filePath);
        }
      }
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

    // Notify webview of initial config
    if (state.config) {
      postMessage({
        type: 'config:loaded',
        payload: { config: state.config },
      });
    }

    // Auto-pin the tab
    vscode.commands.executeCommand('workbench.action.pinEditor');
  }

  private parseConfig(document: vscode.TextDocument): TermGridConfig | undefined {
    try {
      const text = document.getText();
      if (!text.trim()) return undefined;
      const parsed = YAML.parse(text);
      return TermGridConfigSchema.parse(parsed);
    } catch (error) {
      console.error(`Failed to parse config from document ${document.uri.fsPath}:`, error);
      return undefined;
    }
  }

  private broadcast(filePath: string, message: unknown): void {
    const state = editorRegistry.get(filePath);
    if (state) {
      for (const panel of state.panels) {
        panel.webview.postMessage(message).then(undefined, () => {});
      }
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
    const isDev = this.context.extensionMode === vscode.ExtensionMode.Development;
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${styleUri}?nonce=${nonce}">
        <title>AiOne TermGrid</title>
        <script nonce="${nonce}">
          window.__VSCODE_IS_DEV__ = ${isDev};
        </script>
      </head>
      <body>
        <div id="root"></div>
        <script src="${scriptUri}?nonce=${nonce}" nonce="${nonce}"></script>
      </body>
      </html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private async handleSaveConfig(
    document: vscode.TextDocument,
    config: TermGridConfig
  ): Promise<void> {
    const filePath = document.uri.fsPath;
    savingDocuments.add(filePath);
    try {
      const edit = new vscode.WorkspaceEdit();
      const yaml = YAML.stringify(config, {
        sortMapEntries: true,
        indent: 2,
      });

      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        yaml
      );

      const success = await vscode.workspace.applyEdit(edit);
      if (success) {
        await document.save();
        
        // Update shared state config
        const state = editorRegistry.get(filePath);
        if (state) {
          state.config = config;
        }

        // Update config manager cache
        this.configManager.updateCache(filePath, config);

        this.broadcast(filePath, {
          type: 'config:saved',
          payload: { config },
        });
      }
    } finally {
      savingDocuments.delete(filePath);
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
