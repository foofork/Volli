import { describe, it, expect, beforeEach, vi } from 'vitest';
import { secureSession, SESSION_TIMEOUT } from './secure-session';

describe('SecureSession', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('store', () => {
    it('should store session in sessionStorage', () => {
      const token = 'test-token-123';

      secureSession.store(token);

      const stored = sessionStorage.getItem('volli-session');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.token).toBe(token);
      expect(parsed.expiresAt).toBeGreaterThan(Date.now());
      expect(parsed.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should set expiry time 15 minutes in the future', () => {
      const token = 'test-token-456';
      const now = Date.now();

      secureSession.store(token);

      const stored = JSON.parse(sessionStorage.getItem('volli-session')!);
      const expectedExpiry = now + SESSION_TIMEOUT;

      // Allow 100ms tolerance for test execution time
      expect(stored.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(stored.expiresAt).toBeLessThanOrEqual(expectedExpiry + 100);
    });
  });

  describe('get', () => {
    it('should retrieve valid session', () => {
      const token = 'test-token-789';
      secureSession.store(token);

      const session = secureSession.get();

      expect(session).toBeTruthy();
      expect(session?.token).toBe(token);
    });

    it('should return null for expired session', () => {
      const expiredSession = {
        token: 'expired-token',
        createdAt: Date.now() - 20 * 60 * 1000, // 20 minutes ago
        expiresAt: Date.now() - 5 * 60 * 1000, // Expired 5 minutes ago
      };

      sessionStorage.setItem('volli-session', JSON.stringify(expiredSession));

      const session = secureSession.get();
      expect(session).toBeNull();

      // Should also clear the expired session
      expect(sessionStorage.getItem('volli-session')).toBeNull();
    });

    it('should return null if no session exists', () => {
      const session = secureSession.get();
      expect(session).toBeNull();
    });

    it('should handle corrupted session data', () => {
      sessionStorage.setItem('volli-session', 'invalid-json{');

      const session = secureSession.get();
      expect(session).toBeNull();

      // Should clear corrupted data
      expect(sessionStorage.getItem('volli-session')).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove session from sessionStorage', () => {
      secureSession.store('test-token');
      expect(sessionStorage.getItem('volli-session')).toBeTruthy();

      secureSession.remove();

      expect(sessionStorage.getItem('volli-session')).toBeNull();
    });
  });

  describe('isValid', () => {
    it('should return true for valid session', () => {
      secureSession.store('test-token');
      expect(secureSession.isValid()).toBe(true);
    });

    it('should return false for expired session', () => {
      const expiredSession = {
        token: 'expired-token',
        createdAt: Date.now() - 20 * 60 * 1000,
        expiresAt: Date.now() - 1000,
      };

      sessionStorage.setItem('volli-session', JSON.stringify(expiredSession));

      expect(secureSession.isValid()).toBe(false);
    });

    it('should return false if no session exists', () => {
      expect(secureSession.isValid()).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should extend session expiry time', () => {
      secureSession.store('test-token');

      const originalSession = JSON.parse(sessionStorage.getItem('volli-session')!);
      const originalExpiry = originalSession.expiresAt;

      // Wait a bit to ensure time difference
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      secureSession.refresh();

      const refreshedSession = JSON.parse(sessionStorage.getItem('volli-session')!);
      expect(refreshedSession.expiresAt).toBeGreaterThan(originalExpiry);

      vi.useRealTimers();
    });

    it('should do nothing if no session exists', () => {
      secureSession.refresh();
      expect(sessionStorage.getItem('volli-session')).toBeNull();
    });
  });

  describe('getTimeRemaining', () => {
    it('should return remaining time for valid session', () => {
      secureSession.store('test-token');

      const remaining = secureSession.getTimeRemaining();

      // Should be close to 15 minutes (with some tolerance)
      expect(remaining).toBeGreaterThan(SESSION_TIMEOUT - 1000);
      expect(remaining).toBeLessThanOrEqual(SESSION_TIMEOUT);
    });

    it('should return 0 for expired session', () => {
      const expiredSession = {
        token: 'expired-token',
        createdAt: Date.now() - 20 * 60 * 1000,
        expiresAt: Date.now() - 1000,
      };

      sessionStorage.setItem('volli-session', JSON.stringify(expiredSession));

      expect(secureSession.getTimeRemaining()).toBe(0);
    });

    it('should return 0 if no session exists', () => {
      expect(secureSession.getTimeRemaining()).toBe(0);
    });
  });

  describe('auto-cleanup', () => {
    it('should automatically remove session after timeout', () => {
      vi.useFakeTimers();

      secureSession.store('test-token');
      expect(sessionStorage.getItem('volli-session')).toBeTruthy();

      // Fast-forward past the timeout
      vi.advanceTimersByTime(SESSION_TIMEOUT + 1000);

      // Session should be automatically removed
      expect(sessionStorage.getItem('volli-session')).toBeNull();

      vi.useRealTimers();
    });
  });
});
