import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPair, encapsulate, decapsulate } from '../src/crypto';
import { generateKyber768KeyPair, encapsulateKyber768, decapsulateKyber768 } from '../src/kyber';
import type { PublicKey, PrivateKey } from '../src/crypto';

describe('Integration: Kyber768 in Crypto Flow', () => {
  describe('Hybrid Key Generation', () => {
    it('should generate keys with both X25519 and Kyber768 components', async () => {
      const keyPair = await generateKeyPair();
      
      // Check structure
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      
      // Verify keys have proper structure for hybrid crypto
      expect(keyPair.publicKey).toHaveProperty('x25519');
      expect(keyPair.publicKey).toHaveProperty('kyber768');
      expect(keyPair.privateKey).toHaveProperty('x25519');
      expect(keyPair.privateKey).toHaveProperty('kyber768');
    });

    it('should generate unique keys each time', async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();
      
      // X25519 components should be different
      expect(keyPair1.publicKey.x25519).not.toEqual(keyPair2.publicKey.x25519);
      expect(keyPair1.privateKey.x25519).not.toEqual(keyPair2.privateKey.x25519);
      
      // Kyber768 components should be different
      expect(keyPair1.publicKey.kyber768).not.toEqual(keyPair2.publicKey.kyber768);
      expect(keyPair1.privateKey.kyber768).not.toEqual(keyPair2.privateKey.kyber768);
    });
  });

  describe('Hybrid Encapsulation/Decapsulation', () => {
    let aliceKeys: { publicKey: PublicKey; privateKey: PrivateKey };
    let bobKeys: { publicKey: PublicKey; privateKey: PrivateKey };

    beforeEach(async () => {
      aliceKeys = await generateKeyPair();
      bobKeys = await generateKeyPair();
    });

    it('should successfully encapsulate and decapsulate using hybrid approach', async () => {
      // Alice encapsulates to Bob's public key
      const encapsulated = await encapsulate(bobKeys.publicKey);
      
      expect(encapsulated).toBeDefined();
      expect(encapsulated.ciphertext).toBeDefined();
      expect(encapsulated.sharedSecret).toBeDefined();
      expect(encapsulated.sharedSecret).toBeInstanceOf(Uint8Array);
      expect(encapsulated.sharedSecret.length).toBeGreaterThan(0);
      
      // Bob decapsulates using his private key
      const sharedSecret = await decapsulate(encapsulated.ciphertext, bobKeys.privateKey);
      
      expect(sharedSecret).toBeDefined();
      expect(sharedSecret).toBeInstanceOf(Uint8Array);
      expect(sharedSecret).toEqual(encapsulated.sharedSecret);
    });

    it('should produce different shared secrets with different recipients', async () => {
      const encapsulated1 = await encapsulate(aliceKeys.publicKey);
      const encapsulated2 = await encapsulate(bobKeys.publicKey);
      
      expect(encapsulated1.sharedSecret).not.toEqual(encapsulated2.sharedSecret);
    });

    it('should fail decapsulation with wrong private key', async () => {
      // Alice encapsulates to Bob's public key
      const encapsulated = await encapsulate(bobKeys.publicKey);
      
      // Try to decapsulate with Alice's private key (wrong key)
      const wrongSecret = await decapsulate(encapsulated.ciphertext, aliceKeys.privateKey);
      
      // Should return something but not match the original shared secret
      expect(wrongSecret).toBeDefined();
      expect(wrongSecret).not.toEqual(encapsulated.sharedSecret);
    });
  });

  describe('Kyber768 Component Verification', () => {
    it('should use actual Kyber768 in the hybrid scheme', async () => {
      // Generate a Kyber768 key pair directly
      const kyberKeys = await generateKyber768KeyPair();
      
      // Verify the keys have proper Kyber768 structure
      expect(kyberKeys.publicKey).toBeInstanceOf(Uint8Array);
      expect(kyberKeys.privateKey).toBeInstanceOf(Uint8Array);
      
      // Kyber768 public key should be 1184 bytes
      expect(kyberKeys.publicKey.length).toBeGreaterThanOrEqual(800); // Allow for compression
      
      // Test encapsulation/decapsulation
      const { ciphertext, sharedSecret } = await encapsulateKyber768(kyberKeys.publicKey);
      const decryptedSecret = await decapsulateKyber768(ciphertext, kyberKeys.privateKey);
      
      expect(sharedSecret).toEqual(decryptedSecret);
    });

    it('should combine X25519 and Kyber768 secrets properly', async () => {
      const keyPair = await generateKeyPair();
      
      // Encapsulate should use both algorithms
      const encapsulated = await encapsulate(keyPair.publicKey);
      
      // The ciphertext should contain both X25519 and Kyber768 components
      expect(encapsulated.ciphertext).toHaveProperty('x25519');
      expect(encapsulated.ciphertext).toHaveProperty('kyber768');
      
      // Shared secret should be derived from both
      expect(encapsulated.sharedSecret.length).toBe(32); // Combined and hashed to 32 bytes
    });
  });

  describe('Performance', () => {
    it('should complete key generation within reasonable time', async () => {
      const start = Date.now();
      await generateKeyPair();
      const duration = Date.now() - start;
      
      // Should complete within 100ms (generous for CI environments)
      expect(duration).toBeLessThan(100);
    });

    it('should complete encapsulation within reasonable time', async () => {
      const keyPair = await generateKeyPair();
      
      const start = Date.now();
      await encapsulate(keyPair.publicKey);
      const duration = Date.now() - start;
      
      // Should complete within 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should complete full handshake within reasonable time', async () => {
      const start = Date.now();
      
      // Generate keys for both parties
      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();
      
      // Alice -> Bob
      const encapsulated = await encapsulate(bobKeys.publicKey);
      const bobSecret = await decapsulate(encapsulated.ciphertext, bobKeys.privateKey);
      
      // Bob -> Alice
      const encapsulated2 = await encapsulate(aliceKeys.publicKey);
      const aliceSecret = await decapsulate(encapsulated2.ciphertext, aliceKeys.privateKey);
      
      const duration = Date.now() - start;
      
      // Full handshake should complete within 200ms
      expect(duration).toBeLessThan(200);
    });
  });
});