import * as vscode from 'vscode';
import { TermGridEditorProvider } from './providers/termGridEditorProvider';
import { TermGridTreeProvider } from './providers/termGridTreeProvider';
import { ConfigManager } from './config/configManager';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
  console.log('AiOne TermGrid extension activated');

  // Initialize config manager
  const configManager = new ConfigManager();

  // Register custom editor provider
  const editorProvider = new TermGridEditorProvider(context, configManager);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'aioneTermGrid.editor',
      editorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    )
  );

  // Register tree data provider for sidebar
  const treeProvider = new TermGridTreeProvider(configManager);
  context.subscriptions.push(
    vscode.window.createTreeView('termGridSidebar', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
    })
  );

  // Register commands
  registerCommands(context, configManager, treeProvider);

  // Watch for .term-grid directory changes
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    const configDirPattern = new vscode.RelativePattern(
      workspaceRoot,
      '.term-grid/*.tg'
    );
    const fileWatcher = vscode.workspace.createFileSystemWatcher(configDirPattern);
    
    fileWatcher.onDidCreate(() => treeProvider.refresh());
    fileWatcher.onDidChange(() => treeProvider.refresh());
    fileWatcher.onDidDelete(() => treeProvider.refresh());
    
    context.subscriptions.push(fileWatcher);
  }
}

export function deactivate() {
  console.log('AiOne TermGrid extension deactivated');
}
