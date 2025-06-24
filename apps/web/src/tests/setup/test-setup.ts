import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { mockCrypto } from './crypto-mock';
import { cleanupDatabases } from './db-cleanup';
import { initializeCore, resetCore } from '$lib/stores/core';

// Setup global mocks
beforeAll(async () => {
  // Mock crypto API
  mockCrypto();
  
  // Import and initialize crypto
  const { initCrypto } = await import('@volli/vault-core');
  await initCrypto();
  
  // Initialize core after crypto is ready
  await initializeCore();
  
  // Polyfill File.arrayBuffer if not available
  if (!File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = async function() {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(this);
      });
    };
  }
  
  // Polyfill Blob.text if not available
  if (!Blob.prototype.text) {
    Blob.prototype.text = async function() {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(this);
      });
    };
  }
  
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  
  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Set up before each test
beforeEach(async () => {
  // Ensure core is initialized
  await initializeCore();
});

// Clean up after each test
afterEach(async () => {
  // Reset stores first
  const { authStore } = await import('$lib/stores/auth');
  const { vaultStore } = await import('$lib/stores/vault');
  const { messages } = await import('$lib/stores/messages');
  const { contacts } = await import('$lib/stores/contacts');
  
  authStore.logout();
  vaultStore.reset();
  messages.reset();
  contacts.reset();
  
  // Clean up databases
  await cleanupDatabases();
  
  // Reset core
  resetCore();
  
  // Clear mocks and storage
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Consider adding an error boundary')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});