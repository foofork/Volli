// Set up IndexedDB globals first
import './indexeddb-setup';

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { mockCrypto } from './crypto-mock';
import { clearAllDatabases } from './db-mock';
import { initCrypto } from '@volli/vault-core';
import { initializeCore } from '$lib/stores/core';
import { indexedDB } from './indexeddb-setup';

// Setup global mocks
beforeAll(async () => {
  // Initialize libsodium crypto
  await initCrypto();
  
  // Mock crypto API
  mockCrypto();
  
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

// Clean up after each test
afterEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear IndexedDB databases
  if (global.indexedDB) {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  }
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