import * as os from 'os';
import * as path from 'path';
import * as child_process from 'child_process';
import * as fs from 'fs';
import type * as Pty from 'node-pty';
import { TerminalCell } from '../../shared/schema';
import { TerminalStatus } from '../../shared/types';
import { getDefaultShell, resolveCommandText, resolveCwd } from './shellResolver';
import { ExecutionQueue } from './executionQueue';

/**
 * Lazy-load node-pty to prevent extension activation failure
 * when the native module is unavailable (e.g. missing in VSIX).
 */
let _pty: typeof Pty | null = null;

function getPty(): typeof Pty {
  if (!_pty) {
    try {
      _pty = require('node-pty');
    } catch (err) {
      throw new Error('node-pty module not available. Terminal features will not work.');
    }
  }
  return _pty as typeof Pty;
}

/**
 * Kill an entire process tree.
 * On Windows: uses taskkill /T /F.
 * On Unix: sends SIGKILL to the process group.
 */
function killProcessTree(pid: number): void {
  if (os.platform() === 'win32') {
    try {
      console.log(`[TermGrid] killProcessTree: taskkill /T /F /PID ${pid}`);
      child_process.execSync(`taskkill /T /F /PID ${pid}`, {
        stdio: 'ignore',
        timeout: 5000,
      });
      console.log(`[TermGrid] killProcessTree: PID ${pid} killed successfully`);
    } catch (err) {
      console.warn(`[TermGrid] killProcessTree: taskkill failed for PID ${pid}`, err);
    }
  } else {
    try {
      // On Unix-like systems, we try to kill the process group (using -pid)
      // This sends the signal to the process and all its children.
      // SIGKILL (9) is used for a forced stop.
      process.kill(-pid, 'SIGKILL');
      console.log(`[TermGrid] killProcessTree: SIGKILL sent to process group -${pid}`);
    } catch (err) {
      // If killing the group fails (e.g., process not a group leader), 
      // try killing the individual process.
      try {
        process.kill(pid, 'SIGKILL');
        console.log(`[TermGrid] killProcessTree: SIGKILL sent to PID ${pid}`);
      } catch (err2) {
        console.warn(`[TermGrid] killProcessTree: Failed to kill PID ${pid}`, err2);
      }
    }
  }
}

export interface PtyProcess {
  id: string;
  pty: Pty.IPty;
  cell: TerminalCell;
  status: TerminalStatus;
  startTime: number;
  buffer: string[];
}

const MAX_BUFFER_LINES = 1000;

export interface PtyManagerOptions {
  workspaceRoot?: string;
  getInitialDelay?: () => number;
  onData: (cellId: string, data: string) => void;
  onStatusChange: (cellId: string, status: TerminalStatus) => void;
  onExit: (cellId: string, code: number) => void;
}

/**
 * Load and parse environment variables from files.
 * Format is k=v per line.
 */
function loadEnvFiles(files: string[], workspaceRoot?: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const file of files) {
    let filePath = file.trim();
    if (!filePath) continue;

    if (!path.isAbsolute(filePath) && workspaceRoot) {
      filePath = path.join(workspaceRoot, filePath);
    }

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith('#')) continue;
          
          const index = trimmedLine.indexOf('=');
          if (index > 0) {
            const key = trimmedLine.substring(0, index).trim();
            const value = trimmedLine.substring(index + 1).trim();
            if (key) {
              env[key] = value;
            }
          }
        }
      } catch (err) {
        console.error(`[TermGrid] Failed to read env file: ${filePath}`, err);
      }
    } else {
      console.warn(`[TermGrid] Env file not found: ${filePath}`);
    }
  }
  return env;
}

/**
 * Manages node-pty processes lifecycle for all terminal cells.
 * Handles creation, input, resize, and termination of PTY processes.
 */
export class PtyManager {
  private processes: Map<string, PtyProcess> = new Map();
  private testProcess: PtyProcess | null = null;
  private executionQueue: ExecutionQueue = new ExecutionQueue();
  private options: PtyManagerOptions;

  constructor(options: PtyManagerOptions) {
    this.options = options;
  }

  /**
   * Run a test terminal cell
   */
  async testCell(cell: TerminalCell, onTestData: (data: string) => void, onTestExit: (code: number) => void): Promise<void> {
    if (this.testProcess) {
      await this.stopTest();
    }

    try {
      const shellCmd = getDefaultShell();
      const initialCommand = resolveCommandText(cell.command ?? { default: '' });
      let cwd = resolveCwd(cell.cwd, this.options.workspaceRoot);
      const shell = shellCmd.shell.trim();

      if (!fs.existsSync(cwd)) {
        cwd = this.options.workspaceRoot || os.tmpdir();
      }

      const fileEnv = loadEnvFiles(cell.envFiles || [], this.options.workspaceRoot);
      const mergedEnv = {
        ...process.env,
        ...fileEnv,
        ...cell.env,
      } as { [key: string]: string };

      const ptyProcess = getPty().spawn(shell, shellCmd.args, {
        name: 'xterm-color',
        cwd,
        env: mergedEnv,
        cols: 80,
        rows: 24,
        ...(os.platform() === 'win32' ? { useConpty: false } : {}),
      });

      this.testProcess = {
        id: 'test',
        pty: ptyProcess,
        cell,
        status: 'running',
        startTime: Date.now(),
        buffer: [],
      };

      ptyProcess.onData((data: string) => {
        onTestData(data);
      });

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        this.testProcess = null;
        onTestExit(exitCode);
      });

      if (initialCommand) {
        const delay = this.options.getInitialDelay ? this.options.getInitialDelay() : 2000;
        setTimeout(() => {
          if (this.testProcess) {
            this.testProcess.pty.write(`${initialCommand}\r`);
          }
        }, delay);
      }
    } catch (error) {
      console.error(`[TermGrid] Failed to start test terminal:`, error);
      onTestExit(-1);
      throw error;
    }
  }

  /**
   * Stop the test process
   */
  async stopTest(): Promise<void> {
    if (!this.testProcess) return;
    try {
      killProcessTree(this.testProcess.pty.pid);
      try {
        this.testProcess.pty.kill(os.platform() === 'win32' ? undefined : 'SIGKILL');
      } catch (e) {}
      this.testProcess = null;
    } catch (error) {
      console.error(`[TermGrid] stopTest failed`, error);
    }
  }

  /**
   * Start a single terminal cell
   */
  async startCell(cell: TerminalCell): Promise<void> {
    if (this.processes.has(cell.id)) {
      await this.stopCell(cell.id);
    }

    try {
      this.options.onStatusChange(cell.id, 'pending');
      
      // Ensure buffer is clean for a new run
      const existingProcess = this.processes.get(cell.id);
      if (existingProcess) {
        existingProcess.buffer = [];
      }

      const shellCmd = getDefaultShell();
      const initialCommand = resolveCommandText(cell.command ?? { default: '' });
      let cwd = resolveCwd(cell.cwd, this.options.workspaceRoot);
      const shell = shellCmd.shell.trim();

      // Verify CWD exists, otherwise fallback
      if (!fs.existsSync(cwd)) {
        console.warn(`[TermGrid] CWD does not exist: ${cwd}. Falling back to workspace root or temp dir.`);
        cwd = this.options.workspaceRoot || os.tmpdir();
        if (!fs.existsSync(cwd)) {
          cwd = os.tmpdir();
        }
      }

      console.log(`[TermGrid] Attempting to start cell ${cell.id}:`, {
        shell,
        args: shellCmd.args,
        cwd,
        workspaceRoot: this.options.workspaceRoot,
        processCwd: process.cwd()
      });

      if (!shell) {
        throw new Error(`Resolved empty shell for terminal ${cell.id}`);
      }

      // Merge environment variables:
      // 1. Process environment
      // 2. Env files (lower priority than manual env)
      // 3. Manual env
      const fileEnv = loadEnvFiles(cell.envFiles || [], this.options.workspaceRoot);
      const mergedEnv = {
        ...process.env,
        ...fileEnv,
        ...cell.env,
      } as { [key: string]: string };

      const ptyOptions: Pty.IPtyForkOptions | Pty.IWindowsPtyForkOptions = {
        name: 'xterm-color',
        cwd,
        env: mergedEnv,
        cols: 80,
        rows: 24,
        ...(os.platform() === 'win32' ? { useConpty: false } : {}),
      };

      const ptyProcess = getPty().spawn(shell, shellCmd.args, ptyOptions);

      console.log(`[TermGrid] startCell: cell=${cell.id} shell="${shell}" pid=${ptyProcess.pid}`);

      const processData: PtyProcess = {
        id: cell.id,
        pty: ptyProcess,
        cell,
        status: 'running',
        startTime: Date.now(),
        buffer: [],
      };

      ptyProcess.onData((data: string) => {
        // Store in buffer
        processData.buffer.push(data);
        if (processData.buffer.length > MAX_BUFFER_LINES) {
          processData.buffer.shift();
        }
        this.options.onData(cell.id, data);
      });

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        // Only handle if still tracked (stopCell already handles cleanup when called explicitly)
        if (!this.processes.has(cell.id)) {
          return;
        }
        this.processes.delete(cell.id);
        this.options.onStatusChange(cell.id, 'stopped');
        this.options.onExit(cell.id, exitCode);
      });

      this.processes.set(cell.id, processData);
      this.options.onStatusChange(cell.id, 'running');

      if (initialCommand) {
        // Simple delay to ensure the shell is ready to receive input
        const delay = this.options.getInitialDelay ? this.options.getInitialDelay() : 2000;
        console.log(`[TermGrid] Scheduling initial command for cell ${cell.id} with ${delay}ms delay: "${initialCommand}"`);
        setTimeout(() => {
          const activeProcess = this.processes.get(cell.id);
          if (activeProcess) {
            activeProcess.pty.write(`${initialCommand}\r`);
          }
        }, delay);
      }
    } catch (error) {
      this.options.onStatusChange(cell.id, 'error');
      console.error(`Failed to start terminal ${cell.id}:`, error);
      throw error;
    }
  }

  /**
   * Stop a single terminal cell
   */
  async stopCell(cellId: string): Promise<void> {
    const processData = this.processes.get(cellId);
    if (!processData) {
      return;
    }

    try {
      console.log(`[TermGrid] stopCell: cell=${cellId} pid=${processData.pty.pid}`);
      killProcessTree(processData.pty.pid);
      try {
        processData.pty.kill(os.platform() === 'win32' ? undefined : 'SIGKILL');
      } catch (e) {
        // Process might already be killed by killProcessTree
      }
      console.log(`[TermGrid] stopCell: pty.kill() called for pid=${processData.pty.pid}`);
      this.processes.delete(cellId);
      this.options.onStatusChange(cellId, 'stopped');
    } catch (error) {
      console.error(`[TermGrid] stopCell: failed for cell=${cellId} pid=${processData.pty.pid}`, error);
      throw error;
    }
  }

  /**
   * Restart a single terminal cell
   */
  async restartCell(cell: TerminalCell): Promise<void> {
    await this.stopCell(cell.id);
    // Small delay to ensure clean shutdown
    await new Promise((resolve) => setTimeout(resolve, 100));
    await this.startCell(cell);
  }

  /**
   * Start all cells in order using execution queue
   */
  async startAll(cells: TerminalCell[]): Promise<void> {
    this.executionQueue.clear();

    for (const cell of cells) {
      this.executionQueue.add({
        id: cell.id,
        order: cell.order ?? 1,
        delay: cell.delay,
        execute: async () => {
          await this.startCell(cell);
        },
      });
    }

    await this.executionQueue.runAll();
  }

  /**
   * Stop all running terminals
   */
  async stopAll(): Promise<void> {
    // Stop any pending starts in the queue
    this.executionQueue.stop();
    this.executionQueue.clear();

    const stopPromises: Promise<void>[] = [];
    // Copy keys to avoid iteration issues if stopCell modifies the map
    const cellIds = Array.from(this.processes.keys());
    
    for (const cellId of cellIds) {
      stopPromises.push(this.stopCell(cellId));
    }

    await Promise.all(stopPromises);
    
    // Give a small amount of time for OS to clean up handles
    if (stopPromises.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Restart all terminals
   */
  async restartAll(cells: TerminalCell[]): Promise<void> {
    console.log(`[TermGrid] restartAll: stopping ${this.processes.size} processes`);
    await this.stopAll();
    
    // Wait for everything to settle
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    console.log(`[TermGrid] restartAll: starting ${cells.length} cells`);
    await this.startAll(cells);
  }

  /**
   * Send input data to a terminal
   */
  async sendInput(cellId: string, data: string): Promise<void> {
    const processData = this.processes.get(cellId);
    if (!processData) {
      throw new Error(`Terminal ${cellId} is not running`);
    }

    processData.pty.write(data);
  }

  /**
   * Resize a terminal
   */
  async resize(cellId: string, cols: number, rows: number): Promise<void> {
    const processData = this.processes.get(cellId);
    if (!processData) {
      return;
    }

    processData.pty.resize(cols, rows);
  }

  /**
   * Get the status of a terminal
   */
  getStatus(cellId: string): TerminalStatus {
    const processData = this.processes.get(cellId);
    if (!processData) {
      return 'stopped';
    }
    return processData.status;
  }

  /**
   * Check if a terminal is running
   */
  isRunning(cellId: string): boolean {
    return this.processes.has(cellId);
  }

  /**
   * Check if any terminal is running or being started
   */
  hasActiveTerminals(): boolean {
    return this.processes.size > 0 || this.executionQueue.isRunning();
  }

  /**
   * Get all running terminal IDs
   */
  getRunningIds(): string[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Get terminal data buffer
   */
  getBuffer(cellId: string): string {
    const processData = this.processes.get(cellId);
    return processData ? processData.buffer.join('') : '';
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.executionQueue.clear();

    for (const [cellId, processData] of this.processes) {
      try {
        console.log(`[TermGrid] dispose: cell=${cellId} pid=${processData.pty.pid}`);
        killProcessTree(processData.pty.pid);
        try {
          processData.pty.kill(os.platform() === 'win32' ? undefined : 'SIGKILL');
        } catch (e) {}
      } catch (error) {
        console.error(`[TermGrid] dispose: failed for cell=${cellId} pid=${processData.pty.pid}`, error);
      }
    }

    this.processes.clear();
  }
}
