import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

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
 * Find the full path of an executable on Windows using 'where' command
 */
function findWindowsExecutable(name: string): string | undefined {
  try {
    const result = execSync(`where "${name}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const paths = result.trim().split('\r\n').filter(p => p.trim());
    return paths[0];
  } catch {
    return undefined;
  }
}

/**
 * Get the full path to PowerShell on Windows
 */
function getWindowsPowerShellPath(): string {
  // Try PowerShell Core (pwsh) first, then Windows PowerShell
  const pwshPath = findWindowsExecutable('pwsh.exe');
  if (pwshPath) return pwshPath;

  const psPath = findWindowsExecutable('powershell.exe');
  if (psPath) return psPath;

  // Fallback to well-known path
  return 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
}

/**
 * Get the full path to cmd.exe on Windows
 */
function getWindowsCmdPath(): string {
  const cmdPath = findWindowsExecutable('cmd.exe');
  if (cmdPath) return cmdPath;

  // Fallback to well-known path
  return 'C:\\Windows\\System32\\cmd.exe';
}

/**
 * Detect the default shell for the current platform
 * Returns full path on Windows
 */
export function detectDefaultShell(): string {
  if (PLATFORM === 'win32') {
    // Try to find PowerShell or cmd
    if (process.env.PSModulePath) {
      return getWindowsPowerShellPath();
    }
    return getWindowsCmdPath();
  }

  // For Unix-like systems, use the user's shell from passwd or env
  return process.env.SHELL || '/bin/sh';
}

/**
 * Get default shell as ShellCommand object
 * Used when no command is specified for a terminal cell
 */
export function getDefaultShell(): ShellCommand {
  const shell = detectDefaultShell();
  return {
    shell,
    args: [],
  };
}

/**
 * Resolve command text from platform command object
 */
export function resolveCommandText(
  command: { win32?: string; darwin?: string; linux?: string; default: string }
): string | undefined {
  let shellCmd: string | undefined;

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

  const trimmedCommand = shellCmd?.trim();
  return trimmedCommand || undefined;
}

/**
 * Resolve shell command from platform command object
 */
export function resolveShellCommand(
  command: { win32?: string; darwin?: string; linux?: string; default: string }
): ShellCommand {
  let shellCmd: string | undefined;

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

  if (!shellCmd?.trim()) {
    return getDefaultShell();
  }

  const defaultShell = getDefaultShell();
  const trimmedCommand = shellCmd.trim();

  if (PLATFORM === 'win32') {
    const shellName = path.basename(defaultShell.shell).toLowerCase();
    if (shellName === 'cmd.exe') {
      return { shell: defaultShell.shell, args: ['/c', trimmedCommand] };
    }

    return {
      shell: defaultShell.shell,
      args: ['-NoLogo', '-NoProfile', '-Command', trimmedCommand],
    };
  }

  return { shell: defaultShell.shell, args: ['-lc', trimmedCommand] };
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
