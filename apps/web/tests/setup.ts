import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock crypto.getRandomValues for consistent testing
const mockGetRandomValues = (array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
};

if (!global.crypto) {
  (global as any).crypto = {};
}

if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = mockGetRandomValues;
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock ClipboardEvent and DataTransfer for paste testing
global.ClipboardEvent = class ClipboardEvent extends Event {
  clipboardData: DataTransfer;
  
  constructor(type: string, eventInitDict?: { clipboardData?: DataTransfer }) {
    super(type);
    this.clipboardData = eventInitDict?.clipboardData || new DataTransfer();
  }
} as any;

global.DataTransfer = class DataTransfer {
  items: DataTransferItemList;
  files: FileList;
  types: readonly string[];
  effectAllowed: string;
  dropEffect: string;
  private _data: Map<string, string> = new Map();
  
  constructor() {
    this.items = [] as any;
    this.files = [] as any;
    this.types = [];
    this.effectAllowed = 'none';
    this.dropEffect = 'none';
  }
  
  getData(format: string): string {
    return this._data.get(format) || '';
  }
  
  setData(format: string, data: string): void {
    this._data.set(format, data);
    if (!this.types.includes(format)) {
      (this.types as string[]).push(format);
    }
  }
  
  clearData(format?: string): void {
    if (format) {
      this._data.delete(format);
      const index = this.types.indexOf(format);
      if (index > -1) {
        (this.types as string[]).splice(index, 1);
      }
    } else {
      this._data.clear();
      (this.types as string[]).length = 0;
    }
  }
  
  setDragImage(element: Element, x: number, y: number): void {
    // Mock implementation
  }
} as any;