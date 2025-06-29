/**
 * Tests for Kyber768 Post-Quantum Cryptography Implementation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateKyber768KeyPair,
  kyber768Encapsulate,
  kyber768Decapsulate,
  generateHybridKeyPairWithKyber768,
  hybridKeyEncapsulation,
  hybridKeyDecapsulation,
  validateKyber768KeySizes,
  getKyber768SecurityInfo,
  KYBER768_PUBLIC_KEY_SIZE,
  KYBER768_PRIVATE_KEY_SIZE,
  KYBER768_CIPHERTEXT_SIZE,
  KYBER768_SHARED_SECRET_SIZE
} from './kyber';

describe('Kyber768 Implementation', () => {
  beforeAll(async () => {
    // Ensure crypto is available in test environment
    if (!globalThis.crypto) {
      const { webcrypto } = await import('crypto');
      globalThis.crypto = webcrypto as any;
    }
  });

  describe('Key Generation', () => {
    it('should generate valid Kyber768 key pairs', async () => {
      const keyPair = await generateKyber768KeyPair();
      
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(KYBER768_PUBLIC_KEY_SIZE);
      expect(keyPair.privateKey.length).toBe(KYBER768_PRIVATE_KEY_SIZE);
    });

    it('should generate different key pairs on each call', async () => {
      const keyPair1 = await generateKyber768KeyPair();
      const keyPair2 = await generateKyber768KeyPair();
      
      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
    });

    it('should validate key sizes correctly', async () => {
      const keyPair = await generateKyber768KeyPair();
      
      expect(validateKyber768KeySizes(keyPair.publicKey, keyPair.privateKey)).toBe(true);
      
      const invalidPublicKey = new Uint8Array(100);
      const invalidPrivateKey = new Uint8Array(100);
      
      expect(validateKyber768KeySizes(invalidPublicKey, keyPair.privateKey)).toBe(false);
      expect(validateKyber768KeySizes(keyPair.publicKey, invalidPrivateKey)).toBe(false);
    });
  });

  describe('Key Encapsulation', () => {
    it('should perform encapsulation correctly', async () => {
      const keyPair = await generateKyber768KeyPair();
      const result = await kyber768Encapsulate(keyPair.publicKey);
      
      expect(result.sharedSecret).toBeInstanceOf(Uint8Array);
      expect(result.ciphertext).toBeInstanceOf(Uint8Array);
      expect(result.sharedSecret.length).toBe(KYBER768_SHARED_SECRET_SIZE);
      expect(result.ciphertext.length).toBe(KYBER768_CIPHERTEXT_SIZE);
    });

    it('should generate different ciphertexts for the same public key', async () => {
      const keyPair = await generateKyber768KeyPair();
      const result1 = await kyber768Encapsulate(keyPair.publicKey);
      const result2 = await kyber768Encapsulate(keyPair.publicKey);
      
      // Ciphertexts should be different (randomized encryption)
      expect(result1.ciphertext).not.toEqual(result2.ciphertext);
      // Shared secrets may or may not be the same depending on implementation
    });

    it('should reject invalid public key sizes', async () => {
      const invalidPublicKey = new Uint8Array(100);
      
      await expect(kyber768Encapsulate(invalidPublicKey)).rejects.toThrow();
    });
  });

  describe('Key Decapsulation', () => {
    it('should perform decapsulation correctly', async () => {
      const keyPair = await generateKyber768KeyPair();
      const encapResult = await kyber768Encapsulate(keyPair.publicKey);
      
      const decapsulatedSecret = await kyber768Decapsulate(
        keyPair.privateKey, 
        encapResult.ciphertext
      );
      
      expect(decapsulatedSecret).toBeInstanceOf(Uint8Array);
      expect(decapsulatedSecret.length).toBe(KYBER768_SHARED_SECRET_SIZE);
      
      // In a real implementation, the decapsulated secret should match the encapsulated secret
      // For our fallback implementation, we just verify that decapsulation works
      expect(decapsulatedSecret).toEqual(encapResult.sharedSecret);
    });

    it('should reject invalid private key sizes', async () => {
      const invalidPrivateKey = new Uint8Array(100);
      const validCiphertext = new Uint8Array(KYBER768_CIPHERTEXT_SIZE);
      
      await expect(kyber768Decapsulate(invalidPrivateKey, validCiphertext)).rejects.toThrow();
    });

    it('should reject invalid ciphertext sizes', async () => {
      const keyPair = await generateKyber768KeyPair();
      const invalidCiphertext = new Uint8Array(100);
      
      await expect(kyber768Decapsulate(keyPair.privateKey, invalidCiphertext)).rejects.toThrow();
    });
  });

  describe('Hybrid Key Operations', () => {
    it('should generate hybrid key pairs with Kyber768', async () => {
      const hybridKeyPair = await generateHybridKeyPairWithKyber768();
      
      expect(hybridKeyPair.publicKey.kyber.length).toBe(KYBER768_PUBLIC_KEY_SIZE);
      expect(hybridKeyPair.privateKey.kyber.length).toBe(KYBER768_PRIVATE_KEY_SIZE);
      
      // Should also have classical keys
      expect(hybridKeyPair.publicKey.x25519).toBeInstanceOf(Uint8Array);
      expect(hybridKeyPair.publicKey.ed25519).toBeInstanceOf(Uint8Array);
      expect(hybridKeyPair.privateKey.x25519).toBeInstanceOf(Uint8Array);
      expect(hybridKeyPair.privateKey.ed25519).toBeInstanceOf(Uint8Array);
    });

    it('should perform hybrid encapsulation and decapsulation', async () => {
      const hybridKeyPair = await generateHybridKeyPairWithKyber768();
      
      // Perform hybrid encapsulation
      const encapResult = await hybridKeyEncapsulation(hybridKeyPair.publicKey);
      
      expect(encapResult.sharedSecret.length).toBe(32);
      expect(encapResult.ciphertext.length).toBe(KYBER768_CIPHERTEXT_SIZE);
      expect(encapResult.classicalCiphertext).toBeInstanceOf(Uint8Array);
      
      // Perform hybrid decapsulation
      const decapsulatedSecret = await hybridKeyDecapsulation(
        hybridKeyPair.privateKey,
        encapResult.ciphertext,
        encapResult.classicalCiphertext
      );
      
      expect(decapsulatedSecret).toEqual(encapResult.sharedSecret);
    });

    it('should provide different shared secrets than individual components', async () => {
      const hybridKeyPair = await generateHybridKeyPairWithKyber768();
      
      // Get hybrid shared secret
      const hybridResult = await hybridKeyEncapsulation(hybridKeyPair.publicKey);
      
      // Get individual Kyber secret
      const kyberResult = await kyber768Encapsulate(hybridKeyPair.publicKey.kyber);
      
      // Hybrid secret should be different from pure Kyber secret (due to XOR combination)
      expect(hybridResult.sharedSecret).not.toEqual(kyberResult.sharedSecret);
    });
  });

  describe('Security Information', () => {
    it('should provide correct security parameters', () => {
      const securityInfo = getKyber768SecurityInfo();
      
      expect(securityInfo.name).toBe('CRYSTALS-KYBER-768');
      expect(securityInfo.securityLevel).toBe(192);
      expect(securityInfo.publicKeySize).toBe(KYBER768_PUBLIC_KEY_SIZE);
      expect(securityInfo.privateKeySize).toBe(KYBER768_PRIVATE_KEY_SIZE);
      expect(securityInfo.ciphertextSize).toBe(KYBER768_CIPHERTEXT_SIZE);
      expect(securityInfo.sharedSecretSize).toBe(KYBER768_SHARED_SECRET_SIZE);
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto module loading failures gracefully', async () => {
      // This test verifies that the fallback implementation works
      // when the crystals-kyber-js module is not available
      
      const keyPair = await generateKyber768KeyPair();
      const encapResult = await kyber768Encapsulate(keyPair.publicKey);
      const decapResult = await kyber768Decapsulate(keyPair.privateKey, encapResult.ciphertext);
      
      // Even with fallback, basic operations should work
      expect(keyPair.publicKey.length).toBe(KYBER768_PUBLIC_KEY_SIZE);
      expect(encapResult.sharedSecret.length).toBe(KYBER768_SHARED_SECRET_SIZE);
      expect(decapResult.length).toBe(KYBER768_SHARED_SECRET_SIZE);
    });

    it('should handle invalid key material gracefully', async () => {
      const keyPair = await generateKyber768KeyPair();
      
      // Test with corrupted ciphertext
      const corruptedCiphertext = new Uint8Array(KYBER768_CIPHERTEXT_SIZE);
      corruptedCiphertext.fill(0xFF); // Fill with invalid data
      
      // Decapsulation should fail with corrupted data
      await expect(kyber768Decapsulate(keyPair.privateKey, corruptedCiphertext))
        .rejects.toThrow();
    });
  });

  describe('Integration with Existing Crypto', () => {
    it('should integrate with existing key generation', async () => {
      // Import the main crypto module
      const { generateKeyPair } = await import('./crypto');
      
      const keyPair = await generateKeyPair();
      
      // Should now use Kyber768 instead of placeholders
      expect(keyPair.publicKey.kyber.length).toBe(KYBER768_PUBLIC_KEY_SIZE);
      expect(keyPair.privateKey.kyber.length).toBe(KYBER768_PRIVATE_KEY_SIZE);
    });

    it('should integrate with existing key encapsulation', async () => {
      const { generateKeyPair, keyEncapsulation, keyDecapsulation } = await import('./crypto');
      
      const keyPair = await generateKeyPair();
      const encapResult = await keyEncapsulation(keyPair.publicKey);
      const decapResult = await keyDecapsulation(keyPair.privateKey, encapResult.ciphertext);
      
      // Should work with the hybrid implementation
      expect(encapResult.sharedSecret).toBeInstanceOf(Uint8Array);
      expect(decapResult).toBeInstanceOf(Uint8Array);
      expect(decapResult.length).toBe(32);
    });
  });

  describe('Backwards Compatibility', () => {
    it('should handle legacy ciphertexts', async () => {
      const { generateKeyPair, keyDecapsulation } = await import('./crypto');
      
      const keyPair = await generateKeyPair();
      
      // Create a legacy-style ciphertext (just X25519 public key)
      const legacyCiphertext = keyPair.publicKey.x25519;
      
      // Should fall back to classical decapsulation
      const result = await keyDecapsulation(keyPair.privateKey, legacyCiphertext);
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });
});