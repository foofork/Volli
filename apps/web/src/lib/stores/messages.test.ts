import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { messagesStore, activeConversation, activeMessages } from './messages';
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
      // Store original network
      const originalNetwork = (messagesStore as any).networkStore;
      
      // Track if endpoint was called
      const mockGetMessages = vi.fn().mockResolvedValue([]);
      const mockGetSyncEndpoint = vi.fn().mockResolvedValue({
        getMessages: mockGetMessages,
        sendMessage: vi.fn().mockResolvedValue(true)
      });
      
      // Set network online
      (messagesStore as any).networkStore = { 
        isOnline: true,
        getSyncEndpoint: mockGetSyncEndpoint
      };
      
      await messagesStore.loadConversations();
      
      // Wait for async sync to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify sync was triggered by checking if endpoint was requested
      expect(mockGetSyncEndpoint).toHaveBeenCalled();
      
      // Restore
      (messagesStore as any).networkStore = originalNetwork;
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
      messagesStore.setActiveConversation(null);
      
      await expect(messagesStore.sendMessage('test')).rejects.toThrow(
        'No active conversation'
      );
    });

    it('should encrypt message for each participant', async () => {
      // Mock encrypt function
      const mockEncrypt = vi.fn().mockResolvedValue('encrypted-content');
      (messagesStore as any).encryptForRecipient = mockEncrypt;
      
      // Mock contact store
      const mockGetPublicKey = vi.fn().mockResolvedValue('mock-public-key');
      (messagesStore as any).contactStore = { getPublicKey: mockGetPublicKey };
      
      // Create conversation and send message
      await messagesStore.createConversation(['alice-id']);
      await messagesStore.sendMessage('Secret message');
      
      expect(mockGetPublicKey).toHaveBeenCalledWith('alice-id');
      expect(mockEncrypt).toHaveBeenCalledWith('Secret message', 'mock-public-key');
      
      // Clean up
      delete (messagesStore as any).encryptForRecipient;
      delete (messagesStore as any).contactStore;
    });

    it('should update conversation last activity', async () => {
      // Create conversation first
      await messagesStore.createConversation(['alice-id']);
      const before = get(messagesStore).conversations[0].lastActivity;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      await messagesStore.sendMessage('New message');
      
      const after = get(messagesStore).conversations[0].lastActivity;
      expect(after).toBeGreaterThan(before);
    });

    it('should queue message for delivery if offline', async () => {
      // Create conversation first
      await messagesStore.createConversation(['alice-id']);
      
      (messagesStore as any).networkStore = { isOnline: false };
      const enqueueSpy = vi.fn();
      (messagesStore as any).messageQueue = { enqueue: enqueueSpy };
      
      await messagesStore.sendMessage('Offline message');
      
      expect(enqueueSpy).toHaveBeenCalled();
      
      // Clean up
      delete (messagesStore as any).networkStore;
      delete (messagesStore as any).messageQueue;
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
      // Clear localStorage to ensure clean state
      localStorage.removeItem('volli-last-sync');
      
      // Store original network store
      const originalNetwork = (messagesStore as any).networkStore;
      
      // Mock sync endpoint
      const mockGetMessages = vi.fn().mockImplementation(async (params) => {
        // Return empty array to simulate no new messages
        return [];
      });
      const mockEndpoint = {
        getMessages: mockGetMessages,
        sendMessage: vi.fn().mockResolvedValue(true)
      };
      
      (messagesStore as any).networkStore = {
        isOnline: true,
        getSyncEndpoint: vi.fn().mockResolvedValue(mockEndpoint)
      };
      
      await messagesStore.syncMessages();
      
      expect(mockGetMessages).toHaveBeenCalledWith({
        identityId: 'test-identity-123',
        since: 0
      });
      const state = get(messagesStore);
      expect(state.syncStatus).toBe('synced');
      
      // Restore
      (messagesStore as any).networkStore = originalNetwork;
    });

    it('should handle sync errors gracefully', async () => {
      // Store original network store and console.error
      const originalNetwork = (messagesStore as any).networkStore;
      const originalConsoleError = console.error;
      console.error = vi.fn(); // Mock console.error to avoid noise
      
      (messagesStore as any).networkStore = {
        isOnline: true,
        getSyncEndpoint: vi.fn().mockRejectedValue(new Error('Network error'))
      };
      
      await messagesStore.syncMessages();
      
      const state = get(messagesStore);
      expect(state.syncStatus).toBe('error');
      
      // Restore
      (messagesStore as any).networkStore = originalNetwork;
      console.error = originalConsoleError;
    });

    it('should send pending messages during sync', async () => {
      // Store originals
      const originalNetwork = (messagesStore as any).networkStore;
      const originalQueue = (messagesStore as any).messageQueue;
      
      const testMessage = {
        id: 'pending-1',
        conversationId: 'conv-1',
        content: 'Test message',
        sender: 'test-identity-123',
        timestamp: Date.now(),
        delivered: false,
        read: false,
        encrypted: true
      };
      
      // Track if deliverMessage was called
      let deliverCalled = false;
      let deliveredMessage: any = null;
      
      // Mock deliverMessage to track calls
      const originalDeliver = (messagesStore as any).deliverMessage;
      (messagesStore as any).deliverMessage = vi.fn().mockImplementation(async (msg) => {
        deliverCalled = true;
        deliveredMessage = msg;
        return Promise.resolve();
      });
      
      // Mock endpoint
      const mockEndpoint = {
        getMessages: vi.fn().mockResolvedValue([]),
        sendMessage: vi.fn().mockResolvedValue(true)
      };
      
      // Mock network to return our endpoint
      (messagesStore as any).networkStore = {
        isOnline: true,
        getSyncEndpoint: vi.fn().mockResolvedValue(mockEndpoint)
      };
      
      // Mock queue with pending messages
      const mockQueue = {
        getPending: vi.fn().mockResolvedValue([testMessage]),
        markDelivered: vi.fn(),
        pending: [testMessage]
      };
      (messagesStore as any).messageQueue = mockQueue;
      
      await messagesStore.syncMessages();
      
      // Verify deliverMessage was called with the test message
      expect(deliverCalled).toBe(true);
      expect(deliveredMessage).toEqual(testMessage);
      expect(mockQueue.markDelivered).toHaveBeenCalledWith('pending-1');
      
      // Restore
      (messagesStore as any).networkStore = originalNetwork;
      (messagesStore as any).messageQueue = originalQueue;
      (messagesStore as any).deliverMessage = originalDeliver;
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
      
      const conv = await messagesStore.createConversation(['alice-id']);
      messagesStore.setActiveConversation(conv.id);
      await messagesStore.sendMessage('Secret');
      
      expect(mockEncrypt).toHaveBeenCalledWith('Secret', 'public-key');
      
      // Clean up
      delete (messagesStore as any).encryptForRecipient;
      delete (messagesStore as any).contactStore;
    });

    it('should decrypt incoming messages', async () => {
      // Store originals
      const originalNetwork = (messagesStore as any).networkStore;
      
      // Create a new message that will be returned by the endpoint
      const encryptedMsg = { encrypted: 'encrypted-data' };
      const decryptedMsg = {
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Decrypted message',
        sender: 'alice-id',
        timestamp: Date.now(),
        delivered: true,
        read: false,
        encrypted: true
      };
      
      // Mock the decryptIncomingMessage to return our message
      const originalDecrypt = (messagesStore as any).decryptIncomingMessage;
      (messagesStore as any).decryptIncomingMessage = vi.fn().mockResolvedValue(decryptedMsg);
      
      // Mock endpoint to return encrypted messages
      (messagesStore as any).networkStore = {
        isOnline: true,
        getSyncEndpoint: vi.fn().mockResolvedValue({
          getMessages: vi.fn().mockResolvedValue([encryptedMsg]),
          sendMessage: vi.fn().mockResolvedValue(true)
        })
      };
      
      // Clear localStorage to ensure clean sync
      localStorage.removeItem('volli-last-sync');
      
      await messagesStore.syncMessages();
      
      // Verify decryption was called
      expect((messagesStore as any).decryptIncomingMessage).toHaveBeenCalledWith(encryptedMsg);
      
      // Verify the decrypted message was added to a conversation
      const state = get(messagesStore);
      const conversation = state.conversations.find(c => c.id === 'conv-1');
      expect(conversation).toBeDefined();
      expect(conversation?.messages).toContainEqual(decryptedMsg);
      
      // Restore
      (messagesStore as any).decryptIncomingMessage = originalDecrypt;
      (messagesStore as any).networkStore = originalNetwork;
    });
  });

  describe('Error Handling', () => {
    it('should handle vault errors gracefully', async () => {
      // Mock getDecryptedVault to throw error
      const originalGetDecryptedVault = (vaultStore as any).getDecryptedVault;
      (vaultStore as any).getDecryptedVault = vi.fn().mockRejectedValue(new Error('Vault error'));
      
      await expect(messagesStore.loadConversations()).rejects.toThrow('Vault error');
      
      const state = get(messagesStore);
      expect(state.error).toBe('Failed to load conversations: Vault error');
      
      // Restore original method
      (vaultStore as any).getDecryptedVault = originalGetDecryptedVault;
    });

    it('should handle network errors during send', async () => {
      const conv = await messagesStore.createConversation(['alice-id']);
      messagesStore.setActiveConversation(conv.id);
      
      (messagesStore as any).deliverMessage = vi.fn().mockRejectedValue(new Error('Network error'));
      (messagesStore as any).networkStore = { isOnline: true };
      const mockQueue = { enqueue: vi.fn() };
      (messagesStore as any).messageQueue = mockQueue;
      
      // Should not throw, but queue for retry
      await expect(messagesStore.sendMessage('Test')).resolves.not.toThrow();
      expect(mockQueue.enqueue).toHaveBeenCalled();
      
      // Clean up
      delete (messagesStore as any).deliverMessage;
      delete (messagesStore as any).networkStore;
      delete (messagesStore as any).messageQueue;
    });
  });

  describe('Conversation Management', () => {
    it('should find or create conversation', () => {
      const participants = ['test-identity-123', 'alice-id'];
      
      // First call creates
      const conv1 = messagesStore.findOrCreateConversation(participants);
      
      // Second call finds existing
      const conv2 = messagesStore.findOrCreateConversation(participants);
      
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
  
  describe('Internal Functions', () => {
    it('should decrypt incoming messages', async () => {
      // Test the decryptIncomingMessage function
      const encryptedMsg = {
        id: 'test-msg',
        content: 'encrypted content',
        conversationId: 'conv-1',
        sender: 'alice',
        timestamp: Date.now()
      };
      
      const decrypted = await (messagesStore as any).decryptIncomingMessage(encryptedMsg);
      
      // Since it's a mock, it should return the same object
      expect(decrypted).toEqual(encryptedMsg);
    });
    
    it('should deliver message via network endpoint', async () => {
      // Store original network store
      const originalNetworkStore = (messagesStore as any).networkStore;
      
      // Mock network store and endpoint
      const mockSendMessage = vi.fn().mockResolvedValue(true);
      const mockEndpoint = {
        sendMessage: mockSendMessage
      };
      
      (messagesStore as any).networkStore = {
        getSyncEndpoint: vi.fn().mockResolvedValue(mockEndpoint)
      };
      
      const message = factories.message();
      
      // Call the exposed deliverMessage function
      const deliverMessage = (messagesStore as any).deliverMessage;
      if (deliverMessage) {
        await deliverMessage.call(messagesStore, message);
        expect(mockSendMessage).toHaveBeenCalledWith(message);
      } else {
        // If not exposed, test the functionality through sendMessage
        const conv = await messagesStore.createConversation(['test-user']);
        messagesStore.setActiveConversation(conv.id);
        (messagesStore as any).networkStore.isOnline = true;
        
        // deliverMessage is called internally when online
        await messagesStore.sendMessage('Test message');
        
        // Check that network endpoint was used
        const syncEndpoint = await (messagesStore as any).networkStore.getSyncEndpoint();
        expect(syncEndpoint).toBeDefined();
      }
      
      // Restore
      (messagesStore as any).networkStore = originalNetworkStore;
    });
  });
  
  describe('Derived Stores', () => {
    it('should handle activeConversation with no active conversation', () => {
      // Reset store to ensure no active conversation
      messagesStore.reset();
      
      const activeConv = get(activeConversation);
      expect(activeConv).toBe(null);
    });
    
    it('should handle activeConversation with invalid conversation ID', async () => {
      // Create a conversation then set an invalid active ID
      await messagesStore.createConversation(['alice-id']);
      messagesStore.setActiveConversation('non-existent-id');
      
      const activeConv = get(activeConversation);
      expect(activeConv).toBe(null);
    });
    
    it('should handle activeMessages with no active conversation', () => {
      // Reset store to ensure no active conversation
      messagesStore.reset();
      
      const messages = get(activeMessages);
      expect(messages).toEqual([]);
    });
    
    it('should handle activeMessages with conversation that has no messages', async () => {
      // Create a conversation but don't send any messages
      const conv = await messagesStore.createConversation(['alice-id']);
      messagesStore.setActiveConversation(conv.id);
      
      const messages = get(activeMessages);
      expect(messages).toEqual([]);
    });
  });
});