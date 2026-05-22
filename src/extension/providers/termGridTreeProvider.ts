import * as vscode from 'vscode';
import { ConfigManager } from '../config/configManager';
import { ConfigFile, TerminalStatus } from '../../shared/types';

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
    super(name, collapsibleState);
    
    this.tooltip = `${name}.tg`;
    this.description = this.getStatusText(status);
    this.iconPath = this.getStatusIcon(status);
    
    this.command = {
      command: 'termGrid.openConfig',
      title: 'Open Config',
      arguments: [this.filePath],
    };
  }

  private getStatusText(status: TerminalStatus): string {
    switch (status) {
      case 'running':
        return '$(play) Running';
      case 'stopped':
        return '$(stop) Stopped';
      case 'pending':
        return '$(watch) Pending';
      case 'error':
        return '$(error) Error';
      default:
        return '';
    }
  }

  private getStatusIcon(status: TerminalStatus): vscode.ThemeIcon {
    switch (status) {
      case 'running':
        return new vscode.ThemeIcon('play', new vscode.ThemeColor('terminal.ansiGreen'));
      case 'stopped':
        return new vscode.ThemeIcon('stop', new vscode.ThemeColor('terminal.ansiRed'));
      case 'pending':
        return new vscode.ThemeIcon('watch', new vscode.ThemeColor('terminal.ansiYellow'));
      case 'error':
        return new vscode.ThemeIcon('error', new vscode.ThemeColor('terminal.ansiRed'));
      default:
        return new vscode.ThemeIcon('file');
    }
  }
}
