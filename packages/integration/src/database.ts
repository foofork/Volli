// @ts-ignore - Dexie will be available at runtime
import Dexie, { Table } from 'dexie';
import type { Message, Contact, Vault } from './types';

// Re-export types from types.ts
export type { Message, Contact, Vault } from './types';

export interface Config {
  key: string;
  value: any;
}

export interface QueuedMessage {
  id?: number;
  message: Message;
  attempts: number;
  lastAttempt?: number;
  nextRetry?: number;
  error?: string;
}

export class VolliDB extends Dexie {
  vaults!: Table<Vault, string>;
  messages!: Table<Message, number>;
  contacts!: Table<Contact, string>;
  config!: Table<Config, string>;
  messageQueue!: Table<QueuedMessage, number>;
  
  constructor() {
    super('VolliDB');
    
    this.version(1).stores({
      vaults: 'id, publicKey, createdAt',
      messages: '++id, conversationId, timestamp, senderId, [conversationId+timestamp]',
      contacts: 'id, publicKey, displayName, addedAt',
      config: 'key'
    });
    
    this.version(2).stores({
      vaults: 'id, publicKey, createdAt',
      messages: '++id, conversationId, timestamp, senderId, [conversationId+timestamp]',
      contacts: 'id, publicKey, displayName, addedAt',
      config: 'key',
      messageQueue: '++id, attempts, nextRetry'
    });
  }
}