/**
 * Unified Sync Queue Manager
 * Ensures only one sync operation runs at a time
 * Processes sync tasks sequentially to avoid conflicts
 */

import { logger } from '../utils/logger';

export type SyncTask<T = any> = () => Promise<T>;
export type SyncTaskId = string;

interface QueuedTask<T = any> {
  id: SyncTaskId;
  task: SyncTask<T>;
  priority: number; // Higher priority tasks are processed first
  timestamp: number;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class SyncQueueManager {
  private queue: QueuedTask[] = [];
  private isProcessing = false;
  private currentTaskId: SyncTaskId | null = null;

  /**
   * Add a task to the sync queue
   * @param task The async function to execute
   * @param priority Higher priority tasks are processed first (default: 0)
   * @returns Promise that resolves when the task completes
   */
  async enqueue<T>(task: SyncTask<T>, priority: number = 0): Promise<T> {
    const taskId: SyncTaskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise<T>((resolve, reject) => {
      const queuedTask: QueuedTask<T> = {
        id: taskId,
        task,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      // Insert task in priority order (higher priority first, then by timestamp)
      const insertIndex = this.queue.findIndex(
        (q) => q.priority < priority || (q.priority === priority && q.timestamp > queuedTask.timestamp)
      );

      if (insertIndex === -1) {
        this.queue.push(queuedTask);
      } else {
        this.queue.splice(insertIndex, 0, queuedTask);
      }

      logger.debug(`[SyncQueue] Task ${taskId} enqueued (priority: ${priority}, queue length: ${this.queue.length})`);

      // Start processing if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const queuedTask = this.queue.shift();
      if (!queuedTask) {
        break;
      }

      this.currentTaskId = queuedTask.id;
      logger.debug(`[SyncQueue] Processing task ${queuedTask.id} (${this.queue.length} remaining)`);

      try {
        const result = await queuedTask.task();
        queuedTask.resolve(result);
        logger.debug(`[SyncQueue] Task ${queuedTask.id} completed successfully`);
      } catch (error) {
        queuedTask.reject(error);
        logger.error(`[SyncQueue] Task ${queuedTask.id} failed:`, error);
      } finally {
        this.currentTaskId = null;
      }
    }

    this.isProcessing = false;
    logger.debug('[SyncQueue] Queue processing complete');
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is processing
   */
  isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get current task ID
   */
  getCurrentTaskId(): SyncTaskId | null {
    return this.currentTaskId;
  }

  /**
   * Clear all pending tasks (use with caution)
   */
  clearQueue(): void {
    const clearedCount = this.queue.length;
    this.queue.forEach((task) => {
      task.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    logger.warn(`[SyncQueue] Cleared ${clearedCount} pending tasks`);
  }
}

// Export singleton instance
export const syncQueue = new SyncQueueManager();

