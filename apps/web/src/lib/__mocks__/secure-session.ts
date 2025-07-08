/**
 * Mock implementation of secure session for testing
 */
import { vi } from 'vitest';

interface MockSessionData {
  token: string;
  expiresAt: number;
  createdAt: number;
}

let mockStorage: MockSessionData | null = null;

export const SESSION_KEY = 'volli-session';
export const SESSION_TIMEOUT = 15 * 60 * 1000;

export const secureSession = {
  store: vi.fn((token: string): void => {
    mockStorage = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TIMEOUT,
    };
  }),

  get: vi.fn((): MockSessionData | null => {
    if (!mockStorage) return null;

    // Check if expired
    if (mockStorage.expiresAt < Date.now()) {
      mockStorage = null;
      return null;
    }

    return mockStorage;
  }),

  remove: vi.fn((): void => {
    mockStorage = null;
  }),

  isValid: vi.fn((): boolean => {
    return mockStorage !== null && mockStorage.expiresAt >= Date.now();
  }),

  refresh: vi.fn((): void => {
    if (mockStorage) {
      mockStorage.expiresAt = Date.now() + SESSION_TIMEOUT;
    }
  }),

  getTimeRemaining: vi.fn((): number => {
    if (!mockStorage) return 0;
    return Math.max(0, mockStorage.expiresAt - Date.now());
  }),

  // Test helper to clear storage
  _clearMockStorage: (): void => {
    mockStorage = null;
  },
};
