import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageQueue,
  QueuedMessage,
  QueuePriority
} from './types';

/**
 * Message queue for reliable delivery
 */
export class MessageQueueManager {
  private queues: Map<string, MessageQueue> = new Map();
  private retryIntervals: Map<string, NodeJS.Timeout> = new Map();
  private maxRetries = 3;
  private baseRetryDelay = 1000; // 1 second
  
  /**
   * Add message to queue
   */
  queueMessage(
    message: Omit<Message, 'id'>,
    conversationId: string,
    priority: QueuePriority = QueuePriority.NORMAL,
    scheduledAt?: number
  ): string {
    const tempId = uuidv4();
    
    const queuedMessage: QueuedMessage = {
      tempId,
      message,
      retryCount: 0,
      priority,
      scheduledAt
    };
    
    // Get or create queue for conversation
    let queue = this.queues.get(conversationId);
    if (!queue) {
      queue = {
        messages: [],
        conversationId,
        priority: QueuePriority.NORMAL
      };
      this.queues.set(conversationId, queue);
    }
    
    // Insert message in priority order
    this.insertMessageByPriority(queue, queuedMessage);
    
    // Update queue priority
    queue.priority = Math.max(queue.priority, priority);
    
    return tempId;
  }
  
  /**
   * Get next message to send
   */
  getNextMessage(): QueuedMessage | null {
    const now = Date.now();
    let highestPriorityMessage: QueuedMessage | null = null;
    let highestPriority = 0;
    
    for (const queue of this.queues.values()) {
      for (const message of queue.messages) {
        // Skip scheduled messages that aren't ready yet
        if (message.scheduledAt && message.scheduledAt > now) {
          continue;
        }
        
        if (message.priority > highestPriority) {
          highestPriority = message.priority;
          highestPriorityMessage = message;
        }
      }
    }
    
    return highestPriorityMessage;
  }
  
  /**
   * Mark message as sent successfully
   */
  markMessageSent(tempId: string, _finalMessageId: string): void {
    this.removeMessage(tempId);
    this.clearRetryTimer(tempId);
  }
  
  /**
   * Mark message as failed and schedule retry
   */
  markMessageFailed(tempId: string, error: Error): void {
    const queuedMessage = this.findMessage(tempId);
    if (!queuedMessage) {
      return;
    }
    
    queuedMessage.retryCount++;
    
    if (queuedMessage.retryCount >= this.maxRetries) {
      // Max retries reached, remove from queue
      this.removeMessage(tempId);
      this.clearRetryTimer(tempId);
      
      // Emit failure event
      this.onMessagePermanentlyFailed?.(queuedMessage, error);
    } else {
      // Schedule retry with exponential backoff
      const delay = this.baseRetryDelay * Math.pow(2, queuedMessage.retryCount - 1);
      
      const timer = setTimeout(() => {
        this.onRetryMessage?.(queuedMessage);
        this.clearRetryTimer(tempId);
      }, delay);
      
      this.retryIntervals.set(tempId, timer);
    }
  }
  
  /**
   * Remove message from queue
   */
  removeMessage(tempId: string): boolean {
    for (const [conversationId, queue] of this.queues.entries()) {
      const messageIndex = queue.messages.findIndex(m => m.tempId === tempId);
      if (messageIndex !== -1) {
        queue.messages.splice(messageIndex, 1);
        
        // Remove empty queues
        if (queue.messages.length === 0) {
          this.queues.delete(conversationId);
        }
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get queue for conversation
   */
  getQueue(conversationId: string): MessageQueue | undefined {
    return this.queues.get(conversationId);
  }
  
  /**
   * Get all queued messages for conversation
   */
  getQueuedMessages(conversationId: string): QueuedMessage[] {
    const queue = this.queues.get(conversationId);
    return queue ? [...queue.messages] : [];
  }
  
  /**
   * Get total queued message count
   */
  getTotalQueuedCount(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.messages.length;
    }
    return total;
  }
  
  /**
   * Clear all queued messages
   */
  clearAll(): void {
    this.queues.clear();
    
    // Clear all retry timers
    for (const timer of this.retryIntervals.values()) {
      clearTimeout(timer);
    }
    this.retryIntervals.clear();
  }
  
  /**
   * Clear queued messages for conversation
   */
  clearConversation(conversationId: string): void {
    const queue = this.queues.get(conversationId);
    if (queue) {
      // Clear retry timers for messages in this queue
      for (const message of queue.messages) {
        this.clearRetryTimer(message.tempId);
      }
      
      this.queues.delete(conversationId);
    }
  }
  
  /**
   * Pause message sending
   */
  pause(): void {
    // Implementation would pause the sending process
    // This is a placeholder for the actual implementation
  }
  
  /**
   * Resume message sending
   */
  resume(): void {
    // Implementation would resume the sending process
    // This is a placeholder for the actual implementation
  }
  
  /**
   * Event handlers (to be set by the messaging system)
   */
  onRetryMessage?: (message: QueuedMessage) => void;
  onMessagePermanentlyFailed?: (message: QueuedMessage, error: Error) => void;
  
  /**
   * Insert message into queue by priority
   */
  private insertMessageByPriority(queue: MessageQueue, message: QueuedMessage): void {
    // Find the correct position to insert based on priority
    let insertIndex = queue.messages.length;
    
    for (let i = 0; i < queue.messages.length; i++) {
      if (queue.messages[i].priority < message.priority) {
        insertIndex = i;
        break;
      }
    }
    
    queue.messages.splice(insertIndex, 0, message);
  }
  
  /**
   * Find message by temp ID
   */
  private findMessage(tempId: string): QueuedMessage | undefined {
    for (const queue of this.queues.values()) {
      const message = queue.messages.find(m => m.tempId === tempId);
      if (message) {
        return message;
      }
    }
    
    return undefined;
  }
  
  /**
   * Clear retry timer for message
   */
  private clearRetryTimer(tempId: string): void {
    const timer = this.retryIntervals.get(tempId);
    if (timer) {
      clearTimeout(timer);
      this.retryIntervals.delete(tempId);
    }
  }
}

/**
 * Simple in-memory message queue implementation
 */
export class SimpleMessageQueue {
  private messages: QueuedMessage[] = [];
  
  /**
   * Add message to queue
   */
  enqueue(message: QueuedMessage): void {
    // Insert by priority
    let insertIndex = this.messages.length;
    
    for (let i = 0; i < this.messages.length; i++) {
      if (this.messages[i].priority < message.priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.messages.splice(insertIndex, 0, message);
  }
  
  /**
   * Get next message from queue
   */
  dequeue(): QueuedMessage | undefined {
    const now = Date.now();
    
    // Find first message that's ready to send
    for (let i = 0; i < this.messages.length; i++) {
      const message = this.messages[i];
      
      if (!message.scheduledAt || message.scheduledAt <= now) {
        this.messages.splice(i, 1);
        return message;
      }
    }
    
    return undefined;
  }
  
  /**
   * Peek at next message without removing it
   */
  peek(): QueuedMessage | undefined {
    const now = Date.now();
    
    for (const message of this.messages) {
      if (!message.scheduledAt || message.scheduledAt <= now) {
        return message;
      }
    }
    
    return undefined;
  }
  
  /**
   * Remove specific message
   */
  remove(tempId: string): boolean {
    const index = this.messages.findIndex(m => m.tempId === tempId);
    if (index !== -1) {
      this.messages.splice(index, 1);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get queue size
   */
  size(): number {
    return this.messages.length;
  }
  
  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.messages.length === 0;
  }
  
  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
  }
  
  /**
   * Get all messages (copy)
   */
  getAll(): QueuedMessage[] {
    return [...this.messages];
  }
}

/**
 * Utility functions for message queuing
 */

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number, baseDelay: number = 1000): number {
  return baseDelay * Math.pow(2, retryCount);
}

/**
 * Check if message should be retried
 */
export function shouldRetryMessage(message: QueuedMessage, maxRetries: number = 3): boolean {
  return message.retryCount < maxRetries;
}

/**
 * Create queued message from regular message
 */
export function createQueuedMessage(
  message: Omit<Message, 'id'>,
  priority: QueuePriority = QueuePriority.NORMAL,
  scheduledAt?: number
): QueuedMessage {
  return {
    tempId: uuidv4(),
    message,
    retryCount: 0,
    priority,
    scheduledAt
  };
}