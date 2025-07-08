import Dexie, { Table } from 'dexie';
import { EncryptedRecord, Document } from './types';
import { encryptData, decryptData, hashData } from './crypto';

/**
 * Dexie database schema for encrypted document storage
 */
interface DexieDocument {
  id?: string;
  type: string;
  encrypted_data: Uint8Array;
  nonce: Uint8Array;
  checksum: Uint8Array;
  size: number;
  created_at: number;
  updated_at: number;
  version: number;
  sync_status: string;
}

interface DexieSearchIndex {
  id?: number;
  document_id: string;
  field: string;
  content: string;
  tokens: string;
}

interface DexieSyncState {
  actor_id: string;
  clock: number;
  last_sync_at?: number;
  state_hash?: string;
}

interface DexieMetadata {
  key: string;
  value: string;
  updated_at: number;
}

export class VaultDatabase extends Dexie {
  documents!: Table<DexieDocument>;
  search_index!: Table<DexieSearchIndex>;
  sync_state!: Table<DexieSyncState>;
  metadata!: Table<DexieMetadata>;

  constructor() {
    super('volli-vault');

    this.version(1).stores({
      documents: 'id, type, updated_at, sync_status',
      search_index: '++id, document_id, [document_id+field], tokens',
      sync_state: 'actor_id',
      metadata: 'key',
    });
  }
}

/**
 * Dexie-based storage adapter for encrypted documents
 * Replaces sql.js with persistent IndexedDB storage
 */
export class DexieVaultStorage {
  private db: VaultDatabase;
  private encryptionKey: Uint8Array;

  private constructor(encryptionKey: Uint8Array) {
    this.encryptionKey = encryptionKey;
    this.db = new VaultDatabase();
  }

  /**
   * Create a new DexieVaultStorage instance
   */
  static async create(encryptionKey: Uint8Array): Promise<DexieVaultStorage> {
    const storage = new DexieVaultStorage(encryptionKey);
    await storage.initializeSchema();
    return storage;
  }

  /**
   * Initialize database schema
   */
  private async initializeSchema(): Promise<void> {
    // Check if schema version exists
    const schemaVersion = await this.getMetadata('schema_version');
    if (!schemaVersion) {
      // Set initial schema version
      await this.setMetadata('schema_version', '1');
    }
  }

  /**
   * Store an encrypted document
   */
  async storeDocument(document: Document): Promise<void> {
    const encrypted = await this.encryptDocument(document);

    const dexieDoc: DexieDocument = {
      id: document.id,
      type: document.type,
      encrypted_data: encrypted.encryptedData,
      nonce: encrypted.nonce,
      checksum: encrypted.checksum,
      size: encrypted.metadata.size,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
      version: document.version,
      sync_status: document.metadata.syncStatus || 'local',
    };

    await this.db.documents.put(dexieDoc);
  }

  /**
   * Retrieve and decrypt a document
   */
  async getDocument(id: string): Promise<Document | null> {
    const result = await this.db.documents.get(id);

    if (!result) {
      return null;
    }

    const encrypted: EncryptedRecord = {
      id: result.id!,
      encryptedData: new Uint8Array(result.encrypted_data),
      nonce: new Uint8Array(result.nonce),
      checksum: new Uint8Array(result.checksum),
      metadata: {
        type: result.type,
        size: result.size,
        timestamp: result.updated_at,
      },
    };

    return this.decryptDocument(encrypted, {
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      version: result.version,
      syncStatus: result.sync_status,
    });
  }

  /**
   * Get all documents of a specific type
   */
  async getDocumentsByType(type: string, limit?: number, offset?: number): Promise<Document[]> {
    let query = this.db.documents.where('type').equals(type).reverse(); // Order by updated_at DESC (due to index)

    if (offset) {
      query = query.offset(offset);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const results = await query.toArray();

    const documents: Document[] = [];
    for (const result of results) {
      const encrypted: EncryptedRecord = {
        id: result.id!,
        encryptedData: result.encrypted_data,
        nonce: result.nonce,
        checksum: result.checksum,
        metadata: {
          type: result.type,
          size: result.size,
          timestamp: result.updated_at,
        },
      };

      const document = await this.decryptDocument(encrypted, {
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        version: result.version,
        syncStatus: result.sync_status,
      });

      if (document) {
        documents.push(document);
      }
    }

    return documents;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<boolean> {
    try {
      // Delete from documents table
      await this.db.documents.delete(id);

      // Delete from search index
      await this.db.search_index.where('document_id').equals(id).delete();

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get document count by type
   */
  async getDocumentCount(type?: string): Promise<number> {
    if (type) {
      return await this.db.documents.where('type').equals(type).count();
    } else {
      return await this.db.documents.count();
    }
  }

  /**
   * Get vault statistics
   */
  async getStats(): Promise<{
    documentCount: number;
    totalSize: number;
    encryptedSize: number;
    typeBreakdown: Record<string, number>;
  }> {
    // Total document count
    const documentCount = await this.db.documents.count();

    // Total size calculation
    const documents = await this.db.documents.toArray();
    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

    // Type breakdown
    const typeBreakdown: Record<string, number> = {};
    const types = await this.db.documents.orderBy('type').uniqueKeys();

    for (const type of types) {
      if (typeof type === 'string') {
        typeBreakdown[type] = await this.db.documents.where('type').equals(type).count();
      }
    }

    // Estimate encrypted size (sum of all encrypted data)
    const encryptedSize = documents.reduce(
      (sum, doc) => sum + doc.encrypted_data.length + doc.nonce.length + doc.checksum.length,
      0
    );

    return {
      documentCount,
      totalSize,
      encryptedSize,
      typeBreakdown,
    };
  }

  /**
   * Export database for backup
   */
  async exportDatabase(): Promise<Uint8Array> {
    // Export all data as JSON and encrypt it
    const documents = await this.db.documents.toArray();
    const searchIndex = await this.db.search_index.toArray();
    const syncState = await this.db.sync_state.toArray();
    const metadata = await this.db.metadata.toArray();

    // Convert Uint8Arrays to regular arrays for JSON serialization
    const exportDocuments = documents.map((doc) => ({
      ...doc,
      encrypted_data: Array.from(doc.encrypted_data),
      nonce: Array.from(doc.nonce),
      checksum: Array.from(doc.checksum),
    }));

    const exportData = {
      version: 1,
      timestamp: Date.now(),
      documents: exportDocuments,
      searchIndex,
      syncState,
      metadata,
    };

    const serialized = JSON.stringify(exportData);
    const encoder = new TextEncoder();
    const data = encoder.encode(serialized);

    // Ensure data is a proper Uint8Array
    const dataArray = new Uint8Array(data);
    const keyArray = new Uint8Array(this.encryptionKey);

    // Encrypt the entire export
    const { ciphertext, nonce } = encryptData(dataArray, keyArray);

    // Create a container with metadata
    const container = {
      version: 1,
      nonce: Array.from(nonce),
      data: Array.from(ciphertext),
    };

    const containerBytes = new TextEncoder().encode(JSON.stringify(container));
    return new Uint8Array(containerBytes);
  }

  /**
   * Import database from backup
   */
  async importDatabase(backup: Uint8Array): Promise<void> {
    try {
      const containerStr = new TextDecoder().decode(backup);
      const container = JSON.parse(containerStr);

      const nonce = new Uint8Array(container.nonce);
      const ciphertext = new Uint8Array(container.data);

      // Decrypt the backup
      const decrypted = decryptData(ciphertext, nonce, this.encryptionKey);
      const exportData = JSON.parse(new TextDecoder().decode(decrypted));

      // Clear existing data
      await this.db.documents.clear();
      await this.db.search_index.clear();
      await this.db.sync_state.clear();
      await this.db.metadata.clear();

      // Import data - convert arrays back to Uint8Array
      if (exportData.documents?.length > 0) {
        const documents = exportData.documents.map(
          (doc: {
            encrypted_data: number[];
            nonce: number[];
            checksum: number[];
            [key: string]: unknown;
          }) => ({
            ...doc,
            encrypted_data: new Uint8Array(doc.encrypted_data),
            nonce: new Uint8Array(doc.nonce),
            checksum: new Uint8Array(doc.checksum),
          })
        );
        await this.db.documents.bulkPut(documents);
      }
      if (exportData.searchIndex?.length > 0) {
        await this.db.search_index.bulkPut(exportData.searchIndex);
      }
      if (exportData.syncState?.length > 0) {
        await this.db.sync_state.bulkPut(exportData.syncState);
      }
      if (exportData.metadata?.length > 0) {
        await this.db.metadata.bulkPut(exportData.metadata);
      }
    } catch (error) {
      throw new Error(`Failed to import database: ${error}`);
    }
  }

  /**
   * Set metadata key-value pair
   */
  async setMetadata(key: string, value: string): Promise<void> {
    await this.db.metadata.put({
      key,
      value,
      updated_at: Date.now(),
    });
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<string | null> {
    const result = await this.db.metadata.get(key);
    return result ? result.value : null;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Encrypt document for storage
   */
  private async encryptDocument(document: Document): Promise<EncryptedRecord> {
    const serialized = JSON.stringify(document);
    const encoder = new TextEncoder();
    const data = encoder.encode(serialized);

    // Ensure data is a proper Uint8Array
    const dataArray = new Uint8Array(data);
    const keyArray = new Uint8Array(this.encryptionKey);

    const { ciphertext, nonce } = encryptData(dataArray, keyArray);
    const checksum = hashData(ciphertext);

    return {
      id: document.id,
      encryptedData: ciphertext,
      nonce,
      checksum,
      metadata: {
        type: document.type,
        size: serialized.length,
        timestamp: document.updatedAt,
      },
    };
  }

  /**
   * Decrypt document from storage
   */
  private async decryptDocument(
    encrypted: EncryptedRecord,
    metadata: { createdAt: number; updatedAt: number; version: number; syncStatus: string }
  ): Promise<Document | null> {
    try {
      // Ensure all data is proper Uint8Array
      const encryptedData = new Uint8Array(encrypted.encryptedData);
      const nonce = new Uint8Array(encrypted.nonce);
      const checksum = new Uint8Array(encrypted.checksum);

      // Verify checksum
      const computedChecksum = hashData(encryptedData);
      if (!this.constantTimeEqual(checksum, computedChecksum)) {
        throw new Error('Document checksum verification failed');
      }

      const decrypted = decryptData(encryptedData, nonce, this.encryptionKey);
      const serialized = new TextDecoder().decode(decrypted);
      const document = JSON.parse(serialized);

      // Ensure metadata is properly set
      document.createdAt = metadata.createdAt;
      document.updatedAt = metadata.updatedAt;
      document.version = metadata.version;
      document.metadata.syncStatus = metadata.syncStatus;

      return document;
    } catch (error) {
      console.error('Failed to decrypt document:', error);
      return null;
    }
  }

  /**
   * Constant-time comparison for checksums
   */
  private constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }

  /**
   * Add search index entry
   */
  async addSearchIndex(
    documentId: string,
    field: string,
    content: string,
    tokens: string[]
  ): Promise<void> {
    await this.db.search_index.put({
      document_id: documentId,
      field,
      content,
      tokens: tokens.join(' '),
    });
  }

  /**
   * Search documents by tokens
   */
  async searchByTokens(tokens: string[], type?: string, limit?: number): Promise<string[]> {
    // First, find matching document IDs from search index
    const searchResults = await this.db.search_index
      .filter((entry) => {
        return tokens.some((token) => entry.tokens.includes(token));
      })
      .toArray();

    // Get unique document IDs
    const documentIds = [...new Set(searchResults.map((r) => r.document_id))];

    // If type filter is specified, filter by type
    if (type && documentIds.length > 0) {
      const documents = await this.db.documents
        .where('id')
        .anyOf(documentIds)
        .and((doc) => doc.type === type)
        .limit(limit || 100)
        .toArray();

      return documents.map((doc) => doc.id!);
    }

    // Return limited results
    return documentIds.slice(0, limit || 100);
  }
}
