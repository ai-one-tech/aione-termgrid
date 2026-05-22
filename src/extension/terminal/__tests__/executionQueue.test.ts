import { describe, it, expect, vi } from 'vitest';
import { ExecutionQueue } from '../executionQueue';

describe('ExecutionQueue', () => {
  it('should execute tasks in order', async () => {
    const queue = new ExecutionQueue();
    const results: string[] = [];

    queue.add({
      id: 'task-1',
      order: 1,
      delay: 0,
      execute: async () => {
        results.push('task-1');
      },
    });

    queue.add({
      id: 'task-2',
      order: 2,
      delay: 0,
      execute: async () => {
        results.push('task-2');
      },
    });

    await queue.runAll();

    expect(results).toEqual(['task-1', 'task-2']);
  });

  it('should execute tasks with same order in parallel', async () => {
    const queue = new ExecutionQueue();
    const results: string[] = [];

    queue.add({
      id: 'task-1',
      order: 1,
      delay: 0,
      execute: async () => {
        results.push('task-1');
      },
    });

    queue.add({
      id: 'task-2',
      order: 1,
      delay: 0,
      execute: async () => {
        results.push('task-2');
      },
    });

    await queue.runAll();

    expect(results).toContain('task-1');
    expect(results).toContain('task-2');
  });

  it('should not allow running queue twice simultaneously', async () => {
    const queue = new ExecutionQueue();

    queue.add({
      id: 'task-1',
      order: 1,
      delay: 0,
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
    });

    // Start first run
    const firstRun = queue.runAll();

    // Try to start second run while first is running
    await expect(queue.runAll()).rejects.toThrow('Execution queue is already running');

    await firstRun;
  });

  it('should clear all tasks', () => {
    const queue = new ExecutionQueue();

    queue.add({
      id: 'task-1',
      order: 1,
      delay: 0,
      execute: async () => {},
    });

    queue.clear();

    expect(queue.isRunning()).toBe(false);
  });

  it('should run a single task by ID', async () => {
    const queue = new ExecutionQueue();
    let executed = false;

    queue.add({
      id: 'task-1',
      order: 1,
      delay: 0,
      execute: async () => {
        executed = true;
      },
    });

    await queue.runOne('task-1');

    expect(executed).toBe(true);
  });

  it('should throw when running non-existent task', async () => {
    const queue = new ExecutionQueue();

    await expect(queue.runOne('non-existent')).rejects.toThrow('Task non-existent not found in execution queue');
  });
});
