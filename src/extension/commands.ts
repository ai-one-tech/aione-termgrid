import * as vscode from 'vscode';
import { ConfigManager } from './config/configManager';
import { TermGridTreeProvider } from './providers/termGridTreeProvider';
import { DEFAULT_CONFIG } from '../shared/types';
import { PtyManager } from './terminal/ptyManager';

// Global PTY manager for command palette operations
let globalPtyManager: PtyManager | null = null;

export function getGlobalPtyManager(): PtyManager | null {
  return globalPtyManager;
}

export function setGlobalPtyManager(manager: PtyManager | null): void {
  globalPtyManager = manager;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  configManager: ConfigManager,
  treeProvider: TermGridTreeProvider
): void {
  // Start all terminals
  const startAll = vscode.commands.registerCommand('termGrid.startAll', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active TermGrid editor');
      return;
    }

    const config = await configManager.readConfig(editor.document.uri.fsPath);
    if (!config) {
      vscode.window.showErrorMessage('Failed to load TermGrid configuration');
      return;
    }

    if (!globalPtyManager) {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      globalPtyManager = new PtyManager({
        workspaceRoot,
        onData: () => {},
        onStatusChange: () => {},
        onExit: () => {},
      });
    }

    try {
      await globalPtyManager.startAll(config.cells);
      vscode.window.showInformationMessage(`Started ${config.cells.length} terminals`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start terminals: ${error}`);
    }
  });

  // Stop all terminals
  const stopAll = vscode.commands.registerCommand('termGrid.stopAll', async () => {
    if (!globalPtyManager) {
      vscode.window.showWarningMessage('No terminals are running');
      return;
    }

    try {
      await globalPtyManager.stopAll();
      vscode.window.showInformationMessage('Stopped all terminals');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to stop terminals: ${error}`);
    }
  });

  // Restart all terminals
  const restartAll = vscode.commands.registerCommand('termGrid.restartAll', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active TermGrid editor');
      return;
    }

    const config = await configManager.readConfig(editor.document.uri.fsPath);
    if (!config) {
      vscode.window.showErrorMessage('Failed to load TermGrid configuration');
      return;
    }

    if (!globalPtyManager) {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      globalPtyManager = new PtyManager({
        workspaceRoot,
        onData: () => {},
        onStatusChange: () => {},
        onExit: () => {},
      });
    }

    try {
      await globalPtyManager.restartAll(config.cells);
      vscode.window.showInformationMessage(`Restarted ${config.cells.length} terminals`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to restart terminals: ${error}`);
    }
  });

  // Create new config
  const createNew = vscode.commands.registerCommand('termGrid.createNew', async () => {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter configuration name',
      placeHolder: 'my-config',
      validateInput: (value) => {
        if (!value) return 'Name is required';
        if (!/^[a-z0-9-]+$/.test(value)) return 'Only lowercase letters, numbers, and hyphens allowed';
        return null;
      },
    });

    if (name) {
      const config = { ...DEFAULT_CONFIG, name };
      const filePath = await configManager.createConfig(name, config);
      if (filePath) {
        treeProvider.refresh();
        vscode.window.showInformationMessage(`Created: ${name}.tg`);
      }
    }
  });

  // Refresh tree
  const refreshTree = vscode.commands.registerCommand('termGrid.refreshTree', () => {
    treeProvider.refresh();
    vscode.window.showInformationMessage('Refreshed TermGrid configurations');
  });

  // Open config
  const openConfig = vscode.commands.registerCommand('termGrid.openConfig', async (filePath: string) => {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
  });

  context.subscriptions.push(startAll, stopAll, restartAll, createNew, refreshTree, openConfig);
}
