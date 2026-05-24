import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pty from 'node-pty';
import { PtyManager } from '../ptyManager';
import { TerminalCell } from '../../../shared/schema';

vi.mock('node-pty', () => ({
  spawn: vi.fn(),
}));

interface FakePty {
  write: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  onData: (handler: (data: string) => void) => void;
  onExit: (handler: (event: { exitCode: number }) => void) => void;
}

const createCell = (overrides: Partial<TerminalCell> = {}): TerminalCell => ({
  id: 'cell-1',
  title: 'Cell 1',
  cwd: '.',
  command: { default: 'npm run dev' },
  env: {},
  delay: 0,
  colSpan: 1,
  rowSpan: 1,
  ...overrides,
});

describe('PtyManager', () => {
  let fakePty: FakePty;
  let onDataHandler: ((data: string) => void) | undefined;
  let onExitHandler: ((event: { exitCode: number }) => void) | undefined;
  let onData: ReturnType<typeof vi.fn>;
  let onStatusChange: ReturnType<typeof vi.fn>;
  let onExit: ReturnType<typeof vi.fn>;
  let manager: PtyManager;

  beforeEach(() => {
    onDataHandler = undefined;
    onExitHandler = undefined;
    fakePty = {
      write: vi.fn(),
      kill: vi.fn(),
      resize: vi.fn(),
      onData: vi.fn((handler: (data: string) => void) => {
        onDataHandler = handler;
      }),
      onExit: vi.fn((handler: (event: { exitCode: number }) => void) => {
        onExitHandler = handler;
      }),
    };
    vi.mocked(pty.spawn).mockReset();
    vi.mocked(pty.spawn).mockReturnValue(fakePty as unknown as pty.IPty);

    onData = vi.fn();
    onStatusChange = vi.fn();
    onExit = vi.fn();
    manager = new PtyManager({
      workspaceRoot: '/workspace',
      onData,
      onStatusChange,
      onExit,
    });
  });

  it('starts an interactive shell without putting the initial command in spawn args', async () => {
    await manager.startCell(createCell());

    expect(pty.spawn).toHaveBeenCalledOnce();
    const [shell, args] = vi.mocked(pty.spawn).mock.calls[0];
    expect(shell).toEqual(expect.any(String));
    expect(args).toEqual([]);
    expect(args).not.toContain('npm run dev');
    expect(args).not.toContain('/c');
    expect(args).not.toContain('-Command');
    expect(args).not.toContain('-lc');
  });

  it('writes the configured command as initial terminal input', async () => {
    await manager.startCell(createCell());

    expect(fakePty.write).toHaveBeenCalledWith('npm run dev\r');
  });

  it('does not write initial input when command is empty', async () => {
    await manager.startCell(createCell({ command: { default: '   ' } }));

    expect(fakePty.write).not.toHaveBeenCalled();
  });

  it('writes user input to the running pty', async () => {
    await manager.startCell(createCell());

    await manager.sendInput('cell-1', 'echo hello\r');

    expect(fakePty.write).toHaveBeenCalledWith('npm run dev\r');
    expect(fakePty.write).toHaveBeenCalledWith('echo hello\r');
  });

  it('forwards pty output data', async () => {
    await manager.startCell(createCell());

    onDataHandler?.('ready\r\n');

    expect(onData).toHaveBeenCalledWith('cell-1', 'ready\r\n');
  });

  it('cleans up and reports status when the pty exits', async () => {
    await manager.startCell(createCell());

    onExitHandler?.({ exitCode: 0 });

    expect(onStatusChange).toHaveBeenCalledWith('cell-1', 'stopped');
    expect(onExit).toHaveBeenCalledWith('cell-1', 0);
    expect(manager.isRunning('cell-1')).toBe(false);
  });
});
