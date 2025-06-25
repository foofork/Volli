import { VolliDB } from './database';
import type { Message } from './types';

export interface QueuedMessage {
  id?: number;
  message: Message;
  attempts: number;
  lastAttempt?: number;
  nextRetry?: number;
  error?: string;
}

export class PersistentMessageQueue {
  private db: VolliDB;
  private retryIntervals = [1000, 5000, 15000, 60000]; // 1s, 5s, 15s, 1m
  
  constructor(db: VolliDB) {
    this.db = db;
  }
  
  async enqueue(message: Message): Promise<void> {
    await this.db.messageQueue.add({
      message,
      attempts: 0
    });
  }
  
  async getPending(): Promise<QueuedMessage[]> {
    const now = Date.now();
    
    // Get messages that are ready to retry
    const allMessages = await this.db.messageQueue.toArray();
    const pendingMessages = allMessages.filter(
      item => !item.nextRetry || item.nextRetry <= now
    );
    
    return pendingMessages;
  }
  
  async markDelivered(messageId: number): Promise<void> {
    await this.db.messageQueue.delete(messageId);
  }
  
  async markFailed(messageId: number, error: string): Promise<void> {
    const item = await this.db.messageQueue.get(messageId);
    if (!item) return;
    
    const attempts = item.attempts + 1;
    const retryDelay = this.getRetryDelay(attempts);
    
    if (retryDelay === null) {
      // Max retries exceeded, remove from queue
      await this.db.messageQueue.delete(messageId);
      console.error(`Message ${messageId} failed after ${attempts} attempts:`, error);
    } else {
      // Schedule retry
      await this.db.messageQueue.update(messageId, {
        attempts,
        lastAttempt: Date.now(),
        nextRetry: Date.now() + retryDelay,
        error
      });
    }
  }
  
  private getRetryDelay(attempts: number): number | null {
    if (attempts >= this.retryIntervals.length) {
      return null; // Max retries exceeded
    }
    return this.retryIntervals[attempts];
  }
  
  async clear(): Promise<void> {
    // Delete all entries
    const allMessages = await this.db.messageQueue.toArray();
    for (const msg of allMessages) {
      if (msg.id) {
        await this.db.messageQueue.delete(msg.id);
      }
    }
  }
  
  async getQueueSize(): Promise<number> {
    const allMessages = await this.db.messageQueue.toArray();
    return allMessages.length;
  }
  
  // For compatibility with existing code
  get pending(): Message[] {
    console.warn('messageQueue.pending is deprecated. Use getPending() instead.');
    return [];
  }
}