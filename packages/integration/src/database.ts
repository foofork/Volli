// @ts-ignore - Dexie will be available at runtime
import Dexie, { Table } from 'dexie';

export interface Vault {
  id: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Message {
  id?: number;
  conversationId: string;
  content: string;
  senderId: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  encryptedContent?: string;
}

export interface Contact {
  id: string;
  publicKey: string;
  displayName: string;
  addedAt: number;
  lastSeen?: number;
}

export interface Config {
  key: string;
  value: any;
}

export class VolliDB extends Dexie {
  vaults!: Table<Vault, string>;
  messages!: Table<Message, number>;
  contacts!: Table<Contact, string>;
  config!: Table<Config, string>;
  
  constructor() {
    super('VolliDB');
    
    this.version(1).stores({
      vaults: 'id, publicKey, createdAt',
      messages: '++id, conversationId, timestamp, senderId, [conversationId+timestamp]',
      contacts: 'id, publicKey, displayName, addedAt',
      config: 'key'
    });
  }
}