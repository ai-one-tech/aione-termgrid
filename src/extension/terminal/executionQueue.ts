/**
 * Execution queue for ordered terminal startup with delay support.
 * Manages sequential or delayed execution of terminal start commands.
 */

export interface ExecutionTask {
  id: string;
  order: number;
  delay: number;
  execute: () => Promise<void>;
}

export class ExecutionQueue {
  private tasks: Map<string, ExecutionTask> = new Map();
  private running: boolean = false;
  private abortController: AbortController | null = null;

  /**
   * Add a task to the queue
   */
  add(task: ExecutionTask): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Remove a task from the queue
   */
  remove(taskId: string): void {
    this.tasks.delete(taskId);
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
    this.running = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if the queue is currently running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Execute all tasks in order (sorted by order, then delay)
   * Tasks with the same order run in parallel, different orders run sequentially
   */
  async runAll(): Promise<void> {
    if (this.running) {
      throw new Error('Execution queue is already running');
    }

    this.running = true;
    this.abortController = new AbortController();

    try {
      // Group tasks by order
      const orderGroups = new Map<number, ExecutionTask[]>();
      for (const task of this.tasks.values()) {
        const existing = orderGroups.get(task.order) || [];
        existing.push(task);
        orderGroups.set(task.order, existing);
      }

      // Sort orders
      const sortedOrders = Array.from(orderGroups.keys()).sort((a, b) => a - b);

      for (const order of sortedOrders) {
        if (this.abortController?.signal.aborted) {
          break;
        }

        const tasks = orderGroups.get(order) || [];

        // Execute tasks with the same order in parallel
        await Promise.all(
          tasks.map(async (task) => {
            // Apply individual delay before executing
            if (task.delay > 0) {
              await this.delay(task.delay);
              if (this.abortController?.signal.aborted) {
                return;
              }
            }
            await task.execute();
          })
        );
      }
    } finally {
      this.running = false;
      this.abortController = null;
    }
  }

  /**
   * Execute a single task by ID
   */
  async runOne(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in execution queue`);
    }

    if (task.delay > 0) {
      await this.delay(task.delay);
    }

    await task.execute();
  }

  /**
   * Stop the execution queue
   */
  stop(): void {
    this.running = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
