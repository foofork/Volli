import { vi } from 'vitest';

interface MockObjectStore {
  name: string;
  data: Map<string, any>;
  keyPath: string | null;
  autoIncrement: boolean;
}

interface MockDatabase {
  name: string;
  version: number;
  objectStores: Map<string, MockObjectStore>;
}

class MockIDBRequest {
  result: any;
  error: any;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  constructor(result?: any, error?: any) {
    this.result = result;
    this.error = error;
    
    // Simulate async behavior
    setTimeout(() => {
      if (error && this.onerror) {
        this.onerror({ target: this });
      } else if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    }, 0);
  }
}

class MockIDBTransaction {
  db: MockDatabase;
  mode: string;
  objectStoreNames: string[];
  oncomplete: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  constructor(db: MockDatabase, storeNames: string[], mode: string) {
    this.db = db;
    this.objectStoreNames = storeNames;
    this.mode = mode;
    
    // Auto-complete transaction
    setTimeout(() => {
      if (this.oncomplete) {
        this.oncomplete({ target: this });
      }
    }, 10);
  }
  
  objectStore(name: string): MockIDBObjectStore {
    const store = this.db.objectStores.get(name);
    if (!store) {
      throw new Error(`Object store ${name} not found`);
    }
    return new MockIDBObjectStore(store, this);
  }
}

class MockIDBObjectStore {
  store: MockObjectStore;
  transaction: MockIDBTransaction;
  
  constructor(store: MockObjectStore, transaction: MockIDBTransaction) {
    this.store = store;
    this.transaction = transaction;
  }
  
  add(value: any, key?: any): MockIDBRequest {
    if (this.transaction.mode === 'readonly') {
      return new MockIDBRequest(undefined, new Error('Read-only transaction'));
    }
    
    const actualKey = key || (this.store.keyPath ? value[this.store.keyPath] : Date.now());
    
    if (this.store.data.has(actualKey)) {
      return new MockIDBRequest(undefined, new Error('Key already exists'));
    }
    
    this.store.data.set(actualKey, value);
    return new MockIDBRequest(actualKey);
  }
  
  put(value: any, key?: any): MockIDBRequest {
    if (this.transaction.mode === 'readonly') {
      return new MockIDBRequest(undefined, new Error('Read-only transaction'));
    }
    
    const actualKey = key || (this.store.keyPath ? value[this.store.keyPath] : Date.now());
    this.store.data.set(actualKey, value);
    return new MockIDBRequest(actualKey);
  }
  
  get(key: any): MockIDBRequest {
    const value = this.store.data.get(key);
    return new MockIDBRequest(value);
  }
  
  getAll(): MockIDBRequest {
    const values = Array.from(this.store.data.values());
    return new MockIDBRequest(values);
  }
  
  delete(key: any): MockIDBRequest {
    if (this.transaction.mode === 'readonly') {
      return new MockIDBRequest(undefined, new Error('Read-only transaction'));
    }
    
    this.store.data.delete(key);
    return new MockIDBRequest(undefined);
  }
  
  clear(): MockIDBRequest {
    if (this.transaction.mode === 'readonly') {
      return new MockIDBRequest(undefined, new Error('Read-only transaction'));
    }
    
    this.store.data.clear();
    return new MockIDBRequest(undefined);
  }
  
  count(): MockIDBRequest {
    return new MockIDBRequest(this.store.data.size);
  }
}

class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: string[];
  private _db: MockDatabase;
  
  constructor(db: MockDatabase) {
    this._db = db;
    this.name = db.name;
    this.version = db.version;
    this.objectStoreNames = Array.from(db.objectStores.keys());
  }
  
  transaction(storeNames: string | string[], mode: string = 'readonly'): MockIDBTransaction {
    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this._db, stores, mode);
  }
  
  createObjectStore(name: string, options?: { keyPath?: string; autoIncrement?: boolean }): MockIDBObjectStore {
    const store: MockObjectStore = {
      name,
      data: new Map(),
      keyPath: options?.keyPath || null,
      autoIncrement: options?.autoIncrement || false,
    };
    
    this._db.objectStores.set(name, store);
    this.objectStoreNames = Array.from(this._db.objectStores.keys());
    
    return new MockIDBObjectStore(store, null as any);
  }
  
  close(): void {
    // No-op for mock
  }
}

const databases = new Map<string, MockDatabase>();

export function mockIndexedDB() {
  const mockIDB = {
    open: vi.fn((name: string, version?: number) => {
      const request = new MockIDBRequest();
      
      setTimeout(() => {
        let db = databases.get(name);
        let upgradeNeeded = false;
        
        if (!db) {
          db = {
            name,
            version: version || 1,
            objectStores: new Map(),
          };
          databases.set(name, db);
          upgradeNeeded = true;
        } else if (version && version > db.version) {
          db.version = version;
          upgradeNeeded = true;
        }
        
        const mockDb = new MockIDBDatabase(db);
        
        if (upgradeNeeded && (request as any).onupgradeneeded) {
          (request as any).onupgradeneeded({
            target: { result: mockDb },
            oldVersion: 0,
            newVersion: version || 1,
          });
        }
        
        request.result = mockDb;
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      
      return request;
    }),
    
    deleteDatabase: vi.fn((name: string) => {
      databases.delete(name);
      return new MockIDBRequest();
    }),
  };
  
  // Set up global indexedDB
  (global as any).indexedDB = mockIDB;
  
  // Also mock IDBKeyRange for queries
  (global as any).IDBKeyRange = {
    bound: (lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean) => ({
      lower,
      upper,
      lowerOpen,
      upperOpen,
    }),
    lowerBound: (lower: any, open?: boolean) => ({
      lower,
      lowerOpen: open,
    }),
    upperBound: (upper: any, open?: boolean) => ({
      upper,
      upperOpen: open,
    }),
    only: (value: any) => ({
      value,
    }),
  };
}

// Helper to clear all databases between tests
export function clearAllDatabases() {
  databases.clear();
}

// Helper to get mock database for assertions
export function getMockDatabase(name: string): MockDatabase | undefined {
  return databases.get(name);
}

// Helper to create a pre-populated database for tests
export function createMockDatabase(name: string, schema: {
  [storeName: string]: {
    keyPath?: string;
    autoIncrement?: boolean;
    data?: Array<{ key: any; value: any }>;
  };
}) {
  const db: MockDatabase = {
    name,
    version: 1,
    objectStores: new Map(),
  };
  
  for (const [storeName, config] of Object.entries(schema)) {
    const store: MockObjectStore = {
      name: storeName,
      data: new Map(),
      keyPath: config.keyPath || null,
      autoIncrement: config.autoIncrement || false,
    };
    
    // Pre-populate with data if provided
    if (config.data) {
      for (const { key, value } of config.data) {
        store.data.set(key, value);
      }
    }
    
    db.objectStores.set(storeName, store);
  }
  
  databases.set(name, db);
  return db;
}