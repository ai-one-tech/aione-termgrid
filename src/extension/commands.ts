import * as vscode from 'vscode';
import { ConfigManager } from './config/configManager';
import { TermGridTreeProvider, ConfigTreeItem } from './providers/termGridTreeProvider';
import { DEFAULT_CONFIG } from '../shared/types';
import { getEditorPtyManager } from './providers/termGridEditorProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  configManager: ConfigManager,
  treeProvider: TermGridTreeProvider
): void {
  // Start all terminals
  const startAll = vscode.commands.registerCommand('termGrid.startAll', async (treeItem?: ConfigTreeItem) => {
    const filePath = treeItem?.filePath;
    if (!filePath) {
      vscode.window.showWarningMessage('No TermGrid config selected');
      return;
    }

    const entry = getEditorPtyManager(filePath);
    if (!entry) {
      vscode.window.showWarningMessage('Open this config in TermGrid editor first');
      return;
    }

    const config = entry.getConfig();
    if (!config) {
      vscode.window.showErrorMessage('Failed to load TermGrid configuration');
      return;
    }

    try {
      await entry.ptyManager.startAll(config.cells);
      vscode.window.showInformationMessage(`Started ${config.cells.length} terminals`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start terminals: ${error}`);
    }
  });

  // Stop all terminals
  const stopAll = vscode.commands.registerCommand('termGrid.stopAll', async (treeItem?: ConfigTreeItem) => {
    const filePath = treeItem?.filePath;
    if (!filePath) {
      vscode.window.showWarningMessage('No TermGrid config selected');
      return;
    }

    const entry = getEditorPtyManager(filePath);
    if (!entry) {
      vscode.window.showWarningMessage('Open this config in TermGrid editor first');
      return;
    }

    try {
      await entry.ptyManager.stopAll();
      vscode.window.showInformationMessage('Stopped all terminals');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to stop terminals: ${error}`);
    }
  });

  // Restart all terminals
  const restartAll = vscode.commands.registerCommand('termGrid.restartAll', async (treeItem?: ConfigTreeItem) => {
    const filePath = treeItem?.filePath;
    if (!filePath) {
      vscode.window.showWarningMessage('No TermGrid config selected');
      return;
    }

    const entry = getEditorPtyManager(filePath);
    if (!entry) {
      vscode.window.showWarningMessage('Open this config in TermGrid editor first');
      return;
    }

    const config = entry.getConfig();
    if (!config) {
      vscode.window.showErrorMessage('Failed to load TermGrid configuration');
      return;
    }

    try {
      await entry.ptyManager.restartAll(config.cells);
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

  // Open config directory
  const openConfigDir = vscode.commands.registerCommand('termGrid.openConfigDir', async () => {
    const configDir = configManager.getConfigDir();
    if (!configDir) {
      vscode.window.showWarningMessage('No workspace folder open');
      return;
    }

    // Ensure directory exists
    configManager.ensureConfigDir();

    // Open the directory in VS Code
    const uri = vscode.Uri.file(configDir);
    await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
  });

  // Open config
  const openConfig = vscode.commands.registerCommand('termGrid.openConfig', async (filePath: string) => {
    const uri = vscode.Uri.file(filePath);
    await vscode.commands.executeCommand('vscode.openWith', uri, 'aioneTermGrid.editor');
  });

  context.subscriptions.push(startAll, stopAll, restartAll, createNew, refreshTree, openConfigDir, openConfig);
}
