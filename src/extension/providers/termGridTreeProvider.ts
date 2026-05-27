import * as vscode from 'vscode';
import { ConfigManager } from '../config/configManager';
import { TerminalStatus } from '../../shared/types';

export class TermGridTreeProvider implements vscode.TreeDataProvider<ConfigTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ConfigTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private configManager: ConfigManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConfigTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ConfigTreeItem): Promise<ConfigTreeItem[]> {
    if (element) {
      return [];
    }

    const configs = await this.configManager.listConfigs();
    return configs.map(
      (config) =>
        new ConfigTreeItem(
          config.name,
          config.path,
          'stopped' as TerminalStatus,
          vscode.TreeItemCollapsibleState.None
        )
    );
  }
}

export class ConfigTreeItem extends vscode.TreeItem {
  constructor(
    public readonly name: string,
    public readonly filePath: string,
    public readonly status: TerminalStatus,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`${ConfigTreeItem.getStatusText(status)}  ${name}`, collapsibleState);
    
    this.tooltip = `${name}.tg`;
    this.description = ''; // Removed because status is now in label
    
    this.command = {
      command: 'termGrid.openConfig',
      title: 'Open Config',
      arguments: [this.filePath],
    };
  }

  private static getStatusText(status: TerminalStatus): string {
    switch (status) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'pending':
        return 'Pending';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  }
}
