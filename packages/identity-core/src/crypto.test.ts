import { describe, it, expect, beforeAll } from 'vitest';
import {
  initCrypto,
  generateKeyPair,
  encryptData,
  decryptData,
  deriveSessionKeys,
  signData,
  verifySignature,
  keyEncapsulation,
  keyDecapsulation,
  randomBytes,
  constantTimeEqual
} from './crypto';

describe('Crypto Module', () => {
  beforeAll(async () => {
    // Initialize crypto before running tests
    await initCrypto();
  });

  describe('generateKeyPair', () => {
    it('should generate valid hybrid key pairs', async () => {
      const keyPair = await generateKeyPair();
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      
      // Check that all hybrid keys are present
      expect(keyPair.publicKey.kyber).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.dilithium).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.x25519).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.ed25519).toBeInstanceOf(Uint8Array);
      
      expect(keyPair.privateKey.kyber).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey.dilithium).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey.x25519).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey.ed25519).toBeInstanceOf(Uint8Array);
      
      // Check key sizes (approximate for placeholders)
      expect(keyPair.publicKey.x25519.length).toBe(32);
      expect(keyPair.publicKey.ed25519.length).toBe(32);
      expect(keyPair.privateKey.x25519.length).toBe(32);
      expect(keyPair.privateKey.ed25519.length).toBe(64);
    });

    it('should generate different keys each time', async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();
      
      expect(keyPair1.publicKey.x25519).not.toEqual(keyPair2.publicKey.x25519);
      expect(keyPair1.privateKey.x25519).not.toEqual(keyPair2.privateKey.x25519);
    });
  });

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const key = await randomBytes(32);
      const plaintext = new TextEncoder().encode('Hello, Volli!');
      
      const encrypted = await encryptData(plaintext, key);
      expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encrypted.nonce).toBeInstanceOf(Uint8Array);
      expect(encrypted.nonce.length).toBe(24); // XChaCha20 nonce
      
      const decrypted = await decryptData(encrypted.ciphertext, key, encrypted.nonce);
      expect(Array.from(decrypted)).toEqual(Array.from(plaintext));
      expect(new TextDecoder().decode(decrypted)).toBe('Hello, Volli!');
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const key = await randomBytes(32);
      const plaintext = new TextEncoder().encode('Hello, Volli!');
      
      const encrypted1 = await encryptData(plaintext, key);
      const encrypted2 = await encryptData(plaintext, key);
      
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
      expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    });

    it('should fail decryption with wrong key', async () => {
      const key1 = await randomBytes(32);
      const key2 = await randomBytes(32);
      const plaintext = new TextEncoder().encode('Hello, Volli!');
      
      const encrypted = await encryptData(plaintext, key1);
      
      await expect(
        decryptData(encrypted.ciphertext, key2, encrypted.nonce)
      ).rejects.toThrow();
    });
  });

  describe('deriveSessionKeys', () => {
    it('should derive consistent session keys', async () => {
      const sharedSecret = await randomBytes(32);
      const sessionId = 'test-session-123';
      
      const keys1 = await deriveSessionKeys(sharedSecret, sessionId);
      const keys2 = await deriveSessionKeys(sharedSecret, sessionId);
      
      expect(keys1.sendKey).toEqual(keys2.sendKey);
      expect(keys1.receiveKey).toEqual(keys2.receiveKey);
      expect(keys1.sendKey).not.toEqual(keys1.receiveKey);
    });

    it('should derive different keys for different sessions', async () => {
      const sharedSecret = await randomBytes(32);
      
      const keys1 = await deriveSessionKeys(sharedSecret, 'session-1');
      const keys2 = await deriveSessionKeys(sharedSecret, 'session-2');
      
      expect(keys1.sendKey).not.toEqual(keys2.sendKey);
      expect(keys1.receiveKey).not.toEqual(keys2.receiveKey);
    });
  });

  describe('keyEncapsulation and keyDecapsulation', () => {
    it('should perform key exchange correctly', async () => {
      const keyPair = await generateKeyPair();
      
      const { sharedSecret: secret1, ciphertext } = await keyEncapsulation(keyPair.publicKey);
      const secret2 = await keyDecapsulation(keyPair.privateKey, ciphertext);
      
      expect(secret1).toEqual(secret2);
      expect(secret1).toBeInstanceOf(Uint8Array);
      expect(secret1.length).toBe(32);
    });
  });

  describe('signData and verifySignature', () => {
    it('should sign and verify data correctly', async () => {
      const keyPair = await generateKeyPair();
      const data = new TextEncoder().encode('Hello, Volli!');
      
      const signature = await signData(data, keyPair.privateKey);
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(128); // Combined Ed25519 signatures
      
      const isValid = await verifySignature(data, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong public key', async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();
      const data = new TextEncoder().encode('Hello, Volli!');
      
      const signature = await signData(data, keyPair1.privateKey);
      const isValid = await verifySignature(data, signature, keyPair2.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should fail verification with tampered data', async () => {
      const keyPair = await generateKeyPair();
      const data = new TextEncoder().encode('Hello, Volli!');
      const tamperedData = new TextEncoder().encode('Hello, World!');
      
      const signature = await signData(data, keyPair.privateKey);
      const isValid = await verifySignature(tamperedData, signature, keyPair.publicKey);
      
      expect(isValid).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should generate random bytes', async () => {
      const bytes1 = await randomBytes(32);
      const bytes2 = await randomBytes(32);
      
      expect(bytes1).toBeInstanceOf(Uint8Array);
      expect(bytes1.length).toBe(32);
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should compare arrays in constant time', () => {
      const array1 = new Uint8Array([1, 2, 3, 4]);
      const array2 = new Uint8Array([1, 2, 3, 4]);
      const array3 = new Uint8Array([1, 2, 3, 5]);
      
      expect(constantTimeEqual(array1, array2)).toBe(true);
      expect(constantTimeEqual(array1, array3)).toBe(false);
    });

    it('should handle different length arrays', () => {
      const array1 = new Uint8Array([1, 2, 3]);
      const array2 = new Uint8Array([1, 2, 3, 4]);
      
      expect(constantTimeEqual(array1, array2)).toBe(false);
    });
  });
});