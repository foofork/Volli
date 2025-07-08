import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DexieVaultStorage } from './dexie-adapter';
import { Document } from './types';
import { initCrypto, generateEncryptionKey } from './crypto';

describe('DexieVaultStorage', () => {
  let storage: DexieVaultStorage;
  let encryptionKey: Uint8Array;

  beforeEach(async () => {
    // Initialize crypto library
    await initCrypto();

    // Generate a test encryption key using the crypto module
    encryptionKey = generateEncryptionKey();

    // Create storage instance
    storage = await DexieVaultStorage.create(encryptionKey);
  });

  afterEach(async () => {
    // Clean up - clear all data before closing
    if (storage) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (storage as any).db;
      await db.documents.clear();
      await db.search_index.clear();
      await db.sync_state.clear();
      await db.metadata.clear();
      storage.close();
    }
  });

  describe('Document Storage', () => {
    it('should store and retrieve a document', async () => {
      const document: Document = {
        id: 'test-doc-1',
        type: 'test',
        data: {
          title: 'Test Document',
          content: 'This is a test document',
        },
        metadata: {
          tags: ['test', 'demo'],
          searchableText: 'test document content',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };

      // Store document
      await storage.storeDocument(document);

      // Retrieve document
      const retrieved = await storage.getDocument('test-doc-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(document.id);
      expect(retrieved?.type).toBe(document.type);
      expect(retrieved?.data).toEqual(document.data);
      expect(retrieved?.metadata.tags).toEqual(document.metadata.tags);
    });

    it('should return null for non-existent document', async () => {
      const retrieved = await storage.getDocument('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should update existing document', async () => {
      const document: Document = {
        id: 'test-doc-update',
        type: 'test',
        data: { content: 'Original content' },
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };

      // Store original
      await storage.storeDocument(document);

      // Update document
      const updated = {
        ...document,
        data: { content: 'Updated content' },
        updatedAt: Date.now(),
        version: 2,
      };
      await storage.storeDocument(updated);

      // Retrieve and verify
      const retrieved = await storage.getDocument('test-doc-update');
      expect(retrieved?.data.content).toBe('Updated content');
      expect(retrieved?.version).toBe(2);
    });
  });

  describe('Document Queries', () => {
    beforeEach(async () => {
      // Add test documents
      const docs: Document[] = [
        {
          id: 'doc1',
          type: 'note',
          data: { title: 'Note 1' },
          metadata: {},
          createdAt: Date.now() - 3000,
          updatedAt: Date.now() - 3000,
          version: 1,
        },
        {
          id: 'doc2',
          type: 'note',
          data: { title: 'Note 2' },
          metadata: {},
          createdAt: Date.now() - 2000,
          updatedAt: Date.now() - 2000,
          version: 1,
        },
        {
          id: 'doc3',
          type: 'task',
          data: { title: 'Task 1' },
          metadata: {},
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
          version: 1,
        },
      ];

      for (const doc of docs) {
        await storage.storeDocument(doc);
      }
    });

    it('should get documents by type', async () => {
      const notes = await storage.getDocumentsByType('note');
      expect(notes).toHaveLength(2);
      expect(notes[0].type).toBe('note');
      expect(notes[1].type).toBe('note');
    });

    it('should support limit and offset', async () => {
      const notes = await storage.getDocumentsByType('note', 1, 0);
      expect(notes).toHaveLength(1);

      const notesWithOffset = await storage.getDocumentsByType('note', 1, 1);
      expect(notesWithOffset).toHaveLength(1);
      expect(notesWithOffset[0].id).not.toBe(notes[0].id);
    });

    it('should count documents correctly', async () => {
      const totalCount = await storage.getDocumentCount();
      expect(totalCount).toBe(3);

      const noteCount = await storage.getDocumentCount('note');
      expect(noteCount).toBe(2);

      const taskCount = await storage.getDocumentCount('task');
      expect(taskCount).toBe(1);
    });
  });

  describe('Document Deletion', () => {
    it('should delete a document', async () => {
      const document: Document = {
        id: 'test-delete',
        type: 'test',
        data: { content: 'To be deleted' },
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };

      await storage.storeDocument(document);

      // Verify it exists
      let retrieved = await storage.getDocument('test-delete');
      expect(retrieved).toBeTruthy();

      // Delete it
      const success = await storage.deleteDocument('test-delete');
      expect(success).toBe(true);

      // Verify it's gone
      retrieved = await storage.getDocument('test-delete');
      expect(retrieved).toBeNull();
    });
  });

  describe('Metadata Operations', () => {
    it('should store and retrieve metadata', async () => {
      await storage.setMetadata('test-key', 'test-value');
      const value = await storage.getMetadata('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent metadata', async () => {
      const value = await storage.getMetadata('non-existent');
      expect(value).toBeNull();
    });

    it('should update existing metadata', async () => {
      await storage.setMetadata('update-key', 'original');
      await storage.setMetadata('update-key', 'updated');
      const value = await storage.getMetadata('update-key');
      expect(value).toBe('updated');
    });
  });

  describe('Statistics', () => {
    it('should calculate vault statistics', async () => {
      // Add some documents
      const docs: Document[] = [
        {
          id: 'stat1',
          type: 'note',
          data: { content: 'Note content here' },
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
        {
          id: 'stat2',
          type: 'note',
          data: { content: 'Another note' },
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
        {
          id: 'stat3',
          type: 'task',
          data: { content: 'Task content' },
          metadata: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
      ];

      for (const doc of docs) {
        await storage.storeDocument(doc);
      }

      const stats = await storage.getStats();

      expect(stats.documentCount).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.encryptedSize).toBeGreaterThan(stats.totalSize); // Encrypted is larger
      expect(stats.typeBreakdown).toEqual({
        note: 2,
        task: 1,
      });
    });
  });

  describe('Search Index', () => {
    it('should add and search by tokens', async () => {
      const document: Document = {
        id: 'search-doc',
        type: 'note',
        data: { content: 'This is searchable content' },
        metadata: { searchableText: 'searchable content test' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };

      await storage.storeDocument(document);
      await storage.addSearchIndex('search-doc', 'content', 'This is searchable content', [
        'searchable',
        'content',
        'test',
      ]);

      const results = await storage.searchByTokens(['searchable']);
      expect(results).toContain('search-doc');
    });
  });

  describe('Export/Import', () => {
    it('should export and import database', async () => {
      // Add test data
      const document: Document = {
        id: 'export-test',
        type: 'test',
        data: { content: 'Export test data' },
        metadata: { tags: ['export', 'test'] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };

      await storage.storeDocument(document);
      await storage.setMetadata('export-meta', 'meta-value');

      // Export
      const exportData = await storage.exportDatabase();
      expect(exportData).toBeInstanceOf(Uint8Array);
      expect(exportData.length).toBeGreaterThan(0);

      // Create new storage instance with same key
      const newStorage = await DexieVaultStorage.create(encryptionKey);

      // Import
      await newStorage.importDatabase(exportData);

      // Verify data was imported
      const imported = await newStorage.getDocument('export-test');
      expect(imported).toBeTruthy();
      expect(imported?.data.content).toBe('Export test data');

      const metaValue = await newStorage.getMetadata('export-meta');
      expect(metaValue).toBe('meta-value');

      newStorage.close();
    });

    it('should handle import errors gracefully', async () => {
      const invalidData = new TextEncoder().encode('invalid-data');

      await expect(storage.importDatabase(invalidData)).rejects.toThrow(
        'Failed to import database'
      );
    });
  });
});
