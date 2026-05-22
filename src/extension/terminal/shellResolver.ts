import * as os from 'os';
import * as path from 'path';

/**
 * Resolves the appropriate shell command for the current platform.
 * Supports platform-specific overrides (win32, darwin, linux) with a fallback default.
 */
export interface ShellCommand {
  shell: string;
  args: string[];
}

const PLATFORM = os.platform();

/**
 * Detect the default shell for the current platform
 */
export function detectDefaultShell(): string {
  if (PLATFORM === 'win32') {
    // Try to find PowerShell or cmd
    const powershellPath = process.env.PSModulePath
      ? 'powershell.exe'
      : undefined;
    return powershellPath || process.env.COMSPEC || 'cmd.exe';
  }

  // For Unix-like systems, use the user's shell from passwd or env
  return process.env.SHELL || '/bin/sh';
}

/**
 * Resolve shell command from platform command object
 */
export function resolveShellCommand(
  command: { win32?: string; darwin?: string; linux?: string; default: string }
): ShellCommand {
  let shellCmd: string;

  switch (PLATFORM) {
    case 'win32':
      shellCmd = command.win32 || command.default;
      break;
    case 'darwin':
      shellCmd = command.darwin || command.default;
      break;
    case 'linux':
      shellCmd = command.linux || command.default;
      break;
    default:
      shellCmd = command.default;
  }

  // Parse shell and args
  const parts = shellCmd.trim().split(/\s+/);
  const shell = parts[0];
  const args = parts.slice(1);

  return { shell, args };
}

/**
 * Resolve a simple command string into shell and args
 */
export function parseCommand(command: string): ShellCommand {
  const parts = command.trim().split(/\s+/);
  return {
    shell: parts[0],
    args: parts.slice(1),
  };
}

/**
 * Get the current platform name
 */
export function getPlatform(): 'win32' | 'darwin' | 'linux' | 'unknown' {
  const platform = os.platform();
  if (platform === 'win32' || platform === 'darwin' || platform === 'linux') {
    return platform;
  }
  return 'unknown';
}

/**
 * Resolve working directory
 */
export function resolveCwd(cwd: string, workspaceRoot?: string): string {
  if (path.isAbsolute(cwd)) {
    return cwd;
  }

  if (cwd === '.' && workspaceRoot) {
    return workspaceRoot;
  }

  if (workspaceRoot) {
    return path.join(workspaceRoot, cwd);
  }

  return cwd;
}
