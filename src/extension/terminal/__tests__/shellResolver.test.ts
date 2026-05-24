import * as path from 'path';
import { describe, it, expect } from 'vitest';
import {
  resolveShellCommand,
  parseCommand,
  getPlatform,
  resolveCwd,
  getDefaultShell,
  resolveCommandText,
} from '../shellResolver';

describe('shellResolver', () => {
  describe('resolveCommandText', () => {
    it('should resolve default command text', () => {
      const result = resolveCommandText({ default: 'echo 1' });
      expect(result).toBe('echo 1');
    });

    it('should trim command text', () => {
      const result = resolveCommandText({ default: '  echo 1  ' });
      expect(result).toBe('echo 1');
    });

    it('should return undefined for empty command', () => {
      const result = resolveCommandText({ default: '   ' });
      expect(result).toBeUndefined();
    });

    it('should handle platform-specific command text', () => {
      const result = resolveCommandText({
        win32: 'echo win32',
        darwin: 'echo darwin',
        linux: 'echo linux',
        default: 'echo default',
      });
      const expectedCommands = {
        win32: 'echo win32',
        darwin: 'echo darwin',
        linux: 'echo linux',
        unknown: 'echo default',
      };
      expect(result).toBe(expectedCommands[getPlatform()]);
    });
  });

  describe('resolveShellCommand', () => {
    it('should support legacy one-shot execution through default shell', () => {
      const result = resolveShellCommand({ default: 'echo 1' });
      expect(result.shell).toBe(getDefaultShell().shell);
      expect(result.args).toContain('echo 1');
    });

    it('should preserve legacy command with arguments as one shell command', () => {
      const result = resolveShellCommand({ default: 'bash -c "echo hello"' });
      expect(result.shell).toBe(getDefaultShell().shell);
      expect(result.args).toContain('bash -c "echo hello"');
    });

    it('should handle platform-specific commands', () => {
      const result = resolveShellCommand({
        win32: 'cmd.exe /c echo',
        darwin: 'zsh',
        linux: 'bash',
        default: 'sh',
      });
      // Should return platform-specific or default
      expect(result.shell).toBeDefined();
    });

    it('should fall back to default shell when command is empty', () => {
      const result = resolveShellCommand({ default: '' });
      expect(result.shell).not.toBe('');
      expect(result.shell).toBeDefined();
    });
  });

  describe('parseCommand', () => {
    it('should parse simple command', () => {
      const result = parseCommand('bash');
      expect(result.shell).toBe('bash');
      expect(result.args).toEqual([]);
    });

    it('should parse command with arguments', () => {
      const result = parseCommand('node --version');
      expect(result.shell).toBe('node');
      expect(result.args).toEqual(['--version']);
    });
  });

  describe('getPlatform', () => {
    it('should return a valid platform string', () => {
      const platform = getPlatform();
      expect(['win32', 'darwin', 'linux', 'unknown']).toContain(platform);
    });
  });

  describe('resolveCwd', () => {
    it('should return absolute path as-is', () => {
      const result = resolveCwd('/absolute/path', '/workspace');
      expect(result).toBe('/absolute/path');
    });

    it('should resolve relative path with workspace root', () => {
      const result = resolveCwd('./src', '/workspace');
      expect(result).toBe(path.join('/workspace', './src'));
    });

    it('should use workspace root for "."', () => {
      const result = resolveCwd('.', '/workspace');
      expect(result).toBe('/workspace');
    });
  });
});
