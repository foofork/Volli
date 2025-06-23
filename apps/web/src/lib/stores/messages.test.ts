import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { messagesStore } from './messages';
import { authStore } from './auth';
import { vaultStore } from './vault';
import { clearAllDatabases } from '../../tests/setup/db-mock';
import { factories, fixtures } from '../../tests/setup/test-utils';

describe('MessagesStore', () => {
  beforeEach(async () => {
    clearAllDatabases();
    authStore.logout();
    vaultStore.reset();
    messagesStore.reset();
    
    // Setup authenticated state with unlocked vault
    await authStore.createIdentity('Test User');
    await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
  });

  describe('Initial State', () => {
    it('should start with empty conversations', () => {
      const state = get(messagesStore);
      expect(state.conversations).toEqual([]);
      expect(state.activeConversation).toBe(null);
      expect(state.syncStatus).toBe('idle');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadConversations', () => {
    it('should load conversations from vault', async () => {
      // Add some test messages to vault with different timestamps
      await vaultStore.sendMessage('conv-1', 'Hello');
      await new Promise(resolve => setTimeout(resolve, 10)); // Add delay
      await vaultStore.sendMessage('conv-2', 'Hi there');
      
      await messagesStore.loadConversations();
      
      const state = get(messagesStore);
      expect(state.conversations).toHaveLength(2);
      expect(state.conversations[0].id).toBe('conv-2'); // Most recent first
      expect(state.conversations[1].id).toBe('conv-1');
    });

    it('should throw error if vault is locked', async () => {
      authStore.lockVault();
      
      await expect(messagesStore.loadConversations()).rejects.toThrow('Vault must be unlocked');
    });

    it('should sort conversations by last activity', async () => {
      // Create messages with different timestamps
      await vaultStore.sendMessage('old-conv', 'Old message');
      await new Promise(resolve => setTimeout(resolve, 10));
      await vaultStore.sendMessage('new-conv', 'New message');
      
      await messagesStore.loadConversations();
      
      const state = get(messagesStore);
      expect(state.conversations[0].id).toBe('new-conv');
      expect(state.conversations[1].id).toBe('old-conv');
    });

    it('should trigger sync if online', async () => {
      // Mock online status
      (messagesStore as any).networkStore = { isOnline: true };
      const syncSpy = vi.spyOn(messagesStore, 'syncMessages').mockResolvedValue();
      
      await messagesStore.loadConversations();
      
      expect(syncSpy).toHaveBeenCalled();
      syncSpy.mockRestore();
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const participants = ['alice-id', 'bob-id'];
      
      const conversation = await messagesStore.createConversation(participants);
      
      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.participants).toContain('test-identity-123'); // Current user
      expect(conversation.participants).toContain('alice-id');
      expect(conversation.participants).toContain('bob-id');
      expect(conversation.messages).toEqual([]);
    });

    it('should throw error if no participants provided', async () => {
      await expect(messagesStore.createConversation([])).rejects.toThrow(
        'Conversation must have participants'
      );
    });

    it('should add conversation to store', async () => {
      await messagesStore.createConversation(['alice-id']);
      
      const state = get(messagesStore);
      expect(state.conversations).toHaveLength(1);
    });

    it('should set new conversation as active', async () => {
      const conversation = await messagesStore.createConversation(['alice-id']);
      
      const state = get(messagesStore);
      expect(state.activeConversation).toBe(conversation.id);
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      // Create a conversation to send messages in
      await messagesStore.createConversation(['alice-id']);
    });

    it('should send a message in active conversation', async () => {
      const content = 'Hello, world!';
      
      await messagesStore.sendMessage(content);
      
      const state = get(messagesStore);
      const conversation = state.conversations[0];
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].content).toBe(content);
    });

    it('should throw error if no active conversation', async () => {
      const state = get(messagesStore);
      (messagesStore as any).activeConversation = null;
      
      await expect(messagesStore.sendMessage('test')).rejects.toThrow(
        'No active conversation'
      );
    });

    it('should encrypt message for each participant', async () => {
      // Mock contact store
      const mockGetPublicKey = vi.fn().mockResolvedValue('mock-public-key');
      (messagesStore as any).contactStore = { getPublicKey: mockGetPublicKey };
      
      await messagesStore.sendMessage('Secret message');
      
      expect(mockGetPublicKey).toHaveBeenCalledWith('alice-id');
    });

    it('should update conversation last activity', async () => {
      const before = get(messagesStore).conversations[0].lastActivity;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      await messagesStore.sendMessage('New message');
      
      const after = get(messagesStore).conversations[0].lastActivity;
      expect(after).toBeGreaterThan(before);
    });

    it('should queue message for delivery if offline', async () => {
      (messagesStore as any).networkStore = { isOnline: false };
      const enqueueSpy = vi.fn();
      (messagesStore as any).messageQueue = { enqueue: enqueueSpy };
      
      await messagesStore.sendMessage('Offline message');
      
      expect(enqueueSpy).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation messages as read', async () => {
      const conversation = await messagesStore.createConversation(['alice-id']);
      await messagesStore.sendMessage('Message 1');
      await messagesStore.sendMessage('Message 2');
      
      // Simulate unread messages
      const state = get(messagesStore);
      state.conversations[0].unreadCount = 2;
      
      await messagesStore.markAsRead(conversation.id);
      
      const newState = get(messagesStore);
      expect(newState.conversations[0].unreadCount).toBe(0);
    });

    it('should do nothing if conversation not found', async () => {
      await expect(messagesStore.markAsRead('non-existent')).resolves.not.toThrow();
    });
  });

  describe('syncMessages', () => {
    it('should sync messages with remote endpoint', async () => {
      // Mock sync endpoint
      const mockEndpoint = {
        getMessages: vi.fn().mockResolvedValue([
          {
            id: 'remote-msg-1',
            conversationId: 'conv-1',
            content: 'Remote message',
            sender: 'alice-id',
            timestamp: Date.now()
          }
        ])
      };
      
      (messagesStore as any).networkStore = {
        isOnline: true,
        getSyncEndpoint: vi.fn().mockResolvedValue(mockEndpoint)
      };
      
      await messagesStore.syncMessages();
      
      expect(mockEndpoint.getMessages).toHaveBeenCalled();
      const state = get(messagesStore);
      expect(state.syncStatus).toBe('synced');
    });

    it('should handle sync errors gracefully', async () => {
      (messagesStore as any).networkStore = {
        isOnline: true,
        getSyncEndpoint: vi.fn().mockRejectedValue(new Error('Network error'))
      };
      
      await messagesStore.syncMessages();
      
      const state = get(messagesStore);
      expect(state.syncStatus).toBe('error');
    });

    it('should send pending messages during sync', async () => {
      const mockDeliver = vi.fn().mockResolvedValue(true);
      const mockQueue = {
        getPending: vi.fn().mockResolvedValue([
          factories.message({ id: 'pending-1' })
        ]),
        markDelivered: vi.fn()
      };
      
      (messagesStore as any).messageQueue = mockQueue;
      (messagesStore as any).deliverMessage = mockDeliver;
      (messagesStore as any).networkStore = {
        isOnline: true,
        getSyncEndpoint: vi.fn().mockResolvedValue({
          getMessages: vi.fn().mockResolvedValue([])
        })
      };
      
      await messagesStore.syncMessages();
      
      expect(mockDeliver).toHaveBeenCalled();
      expect(mockQueue.markDelivered).toHaveBeenCalledWith('pending-1');
    });
  });

  describe('setActiveConversation', () => {
    it('should set active conversation', async () => {
      const conv1 = await messagesStore.createConversation(['alice-id']);
      const conv2 = await messagesStore.createConversation(['bob-id']);
      
      messagesStore.setActiveConversation(conv2.id);
      
      const state = get(messagesStore);
      expect(state.activeConversation).toBe(conv2.id);
    });

    it('should clear active conversation with null', () => {
      messagesStore.setActiveConversation(null);
      
      const state = get(messagesStore);
      expect(state.activeConversation).toBe(null);
    });
  });

  describe('searchMessages', () => {
    beforeEach(async () => {
      // Create test data
      const conv1 = await messagesStore.createConversation(['alice-id']);
      messagesStore.setActiveConversation(conv1.id);
      await messagesStore.sendMessage('Hello world');
      await messagesStore.sendMessage('Goodbye world');
      
      const conv2 = await messagesStore.createConversation(['bob-id']);
      messagesStore.setActiveConversation(conv2.id);
      await messagesStore.sendMessage('Hello there');
    });

    it('should search messages across all conversations', async () => {
      const results = await messagesStore.searchMessages('Hello');
      
      expect(results).toHaveLength(2);
      expect(results[0].content).toContain('Hello');
      expect(results[1].content).toContain('Hello');
    });

    it('should return empty array for no matches', async () => {
      const results = await messagesStore.searchMessages('xyz');
      
      expect(results).toEqual([]);
    });
  });

  describe('Message Encryption', () => {
    it('should encrypt outgoing messages', async () => {
      const mockEncrypt = vi.fn().mockResolvedValue('encrypted-content');
      (messagesStore as any).encryptForRecipient = mockEncrypt;
      (messagesStore as any).contactStore = {
        getPublicKey: vi.fn().mockResolvedValue('public-key')
      };
      
      await messagesStore.createConversation(['alice-id']);
      await messagesStore.sendMessage('Secret');
      
      expect(mockEncrypt).toHaveBeenCalledWith('Secret', 'public-key');
    });

    it('should decrypt incoming messages', async () => {
      const mockDecrypt = vi.fn().mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Decrypted message',
        sender: 'alice-id',
        timestamp: Date.now()
      });
      
      (messagesStore as any).decryptIncomingMessage = mockDecrypt;
      (messagesStore as any).networkStore = {
        isOnline: true,
        getSyncEndpoint: vi.fn().mockResolvedValue({
          getMessages: vi.fn().mockResolvedValue([
            { encrypted: 'encrypted-data' }
          ])
        })
      };
      
      await messagesStore.syncMessages();
      
      expect(mockDecrypt).toHaveBeenCalledWith({ encrypted: 'encrypted-data' });
    });
  });

  describe('Error Handling', () => {
    it('should handle vault errors gracefully', async () => {
      vi.spyOn(vaultStore, 'getMessages').mockRejectedValue(new Error('Vault error'));
      
      await expect(messagesStore.loadConversations()).rejects.toThrow('Vault error');
      
      const state = get(messagesStore);
      expect(state.error).toBe('Failed to load conversations: Vault error');
    });

    it('should handle network errors during send', async () => {
      await messagesStore.createConversation(['alice-id']);
      
      (messagesStore as any).deliverMessage = vi.fn().mockRejectedValue(new Error('Network error'));
      (messagesStore as any).networkStore = { isOnline: true };
      
      // Should not throw, but queue for retry
      await expect(messagesStore.sendMessage('Test')).resolves.not.toThrow();
    });
  });

  describe('Conversation Management', () => {
    it('should find or create conversation', async () => {
      const participants = ['alice-id'];
      
      // First call creates
      const conv1 = await messagesStore.findOrCreateConversation(participants);
      
      // Second call finds existing
      const conv2 = await messagesStore.findOrCreateConversation(participants);
      
      expect(conv1.id).toBe(conv2.id);
      const state = get(messagesStore);
      expect(state.conversations).toHaveLength(1);
    });

    it('should get conversation by ID', async () => {
      const conv = await messagesStore.createConversation(['alice-id']);
      
      const found = messagesStore.getConversation(conv.id);
      expect(found).toEqual(conv);
    });

    it('should return undefined for non-existent conversation', () => {
      const found = messagesStore.getConversation('non-existent');
      expect(found).toBeUndefined();
    });
  });
});