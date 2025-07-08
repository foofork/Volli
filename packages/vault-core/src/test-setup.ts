import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { initCrypto } from './crypto';

// Set up fake IndexedDB for testing
if (typeof window !== 'undefined' && !window.indexedDB) {
  window.indexedDB = new IDBFactory();
}

// Initialize crypto for all tests
beforeAll(async () => {
  await initCrypto();
});
