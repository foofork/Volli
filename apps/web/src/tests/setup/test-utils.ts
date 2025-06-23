import { render as svelteRender } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, SvelteComponent } from 'svelte';

// Re-export everything from testing library
export * from '@testing-library/svelte';
export { userEvent };

// Custom render function with common providers
export function render<T extends SvelteComponent>(
  Component: new (...args: any[]) => T,
  options?: Partial<ComponentProps<T>>
) {
  return svelteRender(Component, options);
}

// Test data factories
export const factories = {
  identity: (overrides: Partial<any> = {}) => ({
    id: 'test-identity-123',
    displayName: 'Test User',
    publicKey: 'mock-public-key',
    encryptedPrivateKey: 'mock-encrypted-private-key',
    createdAt: Date.now(),
    ...overrides,
  }),
  
  message: (overrides: Partial<any> = {}) => ({
    id: 'msg-123',
    conversationId: 'conv-123',
    content: 'Test message content',
    sender: 'test-identity-123',
    timestamp: Date.now(),
    delivered: false,
    read: false,
    encrypted: true,
    ...overrides,
  }),
  
  conversation: (overrides: Partial<any> = {}) => ({
    id: 'conv-123',
    participants: ['test-identity-123', 'other-identity-456'],
    messages: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
    unreadCount: 0,
    ...overrides,
  }),
  
  vault: (overrides: Partial<any> = {}) => ({
    id: 'vault-123',
    identityId: 'test-identity-123',
    version: 1,
    salt: new Uint8Array(32),
    encryptedData: new Uint8Array(256),
    createdAt: Date.now(),
    lastModified: Date.now(),
    ...overrides,
  }),
  
  contact: (overrides: Partial<any> = {}) => ({
    id: 'contact-123',
    displayName: 'Test Contact',
    identityId: 'other-identity-456',
    publicKey: 'contact-public-key',
    addedAt: Date.now(),
    ...overrides,
  }),
};

// Test fixtures
export const fixtures = {
  validPassphrase: 'correct-horse-battery-staple-quantum-resistant',
  weakPassphrase: 'password123',
  strongPassphrase: 'Ultra-Secure-Passphrase-With-Numbers-123-And-Symbols-!@#',
  
  validDisplayName: 'Test User',
  shortDisplayName: 'TU',
  longDisplayName: 'This Is A Very Long Display Name That Exceeds The Maximum',
};

// Mock stores for testing
export function createMockAuthStore() {
  let isAuthenticated = false;
  let currentIdentity: any = null;
  let vaultUnlocked = false;
  
  return {
    subscribe: (fn: Function) => {
      fn({ isAuthenticated, currentIdentity, vaultUnlocked });
      return () => {};
    },
    createIdentity: async (displayName: string) => {
      if (displayName.length < 3 || displayName.length > 30) {
        throw new Error('Display name must be 3-30 characters');
      }
      currentIdentity = factories.identity({ displayName });
      return { identity: currentIdentity, requiresVaultCreation: true };
    },
    createVaultWithPassphrase: async (passphrase: string) => {
      if (passphrase.length < 12) {
        throw new Error('Passphrase too weak');
      }
      isAuthenticated = true;
      vaultUnlocked = true;
    },
    lockVault: () => {
      vaultUnlocked = false;
    },
    unlockVault: async (passphrase: string) => {
      if (passphrase === fixtures.validPassphrase) {
        vaultUnlocked = true;
        return true;
      }
      return false;
    },
    logout: () => {
      isAuthenticated = false;
      currentIdentity = null;
      vaultUnlocked = false;
    },
  };
}

export function createMockVaultStore() {
  let isUnlocked = false;
  const conversations: any[] = [];
  const contacts: any[] = [];
  const files: any[] = [];
  
  return {
    subscribe: (fn: Function) => {
      fn({ isUnlocked });
      return () => {};
    },
    getContacts: async () => contacts,
    addContact: async (contact: any) => {
      contacts.push(contact);
    },
    getMessages: async (conversationId: string) => {
      const conversation = conversations.find(c => c.id === conversationId);
      return conversation?.messages || [];
    },
    sendMessage: async (conversationId: string, content: string) => {
      const message = factories.message({ conversationId, content });
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.messages.push(message);
      }
      return message;
    },
    storeFile: async (file: File) => {
      const fileId = `file-${Date.now()}`;
      files.push({ id: fileId, name: file.name, size: file.size });
      return fileId;
    },
  };
}

export function createMockMessagesStore() {
  const conversations: any[] = [];
  let activeConversation: string | null = null;
  
  return {
    subscribe: (fn: Function) => {
      fn({ conversations, activeConversation });
      return () => {};
    },
    loadConversations: async () => {
      // Pre-populate with test data
      conversations.push(
        factories.conversation({
          id: 'demo-conv',
          participants: ['test-identity-123', 'demo-contact'],
        })
      );
    },
    createConversation: async (participants: string[]) => {
      const conversation = factories.conversation({ participants });
      conversations.push(conversation);
      activeConversation = conversation.id;
      return conversation;
    },
    sendMessage: async (content: string) => {
      if (!activeConversation) throw new Error('No active conversation');
      const message = factories.message({ conversationId: activeConversation, content });
      const conv = conversations.find(c => c.id === activeConversation);
      if (conv) {
        conv.messages.push(message);
      }
    },
  };
}

// Wait helpers
export async function waitForElement(fn: () => any, timeout = 1000): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = fn();
      if (result) return result;
    } catch {
      // Continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  throw new Error('Element not found within timeout');
}

// Navigation mock
export function mockNavigation() {
  const navigate = vi.fn();
  const goto = vi.fn();
  
  vi.mock('$app/navigation', () => ({
    goto,
    afterNavigate: vi.fn(),
  }));
  
  return { navigate, goto };
}

// Page store mock
export function mockPageStore(url = '/', params = {}) {
  const page = {
    url: new URL(url, 'http://localhost'),
    params,
    route: { id: url },
    status: 200,
    error: null,
    data: {},
    form: null,
  };
  
  vi.mock('$app/stores', () => ({
    page: {
      subscribe: (fn: Function) => {
        fn(page);
        return () => {};
      },
    },
  }));
  
  return page;
}

// Crypto test helpers
export function generateTestKeyPair() {
  return {
    publicKey: 'test-public-key-' + Math.random(),
    privateKey: 'test-private-key-' + Math.random(),
  };
}

export async function encryptTestData(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const encrypted = new Uint8Array(encoded.length + 16);
  encrypted.set(encoded);
  // Add mock auth tag
  encrypted.set(new Uint8Array(16).fill(0xFF), encoded.length);
  return encrypted.buffer;
}

export async function decryptTestData(encrypted: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder();
  const array = new Uint8Array(encrypted);
  // Remove mock auth tag
  const decrypted = array.slice(0, -16);
  return decoder.decode(decrypted);
}