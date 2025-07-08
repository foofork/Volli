import { describe, it, expect, beforeAll } from 'vitest';
import { initCrypto, encryptData, generateEncryptionKey } from './crypto';

describe('Crypto Module', () => {
  beforeAll(async () => {
    await initCrypto();
  });

  it('should generate encryption key', () => {
    const key = generateEncryptionKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32); // 256-bit key
  });

  it('should encrypt and decrypt data', () => {
    const key = generateEncryptionKey();
    const data = new TextEncoder().encode('Hello, World!');

    // Convert to proper Uint8Array
    const dataArray = new Uint8Array(data);
    const keyArray = new Uint8Array(key);

    const { ciphertext, nonce } = encryptData(dataArray, keyArray);

    expect(ciphertext).toBeInstanceOf(Uint8Array);
    expect(nonce).toBeInstanceOf(Uint8Array);
  });
});
