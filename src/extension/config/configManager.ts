import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { TermGridConfig, TermGridConfigSchema } from '../../shared/schema';
import { PATHS } from '../../shared/constants';

export class ConfigManager {
  private configCache = new Map<string, TermGridConfig>();

  /**
   * Get the .term-grid directory path in the current workspace
   */
  getConfigDir(): string | undefined {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return undefined;
    return path.join(workspaceRoot, PATHS.CONFIG_DIR);
  }

  /**
   * Ensure .term-grid directory exists
   */
  ensureConfigDir(): string | undefined {
    const configDir = this.getConfigDir();
    if (!configDir) return undefined;
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    return configDir;
  }

  /**
   * List all .tg files in .term-grid directory
   */
  async listConfigs(): Promise<{ name: string; path: string }[]> {
    const configDir = this.getConfigDir();
    if (!configDir || !fs.existsSync(configDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(configDir);
      return files
        .filter((file) => file.endsWith(PATHS.CONFIG_EXT))
        .map((file) => ({
          name: file.replace(PATHS.CONFIG_EXT, ''),
          path: path.join(configDir, file),
        }));
    } catch {
      return [];
    }
  }

  /**
   * Read a .tg config file
   */
  async readConfig(filePath: string): Promise<TermGridConfig | undefined> {
    try {
      if (this.configCache.has(filePath)) {
        return this.configCache.get(filePath);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = YAML.parse(content);
      const validated = TermGridConfigSchema.parse(parsed);
      
      this.configCache.set(filePath, validated);
      return validated;
    } catch (error) {
      console.error(`Failed to read config: ${filePath}`, error);
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Config validation error in ${path.basename(filePath)}: ${error.message}`);
      } else {
        vscode.window.showErrorMessage(`Failed to read config: ${path.basename(filePath)}`);
      }
      return undefined;
    }
  }

  /**
   * Write a .tg config file
   */
  async writeConfig(filePath: string, config: TermGridConfig): Promise<boolean> {
    try {
      const configDir = path.dirname(filePath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const yaml = YAML.stringify(config, {
        sortMapEntries: true,
        indent: 2,
      });

      fs.writeFileSync(filePath, yaml, 'utf-8');
      this.configCache.set(filePath, config);
      return true;
    } catch (error) {
      console.error(`Failed to write config: ${filePath}`, error);
      vscode.window.showErrorMessage(`Failed to write config: ${path.basename(filePath)}`);
      return false;
    }
  }

  /**
   * Create a new .tg config file
   */
  async createConfig(name: string, config: TermGridConfig): Promise<string | undefined> {
    const configDir = this.ensureConfigDir();
    if (!configDir) return undefined;

    const fileName = name.endsWith(PATHS.CONFIG_EXT) ? name : `${name}${PATHS.CONFIG_EXT}`;
    const filePath = path.join(configDir, fileName);

    if (fs.existsSync(filePath)) {
      vscode.window.showErrorMessage(`Config file already exists: ${fileName}`);
      return undefined;
    }

    const success = await this.writeConfig(filePath, config);
    return success ? filePath : undefined;
  }

  /**
   * Delete a .tg config file
   */
  async deleteConfig(filePath: string): Promise<boolean> {
    try {
      fs.unlinkSync(filePath);
      this.configCache.delete(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete config: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Update cache for a config file
   */
  updateCache(filePath: string, config: TermGridConfig): void {
    this.configCache.set(filePath, config);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.configCache.clear();
  }
}
