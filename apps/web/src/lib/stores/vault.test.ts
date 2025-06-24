import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { vaultStore } from './vault';
import { authStore } from './auth';
import { createMockDatabase, clearAllDatabases } from '../../tests/setup/db-mock';
import { factories, fixtures } from '../../tests/setup/test-utils';

describe('VaultStore', () => {
  beforeEach(async () => {
    clearAllDatabases();
    authStore.logout();
    vaultStore.reset();
    
    // Setup authenticated state with unlocked vault
    await authStore.createIdentity('Test User');
    await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
  });

  describe('Initial State', () => {
    it('should start with default state', () => {
      const state = get(vaultStore);
      expect(state.isUnlocked).toBe(true); // Should match auth store
      expect(state.autoLockTimeout).toBe(15); // 15 minutes default
      expect(state.lastActivity).toBeDefined();
    });
  });

  describe('Vault Lock State', () => {
    it('should sync with auth store vault state', () => {
      expect(get(vaultStore).isUnlocked).toBe(true);
      
      authStore.lockVault();
      expect(get(vaultStore).isUnlocked).toBe(false);
      
      authStore.unlockVault(fixtures.validPassphrase);
      expect(get(vaultStore).isUnlocked).toBe(true);
    });
  });

  describe('getContacts', () => {
    it('should return empty array initially', async () => {
      const contacts = await vaultStore.getContacts();
      expect(contacts).toEqual([]);
    });

    it('should throw error if vault is locked', async () => {
      authStore.lockVault();
      
      await expect(vaultStore.getContacts()).rejects.toThrow('Vault is locked');
    });

    it('should return stored contacts', async () => {
      const contact = factories.contact();
      await vaultStore.addContact(contact);
      
      const contacts = await vaultStore.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toMatchObject(contact);
    });
  });

  describe('addContact', () => {
    it('should add a new contact', async () => {
      const contact = factories.contact({
        displayName: 'Alice',
        identityId: 'alice-id-123'
      });
      
      await vaultStore.addContact(contact);
      
      const contacts = await vaultStore.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].displayName).toBe('Alice');
    });

    it('should prevent duplicate contacts', async () => {
      const contact = factories.contact();
      
      await vaultStore.addContact(contact);
      await expect(vaultStore.addContact(contact)).rejects.toThrow('Contact already exists');
    });

    it('should update last activity', async () => {
      const before = get(vaultStore).lastActivity;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      await vaultStore.addContact(factories.contact());
      
      const after = get(vaultStore).lastActivity;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('getMessages', () => {
    it('should return empty array for new conversation', async () => {
      const messages = await vaultStore.getMessages('new-conversation');
      expect(messages).toEqual([]);
    });

    it('should return messages for existing conversation', async () => {
      const conversationId = 'test-conv-123';
      const message = factories.message({ conversationId });
      
      // Send a message to create the conversation
      await vaultStore.sendMessage(conversationId, message.content);
      
      const messages = await vaultStore.getMessages(conversationId);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(message.content);
    });

    it('should throw error if vault is locked', async () => {
      authStore.lockVault();
      
      await expect(vaultStore.getMessages('any-id')).rejects.toThrow('Vault is locked');
    });
  });

  describe('sendMessage', () => {
    it('should create and store a message', async () => {
      const conversationId = 'test-conv-123';
      const content = 'Hello, this is a test message';
      
      const message = await vaultStore.sendMessage(conversationId, content);
      
      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.conversationId).toBe(conversationId);
      expect(message.content).toBe(content);
      expect(message.timestamp).toBeDefined();
      expect(message.encrypted).toBe(true);
    });

    it('should add message to existing conversation', async () => {
      const conversationId = 'test-conv-123';
      
      await vaultStore.sendMessage(conversationId, 'First message');
      await vaultStore.sendMessage(conversationId, 'Second message');
      
      const messages = await vaultStore.getMessages(conversationId);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Second message');
    });

    it('should throw error if vault is locked', async () => {
      authStore.lockVault();
      
      await expect(vaultStore.sendMessage('any-id', 'content')).rejects.toThrow('Vault is locked');
    });
  });

  describe('storeFile', () => {
    it('should store a file and return file ID', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const fileId = await vaultStore.storeFile(file);
      
      expect(fileId).toBeDefined();
      expect(fileId).toMatch(/^file-/);
    });

    it('should enforce file size limit', async () => {
      const largeContent = new Array(11 * 1024 * 1024).join('a'); // 11MB
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      await expect(vaultStore.storeFile(file)).rejects.toThrow('File too large');
    });

    it('should store file metadata in vault', async () => {
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      
      const fileId = await vaultStore.storeFile(file);
      const files = await vaultStore.getFiles();
      
      expect(files).toHaveLength(1);
      expect(files[0]).toMatchObject({
        id: fileId,
        name: 'document.pdf',
        type: 'application/pdf',
        size: 4
      });
    });
  });

  describe('getFile', () => {
    it('should retrieve stored file', async () => {
      const originalContent = 'Hello World';
      const file = new File([originalContent], 'hello.txt', { type: 'text/plain' });
      
      const fileId = await vaultStore.storeFile(file);
      const retrievedFile = await vaultStore.getFile(fileId);
      
      expect(retrievedFile).toBeInstanceOf(Blob);
      expect(retrievedFile.type).toBe('text/plain');
      
      const content = await retrievedFile.text();
      expect(content).toBe(originalContent);
    });

    it('should throw error if file not found', async () => {
      await expect(vaultStore.getFile('non-existent')).rejects.toThrow('File not found');
    });

    it('should throw error if vault is locked', async () => {
      authStore.lockVault();
      
      await expect(vaultStore.getFile('any-id')).rejects.toThrow('Vault is locked');
    });
  });

  describe('updateSettings', () => {
    it('should update vault settings', async () => {
      await vaultStore.updateSettings({
        theme: 'dark',
        notifications: false
      });
      
      const settings = await vaultStore.getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.notifications).toBe(false);
    });

    it('should merge settings updates', async () => {
      // Set initial settings
      await vaultStore.updateSettings({
        theme: 'light',
        notifications: true,
        language: 'en'
      });
      
      // Update only theme
      await vaultStore.updateSettings({
        theme: 'dark'
      });
      
      const settings = await vaultStore.getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.notifications).toBe(true);
      expect(settings.language).toBe('en');
    });
  });

  describe('Activity Tracking', () => {
    it('should update last activity on vault operations', async () => {
      const operations = [
        () => vaultStore.getContacts(),
        () => vaultStore.addContact(factories.contact()),
        () => vaultStore.sendMessage('conv-123', 'test'),
        () => vaultStore.updateSettings({ theme: 'dark' })
      ];
      
      for (const operation of operations) {
        const before = get(vaultStore).lastActivity;
        await new Promise(resolve => setTimeout(resolve, 10));
        await operation();
        const after = get(vaultStore).lastActivity;
        expect(after).toBeGreaterThan(before);
      }
    });
  });

  describe('Data Persistence', () => {
    it('should persist data across vault locks', async () => {
      // Add data
      const contact = factories.contact();
      await vaultStore.addContact(contact);
      await vaultStore.sendMessage('conv-123', 'Test message');
      
      // Lock and unlock
      authStore.lockVault();
      await authStore.unlockVault(fixtures.validPassphrase);
      
      // Data should still be there
      const contacts = await vaultStore.getContacts();
      const messages = await vaultStore.getMessages('conv-123');
      
      expect(contacts).toHaveLength(1);
      expect(messages).toHaveLength(1);
    });
  });

  describe('SaveVault Error Handling', () => {
    it('should throw error when trying to save to locked vault', async () => {
      // Setup unlocked vault first
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Lock the vault
      authStore.lockVault();
      
      // Try to save to locked vault
      const testData = {
        version: 1,
        created: Date.now(),
        contacts: [],
        conversations: {},
        files: [],
        settings: { theme: 'dark', notifications: true }
      };
      
      await expect((vaultStore as any).saveVault(testData)).rejects.toThrow(
        'Cannot save to locked vault'
      );
    });
  });
  
  describe('GetFile Error Handling', () => {
    it('should throw error when file content is missing', async () => {
      // Setup vault
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Add file metadata without content
      const fileId = 'missing-content-file';
      const vaultData = await (vaultStore as any).getDecryptedVault();
      vaultData.files.push({
        id: fileId,
        name: 'test.txt',
        size: 100,
        type: 'text/plain',
        uploadedAt: Date.now()
      });
      await (vaultStore as any).saveVault(vaultData);
      
      // Try to get file with missing content
      await expect(vaultStore.getFile(fileId)).rejects.toThrow(
        'File content not found'
      );
    });
  });
  
  describe('Error Handling', () => {
    it('should handle vault not available error', async () => {
      // Directly set vault data to null in the store
      (vaultStore as any).vaultData = null;
      
      await expect(vaultStore.getContacts()).rejects.toThrow('Vault data not available');
      
      // Restore vault data
      vaultStore.reset();
    });

    it('should handle save failures gracefully', async () => {
      // Mock the saveVaultData method on authStore
      (authStore as any).saveVaultData = vi.fn().mockRejectedValue(new Error('Save failed'));
      
      const contact = factories.contact();
      await expect(vaultStore.addContact(contact)).rejects.toThrow('Save failed');
      
      // Clean up mock
      delete (authStore as any).saveVaultData;
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Reset vault to clear any existing data
      vaultStore.reset();
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Add test data with unique IDs
      await vaultStore.addContact(factories.contact({ 
        id: 'alice-id',
        identityId: 'alice-identity',
        displayName: 'Alice Smith' 
      }));
      await vaultStore.addContact(factories.contact({ 
        id: 'bob-id',
        identityId: 'bob-identity',
        displayName: 'Bob Jones' 
      }));
      await vaultStore.addContact(factories.contact({ 
        id: 'charlie-id',
        identityId: 'charlie-identity',
        displayName: 'Charlie Smith' 
      }));
    });

    it('should search contacts by name', async () => {
      const results = await vaultStore.searchContacts('Smith');
      expect(results).toHaveLength(2);
      expect(results.map(c => c.displayName)).toContain('Alice Smith');
      expect(results.map(c => c.displayName)).toContain('Charlie Smith');
    });

    it('should search messages by content', async () => {
      await vaultStore.sendMessage('conv-1', 'Hello world');
      await vaultStore.sendMessage('conv-1', 'Goodbye world');
      await vaultStore.sendMessage('conv-2', 'Hello there');
      
      const results = await vaultStore.searchMessages('Hello');
      expect(results).toHaveLength(2);
    });
  });
  
  describe('Initialize Function', () => {
    it('should sync isUnlocked state with auth store on initialization', async () => {
      // Reset and setup initial state
      vaultStore.reset();
      authStore.logout();
      
      // Create identity and unlock vault
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Auth store shows vault unlocked
      expect(get(authStore).vaultUnlocked).toBe(true);
      
      // Vault store might not be synced yet
      const beforeState = get(vaultStore);
      
      // Call initialize to sync states
      await vaultStore.initialize();
      
      // Now vault store should reflect the auth store state
      const afterState = get(vaultStore);
      expect(afterState.isUnlocked).toBe(true);
    });
    
    it('should not unlock if auth store is not authenticated', async () => {
      // Reset both stores
      vaultStore.reset();
      authStore.logout();
      
      // Call initialize when not authenticated
      await vaultStore.initialize();
      
      const state = get(vaultStore);
      expect(state.isUnlocked).toBe(false);
    });
  });
  
  describe('Lock Function', () => {
    it('should delegate to auth store lockVault', async () => {
      // Setup unlocked vault
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Spy on auth store lockVault
      const lockVaultSpy = vi.spyOn(authStore, 'lockVault');
      
      // Call vault store lock
      await vaultStore.lock();
      
      // Verify it delegated to auth store
      expect(lockVaultSpy).toHaveBeenCalled();
      
      // Both stores should show locked state
      expect(get(authStore).vaultUnlocked).toBe(false);
      expect(get(vaultStore).isUnlocked).toBe(false);
      
      lockVaultSpy.mockRestore();
    });
  });
});