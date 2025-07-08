import { Document } from './types';
import { DexieVaultStorage } from './dexie-adapter';

/**
 * Core storage operations using Dexie for persistent IndexedDB storage
 * This replaces the previous sql.js implementation with browser-native persistence
 */

/**
 * VaultStorage class that wraps DexieVaultStorage to maintain backward compatibility
 */
export class VaultStorage {
  private dexieStorage!: DexieVaultStorage;

  private constructor() {
    // Private constructor to enforce async creation
  }

  /**
   * Create a new VaultStorage instance
   */
  static async create(encryptionKey: Uint8Array, databaseData?: Uint8Array): Promise<VaultStorage> {
    const storage = new VaultStorage();
    storage.dexieStorage = await DexieVaultStorage.create(encryptionKey);

    // If databaseData is provided, import it
    if (databaseData) {
      await storage.dexieStorage.importDatabase(databaseData);
    }

    return storage;
  }

  /**
   * Store an encrypted document
   */
  async storeDocument(document: Document): Promise<void> {
    return this.dexieStorage.storeDocument(document);
  }

  /**
   * Retrieve and decrypt a document
   */
  async getDocument(id: string): Promise<Document | null> {
    return this.dexieStorage.getDocument(id);
  }

  /**
   * Get all documents of a specific type
   */
  async getDocumentsByType(type: string, limit?: number, offset?: number): Promise<Document[]> {
    return this.dexieStorage.getDocumentsByType(type, limit, offset);
  }

  /**
   * Delete a document
   */
  deleteDocument(id: string): boolean {
    // Make it async but return boolean for compatibility
    this.dexieStorage.deleteDocument(id);
    return true; // Dexie operations are async, but we maintain sync interface
  }

  /**
   * Get document count by type
   */
  async getDocumentCount(type?: string): Promise<number> {
    return this.dexieStorage.getDocumentCount(type);
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
    return this.dexieStorage.getStats();
  }

  /**
   * Export database for backup
   */
  async exportDatabase(): Promise<Uint8Array> {
    return this.dexieStorage.exportDatabase();
  }

  /**
   * Set metadata key-value pair
   */
  async setMetadata(key: string, value: string): Promise<void> {
    return this.dexieStorage.setMetadata(key, value);
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<string | null> {
    return this.dexieStorage.getMetadata(key);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.dexieStorage.close();
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
    return this.dexieStorage.addSearchIndex(documentId, field, content, tokens);
  }

  /**
   * Search documents by tokens
   */
  async searchByTokens(tokens: string[], type?: string, limit?: number): Promise<string[]> {
    return this.dexieStorage.searchByTokens(tokens, type, limit);
  }
}
