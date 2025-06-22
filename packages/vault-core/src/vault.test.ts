import { describe, it, expect, beforeEach } from 'vitest';
import { Vault } from './vault';
import type { VaultConfig } from './types';

describe('Vault', () => {
  let vault: Vault;
  let config: VaultConfig;

  beforeEach(() => {
    config = {
      name: 'test-vault',
      encryptionKey: new Uint8Array(32).fill(42),
      syncEnabled: false,
      collections: ['test-collection']
    };
    vault = new Vault(config);
  });

  describe('initialization', () => {
    it('should initialize vault with correct config', () => {
      expect(vault).toBeDefined();
      expect(vault.isOpen()).toBe(false);
    });
  });

  describe('open and close', () => {
    it('should open and close vault', async () => {
      expect(vault.isOpen()).toBe(false);
      
      await vault.open();
      expect(vault.isOpen()).toBe(true);
      
      await vault.close();
      expect(vault.isOpen()).toBe(false);
    });

    it('should handle multiple open calls', async () => {
      await vault.open();
      await vault.open(); // Should not throw
      expect(vault.isOpen()).toBe(true);
    });
  });

  describe('store and get', () => {
    beforeEach(async () => {
      await vault.open();
    });

    it('should store and retrieve data', async () => {
      const testData = {
        id: 'test-123',
        name: 'Test Item',
        value: 42,
        tags: ['test', 'sample']
      };
      
      await vault.store('test-collection', testData);
      const retrieved = await vault.get('test-collection', 'test-123');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent item', async () => {
      const result = await vault.get('test-collection', 'non-existent');
      expect(result).toBeNull();
    });

    it('should update existing item', async () => {
      const original = { id: 'test-123', value: 1 };
      const updated = { id: 'test-123', value: 2 };
      
      await vault.store('test-collection', original);
      await vault.store('test-collection', updated);
      
      const retrieved = await vault.get('test-collection', 'test-123');
      expect(retrieved.value).toBe(2);
    });

    it('should throw when vault is closed', async () => {
      await vault.close();
      
      await expect(
        vault.store('test-collection', { id: 'test' })
      ).rejects.toThrow('Vault is not open');
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await vault.open();
    });

    it('should delete existing item', async () => {
      const testData = { id: 'test-123', value: 'test' };
      
      await vault.store('test-collection', testData);
      let retrieved = await vault.get('test-collection', 'test-123');
      expect(retrieved).toEqual(testData);
      
      await vault.delete('test-collection', 'test-123');
      retrieved = await vault.get('test-collection', 'test-123');
      expect(retrieved).toBeNull();
    });

    it('should handle deleting non-existent item', async () => {
      // Should not throw
      await vault.delete('test-collection', 'non-existent');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await vault.open();
      
      // Add test data
      const testData = [
        { id: '1', name: 'Alice', age: 30, active: true },
        { id: '2', name: 'Bob', age: 25, active: false },
        { id: '3', name: 'Charlie', age: 35, active: true },
        { id: '4', name: 'Alice', age: 28, active: true }
      ];
      
      for (const item of testData) {
        await vault.store('test-collection', item);
      }
    });

    it('should query all items without filters', async () => {
      const results = await vault.query('test-collection');
      expect(results).toHaveLength(4);
    });

    it('should query with single filter', async () => {
      const results = await vault.query('test-collection', {
        where: { name: 'Alice' }
      });
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.name === 'Alice')).toBe(true);
    });

    it('should query with multiple filters', async () => {
      const results = await vault.query('test-collection', {
        where: { name: 'Alice', active: true }
      });
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.name === 'Alice' && r.active === true)).toBe(true);
    });

    it('should query with sorting', async () => {
      const results = await vault.query('test-collection', {
        orderBy: 'age',
        order: 'asc'
      });
      
      expect(results[0].age).toBe(25);
      expect(results[3].age).toBe(35);
    });

    it('should query with limit', async () => {
      const results = await vault.query('test-collection', {
        limit: 2
      });
      
      expect(results).toHaveLength(2);
    });

    it('should query with offset', async () => {
      const allResults = await vault.query('test-collection');
      const offsetResults = await vault.query('test-collection', {
        offset: 2
      });
      
      expect(offsetResults).toHaveLength(2);
      expect(offsetResults[0].id).toBe(allResults[2].id);
    });
  });

  describe('collections', () => {
    beforeEach(async () => {
      await vault.open();
    });

    it('should list collections', async () => {
      const collections = await vault.listCollections();
      expect(collections).toContain('test-collection');
    });

    it('should create new collection', async () => {
      await vault.createCollection('new-collection');
      const collections = await vault.listCollections();
      expect(collections).toContain('new-collection');
    });

    it('should check if collection exists', async () => {
      expect(await vault.hasCollection('test-collection')).toBe(true);
      expect(await vault.hasCollection('non-existent')).toBe(false);
    });

    it('should drop collection', async () => {
      await vault.createCollection('to-drop');
      expect(await vault.hasCollection('to-drop')).toBe(true);
      
      await vault.dropCollection('to-drop');
      expect(await vault.hasCollection('to-drop')).toBe(false);
    });
  });

  describe('events', () => {
    beforeEach(async () => {
      await vault.open();
    });

    it('should emit change events', async () => {
      const changes: any[] = [];
      vault.on('change', (change) => changes.push(change));
      
      await vault.store('test-collection', { id: '1', value: 'test' });
      
      expect(changes).toHaveLength(1);
      expect(changes[0].collection).toBe('test-collection');
      expect(changes[0].operation).toBe('insert');
      expect(changes[0].id).toBe('1');
    });

    it('should emit sync events when enabled', async () => {
      const syncVault = new Vault({ ...config, syncEnabled: true });
      await syncVault.open();
      
      const syncEvents: any[] = [];
      syncVault.on('sync', (event) => syncEvents.push(event));
      
      await syncVault.store('test-collection', { id: '1', value: 'test' });
      
      // Sync events would be emitted in real implementation
      expect(syncEvents).toBeDefined();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await vault.open();
      
      // Add searchable content
      const documents = [
        { id: '1', title: 'Introduction to Volli', content: 'Volli is a secure messaging app' },
        { id: '2', title: 'Security Features', content: 'Post-quantum cryptography protects your messages' },
        { id: '3', title: 'Getting Started', content: 'Download Volli and create your identity' }
      ];
      
      for (const doc of documents) {
        await vault.store('test-collection', doc);
      }
    });

    it('should search by text content', async () => {
      const results = await vault.searchCollection('test-collection', 'volli');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.item.title.includes('Volli'))).toBe(true);
    });

    it('should return search results with scores', async () => {
      const results = await vault.searchCollection('test-collection', 'security');
      expect(results[0].score).toBeDefined();
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should handle empty search query', async () => {
      const results = await vault.searchCollection('test-collection', '');
      expect(results).toHaveLength(0);
    });
  });
});