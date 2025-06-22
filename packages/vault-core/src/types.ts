/**
 * Type definitions for Volli vault-core
 * Encrypted local storage with CRDT synchronization
 */

export interface VaultConfig {
  databasePath?: string;
  encryptionKey: Uint8Array;
  maxMemoryUsage?: number;
  syncEnabled?: boolean;
  searchEnabled?: boolean;
}

export interface Document {
  id: string;
  type: string;
  data: Record<string, any>;
  metadata: DocumentMetadata;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface DocumentMetadata {
  tags?: string[];
  searchableText?: string;
  contentHash?: string;
  syncStatus?: SyncStatus;
  lastSyncAt?: number;
}

export enum SyncStatus {
  LOCAL = 'local',
  SYNCING = 'syncing', 
  SYNCED = 'synced',
  CONFLICT = 'conflict',
  ERROR = 'error'
}

export interface VaultStats {
  documentCount: number;
  totalSize: number;
  encryptedSize: number;
  lastBackupAt?: number;
  lastSyncAt?: number;
  syncStatus: SyncStatus;
}

export interface SearchOptions {
  query: string;
  type?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  document: Document;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  field: string;
  value: string;
  highlight: string;
}

export interface BackupData {
  version: number;
  timestamp: number;
  encryptedData: Uint8Array;
  checksum: Uint8Array;
  documentCount: number;
}

export interface SyncChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  document?: Document;
  timestamp: number;
  hash: string;
}

export interface CRDTState {
  actorId: string;
  clock: number;
  changes: SyncChange[];
  lastMergeAt: number;
}

export interface EncryptedRecord {
  id: string;
  encryptedData: Uint8Array;
  nonce: Uint8Array;
  checksum: Uint8Array;
  metadata: {
    type: string;
    size: number;
    timestamp: number;
  };
}

export interface DatabaseSchema {
  version: number;
  tables: {
    documents: string;
    search_index: string;
    sync_state: string;
    metadata: string;
  };
}

export interface VaultEvents {
  'document:created': (document: Document) => void;
  'document:updated': (document: Document, previousVersion: Document) => void;
  'document:deleted': (documentId: string) => void;
  'sync:started': () => void;
  'sync:completed': (changes: SyncChange[]) => void;
  'sync:error': (error: Error) => void;
  'backup:created': (backup: BackupData) => void;
  'vault:error': (error: Error) => void;
}

export interface QueryBuilder {
  where(field: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE', value: any): QueryBuilder;
  and(field: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE', value: any): QueryBuilder;
  or(field: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE', value: any): QueryBuilder;
  orderBy(field: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  execute(): Promise<Document[]>;
}