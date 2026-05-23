import * as pty from 'node-pty';
import { TerminalCell } from '../../shared/schema';
import { TerminalStatus } from '../../shared/types';
import { resolveShellCommand, resolveCwd } from './shellResolver';
import { ExecutionQueue } from './executionQueue';

export interface PtyProcess {
  id: string;
  pty: pty.IPty;
  cell: TerminalCell;
  status: TerminalStatus;
  startTime: number;
}

export interface PtyManagerOptions {
  workspaceRoot?: string;
  onData: (cellId: string, data: string) => void;
  onStatusChange: (cellId: string, status: TerminalStatus) => void;
  onExit: (cellId: string, code: number) => void;
}

/**
 * Manages node-pty processes lifecycle for all terminal cells.
 * Handles creation, input, resize, and termination of PTY processes.
 */
export class PtyManager {
  private processes: Map<string, PtyProcess> = new Map();
  private executionQueue: ExecutionQueue = new ExecutionQueue();
  private options: PtyManagerOptions;

  constructor(options: PtyManagerOptions) {
    this.options = options;
  }

  /**
   * Start a single terminal cell
   */
  async startCell(cell: TerminalCell): Promise<void> {
    if (this.processes.has(cell.id)) {
      // Already running, stop first
      await this.stopCell(cell.id);
    }

    try {
      this.options.onStatusChange(cell.id, 'pending');

      const shellCmd = resolveShellCommand(cell.command);
      const cwd = resolveCwd(cell.cwd, this.options.workspaceRoot);

      // Create PTY process
      const ptyProcess = pty.spawn(shellCmd.shell, shellCmd.args, {
        name: 'xterm-color',
        cwd,
        env: {
          ...process.env,
          ...cell.env,
        } as { [key: string]: string },
        cols: 80,
        rows: 24,
      });

      const processData: PtyProcess = {
        id: cell.id,
        pty: ptyProcess,
        cell,
        status: 'running',
        startTime: Date.now(),
      };

      // Set up data handler
      ptyProcess.onData((data: string) => {
        this.options.onData(cell.id, data);
      });

      // Set up exit handler
      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        this.processes.delete(cell.id);
        this.options.onStatusChange(cell.id, 'stopped');
        this.options.onExit(cell.id, exitCode);
      });

      this.processes.set(cell.id, processData);
      this.options.onStatusChange(cell.id, 'running');
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
      processData.pty.kill();
      this.processes.delete(cellId);
      this.options.onStatusChange(cellId, 'stopped');
    } catch (error) {
      console.error(`Failed to stop terminal ${cellId}:`, error);
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
        order: cell.order,
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
    this.executionQueue.stop();

    const stopPromises: Promise<void>[] = [];
    for (const [cellId] of this.processes) {
      stopPromises.push(this.stopCell(cellId));
    }

    await Promise.all(stopPromises);
  }

  /**
   * Restart all terminals
   */
  async restartAll(cells: TerminalCell[]): Promise<void> {
    await this.stopAll();
    await new Promise((resolve) => setTimeout(resolve, 200));
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
   * Get all running terminal IDs
   */
  getRunningIds(): string[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.executionQueue.clear();

    for (const [cellId, processData] of this.processes) {
      try {
        processData.pty.kill();
      } catch (error) {
        console.error(`Failed to kill terminal ${cellId}:`, error);
      }
    }

    this.processes.clear();
  }
}
