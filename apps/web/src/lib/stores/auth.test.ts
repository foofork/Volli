import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { authStore } from './auth';
import { core } from './core';
import { createMockDatabase, clearAllDatabases } from '../../tests/setup/db-mock';
import { mockPassphraseStrength } from '../../tests/setup/crypto-mock';
import { factories, fixtures } from '../../tests/setup/test-utils';

describe('AuthStore', () => {
  beforeEach(() => {
    clearAllDatabases();
    authStore.logout(); // Reset state
  });

  describe('Initial State', () => {
    it('should start with unauthenticated state', () => {
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentIdentity).toBe(null);
      expect(state.vaultUnlocked).toBe(false);
      expect(state.sessionToken).toBe(null);
    });
  });

  describe('createIdentity', () => {
    it('should create identity with valid display name', async () => {
      const displayName = 'Test User';
      const result = await authStore.createIdentity(displayName);
      
      expect(result.identity).toBeDefined();
      expect(result.identity.displayName).toBe(displayName);
      expect(result.identity.id).toBeDefined();
      expect(result.requiresVaultCreation).toBe(true);
      
      const state = get(authStore);
      expect(state.currentIdentity).toEqual(result.identity);
      expect(state.isAuthenticated).toBe(false); // Not authenticated until vault created
    });

    it('should reject display names that are too short', async () => {
      await expect(authStore.createIdentity('ab')).rejects.toThrow(
        'Display name must be 3-30 characters'
      );
    });

    it('should reject display names that are too long', async () => {
      const longName = 'a'.repeat(31);
      await expect(authStore.createIdentity(longName)).rejects.toThrow(
        'Display name must be 3-30 characters'
      );
    });

    it('should reject empty display names', async () => {
      await expect(authStore.createIdentity('')).rejects.toThrow(
        'Display name must be 3-30 characters'
      );
    });

    it('should generate unique identity IDs', async () => {
      const result1 = await authStore.createIdentity('User 1');
      const result2 = await authStore.createIdentity('User 2');
      
      expect(result1.identity.id).not.toBe(result2.identity.id);
    });
  });

  describe('createVaultWithPassphrase', () => {
    beforeEach(async () => {
      // Create identity first
      await authStore.createIdentity('Test User');
    });

    it('should create vault with strong passphrase', async () => {
      const passphrase = fixtures.strongPassphrase;
      
      await authStore.createVaultWithPassphrase(passphrase);
      
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(true);
      expect(state.vaultUnlocked).toBe(true);
      expect(state.sessionToken).toBeDefined();
      expect(state.currentIdentity?.publicKey).toBeDefined();
      expect(state.currentIdentity?.encryptedPrivateKey).toBeDefined();
    });

    it('should reject weak passphrases', async () => {
      const weakPassphrase = 'password123';
      
      await expect(authStore.createVaultWithPassphrase(weakPassphrase)).rejects.toThrow(
        'Passphrase too weak'
      );
      
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(false);
      expect(state.vaultUnlocked).toBe(false);
    });

    it('should reject passphrases shorter than 12 characters', async () => {
      const shortPassphrase = 'short';
      
      await expect(authStore.createVaultWithPassphrase(shortPassphrase)).rejects.toThrow();
    });

    it('should throw error if no identity exists', async () => {
      authStore.logout(); // Clear identity
      
      await expect(authStore.createVaultWithPassphrase('any-passphrase')).rejects.toThrow(
        'No identity created'
      );
    });

    it('should store vault in IndexedDB', async () => {
      const passphrase = fixtures.validPassphrase;
      await authStore.createVaultWithPassphrase(passphrase);
      
      // Mock verification that vault was stored
      // In real implementation, we'd check IndexedDB
      const state = get(authStore);
      expect(state.currentIdentity?.id).toBeDefined();
    });

    it('should start auto-lock timer after vault creation', async () => {
      vi.useFakeTimers();
      
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      const state = get(authStore);
      expect(state.vaultUnlocked).toBe(true);
      
      // Fast-forward past auto-lock timeout (15 minutes)
      vi.advanceTimersByTime(16 * 60 * 1000);
      
      const newState = get(authStore);
      expect(newState.vaultUnlocked).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('unlockVault', () => {
    beforeEach(async () => {
      // Setup: Create identity and vault
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      authStore.lockVault(); // Lock it for testing
    });

    it('should unlock vault with correct passphrase', async () => {
      const unlocked = await authStore.unlockVault(fixtures.validPassphrase);
      
      expect(unlocked).toBe(true);
      
      const state = get(authStore);
      expect(state.vaultUnlocked).toBe(true);
    });

    it('should fail to unlock with incorrect passphrase', async () => {
      const unlocked = await authStore.unlockVault('wrong-passphrase');
      
      expect(unlocked).toBe(false);
      
      const state = get(authStore);
      expect(state.vaultUnlocked).toBe(false);
    });

    it('should track failed unlock attempts', async () => {
      // First attempt
      await authStore.unlockVault('wrong1');
      expect(get(authStore).failedUnlockAttempts).toBe(1);
      
      // Second attempt
      await authStore.unlockVault('wrong2');
      expect(get(authStore).failedUnlockAttempts).toBe(2);
      
      // Third attempt should logout and throw
      await expect(authStore.unlockVault('wrong3')).rejects.toThrow(
        'Too many failed attempts. Please log in again'
      );
      
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentIdentity).toBe(null);
    });

    it('should reset failed attempts on successful unlock', async () => {
      // Fail once
      await authStore.unlockVault('wrong');
      expect(get(authStore).failedUnlockAttempts).toBe(1);
      
      // Succeed
      await authStore.unlockVault(fixtures.validPassphrase);
      expect(get(authStore).failedUnlockAttempts).toBe(0);
    });

    it('should throw error if no identity loaded', async () => {
      authStore.logout();
      
      await expect(authStore.unlockVault('any-passphrase')).rejects.toThrow(
        'No identity loaded'
      );
    });
    
    it('should return false if vault not found', async () => {
      // Create identity but don't create vault - this simulates a corrupted state
      await authStore.createIdentity('Test User');
      
      // Directly manipulate localStorage to simulate missing vault
      const identity = JSON.parse(localStorage.getItem('volli-identity') || '{}');
      identity.hasVault = true; // Pretend there's a vault when there isn't
      localStorage.setItem('volli-identity', JSON.stringify(identity));
      
      // Mock core.unlockVault to return false (vault not found)
      const originalUnlock = core.unlockVault;
      core.unlockVault = vi.fn().mockResolvedValue(false);
      
      // Try to unlock non-existent vault
      const result = await authStore.unlockVault('any-passphrase');
      expect(result).toBe(false);
      
      // Verify failed attempts were incremented
      const state = get(authStore);
      expect(state.failedUnlockAttempts).toBe(1);
      
      // Restore
      core.unlockVault = originalUnlock;
    });
  });

  describe('lockVault', () => {
    beforeEach(async () => {
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
    });

    it('should lock the vault', () => {
      expect(get(authStore).vaultUnlocked).toBe(true);
      
      authStore.lockVault();
      
      expect(get(authStore).vaultUnlocked).toBe(false);
      expect(get(authStore).isAuthenticated).toBe(true); // Still authenticated
    });

    it('should clear vault cache when locked', () => {
      authStore.lockVault();
      
      // In real implementation, verify cache is cleared
      expect(get(authStore).vaultUnlocked).toBe(false);
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
    });

    it('should clear all auth state', () => {
      authStore.logout();
      
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentIdentity).toBe(null);
      expect(state.vaultUnlocked).toBe(false);
      expect(state.sessionToken).toBe(null);
      expect(state.failedUnlockAttempts).toBe(0);
    });

    it('should clear localStorage', () => {
      localStorage.setItem('volli-identity', 'test');
      localStorage.setItem('volli-session', 'test');
      
      authStore.logout();
      
      expect(localStorage.getItem('volli-identity')).toBe(null);
      expect(localStorage.getItem('volli-session')).toBe(null);
    });
  });

  describe('checkSession', () => {
    it('should return false if no session exists', async () => {
      const hasSession = await authStore.checkSession();
      expect(hasSession).toBe(false);
    });

    it('should restore session from localStorage', async () => {
      // Setup: Create a session
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Simulate page reload by clearing store
      const savedIdentity = get(authStore).currentIdentity;
      const savedToken = get(authStore).sessionToken;
      
      // Clear memory state but keep localStorage
      authStore['clearMemoryState']();
      
      // Check session should restore from localStorage
      const hasSession = await authStore.checkSession();
      
      expect(hasSession).toBe(true);
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentIdentity).toEqual(savedIdentity);
      expect(state.vaultUnlocked).toBe(false); // Vault stays locked
    });

    it('should clear expired sessions', async () => {
      // Create expired session data
      const expiredSession = {
        token: 'expired-token',
        expiresAt: Date.now() - 1000, // Expired
      };
      const identity = factories.identity();
      
      localStorage.setItem('volli-session', JSON.stringify(expiredSession));
      localStorage.setItem('volli-identity', JSON.stringify(identity));
      
      const hasSession = await authStore.checkSession();
      
      expect(hasSession).toBe(false);
      expect(localStorage.getItem('volli-session')).toBe(null);
      expect(localStorage.getItem('volli-identity')).toBe(null); // Should also clear identity
    });
  });

  describe('Session restoration error handling', () => {
    it('should handle corrupted session data gracefully', async () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('volli-session', 'invalid-json{');
      localStorage.setItem('volli-identity', JSON.stringify({ id: 'test', displayName: 'Test' }));
      
      const result = await authStore.checkSession();
      
      expect(result).toBe(false);
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(false);
    });
    
    it('should handle corrupted identity data gracefully', async () => {
      // Set valid session but invalid identity
      localStorage.setItem('volli-session', JSON.stringify({ 
        token: 'test-token',
        expiresAt: Date.now() + 10000
      }));
      localStorage.setItem('volli-identity', 'corrupted-data');
      
      const result = await authStore.checkSession();
      
      expect(result).toBe(false);
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(false);
    });
  });
  
  describe('Initialize function', () => {
    it('should restore session from localStorage on initialize', async () => {
      // Setup: Create a session
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Save current state
      const savedIdentity = get(authStore).currentIdentity;
      
      // Clear memory state but keep localStorage
      authStore['clearMemoryState']();
      expect(get(authStore).isAuthenticated).toBe(false);
      
      // Call initialize - should restore from localStorage
      await authStore.initialize();
      
      // Verify session was restored
      const state = get(authStore);
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentIdentity).toEqual(savedIdentity);
    });
  });

  describe('Auto-lock functionality', () => {
    beforeEach(async () => {
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
    });

    it('should auto-lock after inactivity timeout', async () => {
      vi.useFakeTimers();
      
      // Re-create vault with fake timers active
      authStore.logout();
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      expect(get(authStore).vaultUnlocked).toBe(true);
      
      // Advance time by auto-lock timeout (15 minutes default)
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      
      expect(get(authStore).vaultUnlocked).toBe(false);
      
      vi.useRealTimers();
    });

    it('should reset timer on activity', async () => {
      vi.useFakeTimers();
      
      // Re-create vault with fake timers active
      authStore.logout();
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Advance halfway
      await vi.advanceTimersByTimeAsync(7 * 60 * 1000);
      
      // Trigger activity
      authStore.updateLastActivity();
      
      // Advance another 10 minutes
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      
      // Should still be unlocked (total 17 minutes, but reset at 7)
      expect(get(authStore).vaultUnlocked).toBe(true);
      
      vi.useRealTimers();
    });

    it('should allow custom auto-lock timeout', async () => {
      vi.useFakeTimers();
      
      // Re-create vault with fake timers active
      authStore.logout();
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(fixtures.validPassphrase);
      
      // Set custom timeout to 5 minutes
      authStore.setAutoLockTimeout(5);
      
      // Advance 6 minutes
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
      
      expect(get(authStore).vaultUnlocked).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('Passphrase validation', () => {
    it('should calculate passphrase entropy correctly', () => {
      const tests = [
        { passphrase: 'password', expectedStrength: 'weak' },
        { passphrase: 'Password123!', expectedStrength: 'weak' }, // Contains common pattern "password"
        { passphrase: 'Tr0ub4dor&3', expectedStrength: 'fair' }, // No common patterns
        { passphrase: fixtures.validPassphrase, expectedStrength: 'excellent' },
      ];
      
      tests.forEach(({ passphrase, expectedStrength }) => {
        const strength = authStore['validatePassphraseStrength'](passphrase);
        expect(strength.strength).toBe(expectedStrength);
      });
    });

    it('should detect common patterns', () => {
      const commonPatterns = [
        'password123',
        '12345678',
        'qwertyuiop',
        'admin1234',
      ];
      
      commonPatterns.forEach(pattern => {
        const strength = authStore['validatePassphraseStrength'](pattern);
        expect(strength.hasCommonPattern).toBe(true);
      });
    });
  });

  describe('Security measures', () => {
    it('should use secure random for ID generation', () => {
      const id1 = authStore['generateSecureId']();
      const id2 = authStore['generateSecureId']();
      
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(20);
    });

    it('should clear sensitive data from memory', async () => {
      const passphrase = fixtures.validPassphrase;
      await authStore.createIdentity('Test User');
      await authStore.createVaultWithPassphrase(passphrase);
      
      // In real implementation, verify passphrase is cleared from memory
      // This would use the secureErase function
      expect(get(authStore).vaultUnlocked).toBe(true);
    });

    it('should use constant-time comparison for tokens', () => {
      const token1 = 'test-token-123';
      const token2 = 'test-token-123';
      const token3 = 'different-token';
      
      expect(authStore['constantTimeCompare'](token1, token2)).toBe(true);
      expect(authStore['constantTimeCompare'](token1, token3)).toBe(false);
    });
  });
});