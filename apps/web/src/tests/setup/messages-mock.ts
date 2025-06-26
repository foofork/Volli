import { vi } from 'vitest';
import { writable, get } from 'svelte/store';

// Mock network store
export function createMockNetworkStore() {
  const store = writable({
    isOnline: true,
    lastSync: null as number | null,
    peers: new Map()
  });

  return {
    ...store,
    isOnline: true,
    setOnline: (online: boolean) => {
      store.update(s => ({ ...s, isOnline: online }));
    },
    getSyncEndpoint: vi.fn().mockResolvedValue({
      sendMessage: vi.fn().mockResolvedValue(true),
      getMessages: vi.fn().mockResolvedValue([])
    })
  };
}

// Mock contact store
export function createMockContactStore() {
  const contacts = new Map<string, any>();
  
  return {
    getPublicKey: vi.fn(async (contactId: string) => {
      // Return mock public key for testing
      return `mock-public-key-${contactId}`;
    }),
    addContact: vi.fn(async (contact: any) => {
      contacts.set(contact.id, contact);
      return contact;
    }),
    getContact: vi.fn(async (contactId: string) => {
      return contacts.get(contactId);
    }),
    getAllContacts: vi.fn(async () => {
      return Array.from(contacts.values());
    })
  };
}

// Mock message queue
export function createMockMessageQueue() {
  const queue: any[] = [];
  let queueIdCounter = 0;

  return {
    enqueue: vi.fn(async (message: any) => {
      const queuedMessage = {
        id: ++queueIdCounter,
        message,
        attempts: 0,
        createdAt: Date.now()
      };
      queue.push(queuedMessage);
      return queuedMessage.id;
    }),
    getPending: vi.fn(async () => {
      return queue.filter(item => item.attempts < 3);
    }),
    markDelivered: vi.fn(async (id: number) => {
      const index = queue.findIndex(item => item.id === id);
      if (index >= 0) {
        queue.splice(index, 1);
      }
    }),
    markFailed: vi.fn(async (id: number) => {
      const item = queue.find(item => item.id === id);
      if (item) {
        item.attempts++;
        item.lastAttempt = Date.now();
      }
    }),
    clear: vi.fn(async () => {
      queue.length = 0;
    }),
    getQueueSize: vi.fn(async () => queue.length),
    pending: queue
  };
}

// Mock encryption functions
export function createMockEncryption() {
  return {
    encryptForRecipient: vi.fn(async (content: string, publicKey: string) => {
      // Return mock encrypted content
      return `encrypted[${content}]with[${publicKey}]`;
    }),
    decryptIncomingMessage: vi.fn(async (encryptedMsg: any) => {
      // Return mock decrypted message
      return {
        id: encryptedMsg.id || 'msg-' + Date.now(),
        conversationId: encryptedMsg.conversationId || 'conv-1',
        content: encryptedMsg.content || 'Decrypted message',
        senderId: encryptedMsg.senderId || 'sender-id',
        timestamp: encryptedMsg.timestamp || Date.now(),
        delivered: true,
        read: false,
        encrypted: false
      };
    })
  };
}

// Mock WebRTC connection
export function createMockWebRTCConnection() {
  const connectionState = writable({
    connected: false,
    peerId: null as string | null,
    localStream: null,
    remoteStream: null
  });

  return {
    ...connectionState,
    connect: vi.fn(async (peerId: string) => {
      connectionState.update(s => ({ ...s, connected: true, peerId }));
      return true;
    }),
    disconnect: vi.fn(() => {
      connectionState.update(s => ({ 
        ...s, 
        connected: false, 
        peerId: null,
        localStream: null,
        remoteStream: null 
      }));
    }),
    sendData: vi.fn(async (data: any) => {
      return true;
    })
  };
}

// Helper to inject mocks into messages store
export function injectMessagesStoreMocks(messagesStore: any, mocks: {
  networkStore?: ReturnType<typeof createMockNetworkStore>;
  contactStore?: ReturnType<typeof createMockContactStore>;
  messageQueue?: ReturnType<typeof createMockMessageQueue>;
  encryption?: ReturnType<typeof createMockEncryption>;
  webrtc?: ReturnType<typeof createMockWebRTCConnection>;
}) {
  if (mocks.networkStore) {
    (messagesStore as any).networkStore = mocks.networkStore;
  }
  if (mocks.contactStore) {
    (messagesStore as any).contactStore = mocks.contactStore;
  }
  if (mocks.messageQueue) {
    (messagesStore as any).messageQueue = mocks.messageQueue;
  }
  if (mocks.encryption) {
    if (mocks.encryption.encryptForRecipient) {
      (messagesStore as any).encryptForRecipient = mocks.encryption.encryptForRecipient;
    }
    if (mocks.encryption.decryptIncomingMessage) {
      (messagesStore as any).decryptIncomingMessage = mocks.encryption.decryptIncomingMessage;
    }
  }
  if (mocks.webrtc) {
    (messagesStore as any).webrtc = mocks.webrtc;
  }
}

// Helper to restore original implementations
export function restoreMessagesStoreMocks(messagesStore: any) {
  // Delete injected properties to restore originals
  delete (messagesStore as any).networkStore;
  delete (messagesStore as any).contactStore;
  delete (messagesStore as any).messageQueue;
  delete (messagesStore as any).encryptForRecipient;
  delete (messagesStore as any).decryptIncomingMessage;
  delete (messagesStore as any).webrtc;
}