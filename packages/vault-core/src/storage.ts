import { Database } from 'sql.js';
import { EncryptedRecord, Document, DatabaseSchema } from './types';
import { encryptData, decryptData, hashData } from './crypto';

interface DocumentRow {
  id: string;
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

/**
 * Core storage operations for encrypted SQLite database
 */

const SCHEMA_VERSION = 1;

const DATABASE_SCHEMA: DatabaseSchema = {
  version: SCHEMA_VERSION,
  tables: {
    documents: `
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        encrypted_data BLOB NOT NULL,
        nonce BLOB NOT NULL,
        checksum BLOB NOT NULL,
        size INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        sync_status TEXT DEFAULT 'local'
      )
    `,
    search_index: `
      CREATE TABLE IF NOT EXISTS search_index (
        document_id TEXT,
        field TEXT,
        content TEXT,
        tokens TEXT,
        PRIMARY KEY (document_id, field),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `,
    sync_state: `
      CREATE TABLE IF NOT EXISTS sync_state (
        actor_id TEXT PRIMARY KEY,
        clock INTEGER NOT NULL DEFAULT 0,
        last_sync_at INTEGER,
        state_hash TEXT
      )
    `,
    metadata: `
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `
  }
};

export class VaultStorage {
  private db: Database;
  private encryptionKey: Uint8Array;
  
  constructor(encryptionKey: Uint8Array, databaseData?: Uint8Array) {
    this.encryptionKey = encryptionKey;
    
    // Initialize SQL.js database
    const SQL = require('sql.js');
    this.db = new SQL.Database(databaseData);
    
    this.initializeSchema();
  }
  
  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    // Create tables
    this.db.exec(DATABASE_SCHEMA.tables.documents);
    this.db.exec(DATABASE_SCHEMA.tables.search_index);
    this.db.exec(DATABASE_SCHEMA.tables.sync_state);
    this.db.exec(DATABASE_SCHEMA.tables.metadata);
    
    // Create indexes for performance
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_sync_status ON documents(sync_status)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_search_tokens ON search_index(tokens)`);
    
    // Set schema version
    this.setMetadata('schema_version', SCHEMA_VERSION.toString());
  }
  
  /**
   * Store an encrypted document
   */
  async storeDocument(document: Document): Promise<void> {
    const encrypted = await this.encryptDocument(document);
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO documents 
      (id, type, encrypted_data, nonce, checksum, size, created_at, updated_at, version, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      document.id,
      document.type,
      encrypted.encryptedData,
      encrypted.nonce,
      encrypted.checksum,
      encrypted.metadata.size,
      document.createdAt,
      document.updatedAt,
      document.version,
      document.metadata.syncStatus || 'local'
    ]);
    
    stmt.free();
  }
  
  /**
   * Retrieve and decrypt a document
   */
  async getDocument(id: string): Promise<Document | null> {
    const stmt = this.db.prepare(`
      SELECT id, type, encrypted_data, nonce, checksum, size, created_at, updated_at, version, sync_status
      FROM documents WHERE id = ?
    `);
    
    const result = stmt.get([id]) as unknown as DocumentRow | undefined;
    stmt.free();
    
    if (!result) {
      return null;
    }
    
    const encrypted: EncryptedRecord = {
      id: result.id,
      encryptedData: new Uint8Array(result.encrypted_data),
      nonce: new Uint8Array(result.nonce),
      checksum: new Uint8Array(result.checksum),
      metadata: {
        type: result.type,
        size: result.size,
        timestamp: result.updated_at
      }
    };
    
    return this.decryptDocument(encrypted, {
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      version: result.version,
      syncStatus: result.sync_status
    });
  }
  
  /**
   * Get all documents of a specific type
   */
  async getDocumentsByType(type: string, limit?: number, offset?: number): Promise<Document[]> {
    let query = `
      SELECT id, type, encrypted_data, nonce, checksum, size, created_at, updated_at, version, sync_status
      FROM documents WHERE type = ?
      ORDER BY updated_at DESC
    `;
    
    const params: any[] = [type];
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    if (offset) {
      query += ' OFFSET ?';
      params.push(offset);
    }
    
    const stmt = this.db.prepare(query);
    const results = (stmt as any).all(params) as DocumentRow[];
    stmt.free();
    
    const documents: Document[] = [];
    for (const result of results) {
      const encrypted: EncryptedRecord = {
        id: result.id,
        encryptedData: new Uint8Array(result.encrypted_data),
        nonce: new Uint8Array(result.nonce),
        checksum: new Uint8Array(result.checksum),
        metadata: {
          type: result.type,
          size: result.size,
          timestamp: result.updated_at
        }
      };
      
      const document = await this.decryptDocument(encrypted, {
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        version: result.version,
        syncStatus: result.sync_status
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
  deleteDocument(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM documents WHERE id = ?');
    const result = stmt.run([id]) as unknown as { changes: number };
    stmt.free();
    
    // Also delete from search index
    const searchStmt = this.db.prepare('DELETE FROM search_index WHERE document_id = ?');
    searchStmt.run([id]);
    searchStmt.free();
    
    return result.changes > 0;
  }
  
  /**
   * Get document count by type
   */
  getDocumentCount(type?: string): number {
    let query = 'SELECT COUNT(*) as count FROM documents';
    const params: any[] = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    
    const stmt = this.db.prepare(query);
    const result = stmt.get(params) as unknown as { count: number };
    stmt.free();
    
    return result.count;
  }
  
  /**
   * Get vault statistics
   */
  getStats(): {
    documentCount: number;
    totalSize: number;
    encryptedSize: number;
    typeBreakdown: Record<string, number>;
  } {
    // Total document count
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM documents');
    const countResult = countStmt.get() as unknown as { count: number };
    countStmt.free();
    
    // Total sizes
    const sizeStmt = this.db.prepare('SELECT SUM(size) as total_size FROM documents');
    const sizeResult = sizeStmt.get() as unknown as { total_size: number };
    sizeStmt.free();
    
    // Type breakdown
    const typeStmt = this.db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM documents 
      GROUP BY type
    `);
    const typeResults = (typeStmt as any).all() as { type: string; count: number }[];
    typeStmt.free();
    
    const typeBreakdown: Record<string, number> = {};
    for (const result of typeResults) {
      typeBreakdown[result.type] = result.count;
    }
    
    return {
      documentCount: countResult.count,
      totalSize: sizeResult.total_size || 0,
      encryptedSize: this.getDatabaseSize(),
      typeBreakdown
    };
  }
  
  /**
   * Export database for backup
   */
  exportDatabase(): Uint8Array {
    return this.db.export();
  }
  
  /**
   * Set metadata key-value pair
   */
  setMetadata(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run([key, value, Date.now()]);
    stmt.free();
  }
  
  /**
   * Get metadata value
   */
  getMetadata(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM metadata WHERE key = ?');
    const result = stmt.get([key]) as unknown as { value: string } | undefined;
    stmt.free();
    
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
    const data = new TextEncoder().encode(serialized);
    
    const { ciphertext, nonce } = encryptData(data, this.encryptionKey);
    const checksum = hashData(ciphertext);
    
    return {
      id: document.id,
      encryptedData: ciphertext,
      nonce,
      checksum,
      metadata: {
        type: document.type,
        size: serialized.length,
        timestamp: document.updatedAt
      }
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
      // Verify checksum
      const computedChecksum = hashData(encrypted.encryptedData);
      if (!this.constantTimeEqual(encrypted.checksum, computedChecksum)) {
        throw new Error('Document checksum verification failed');
      }
      
      const decrypted = decryptData(encrypted.encryptedData, encrypted.nonce, this.encryptionKey);
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
   * Get database size in bytes
   */
  private getDatabaseSize(): number {
    return this.db.export().length;
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
}