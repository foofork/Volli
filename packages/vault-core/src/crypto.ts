import sodium from 'libsodium-wrappers';

/**
 * Cryptographic utilities for vault storage
 */

// Initialize sodium library
let sodiumReady = false;

export async function initCrypto(): Promise<void> {
  if (!sodiumReady) {
    await sodium.ready;
    sodiumReady = true;
  }
}

/**
 * Encrypt data using XChaCha20-Poly1305
 */
export function encryptData(data: Uint8Array, key: Uint8Array): {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
} {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(data, null, null, nonce, key);
  
  return { ciphertext, nonce };
}

/**
 * Decrypt data using XChaCha20-Poly1305
 */
export function decryptData(
  ciphertext: Uint8Array, 
  nonce: Uint8Array, 
  key: Uint8Array
): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, null, nonce, key);
}

/**
 * Generate cryptographic hash of data
 */
export function hashData(data: Uint8Array): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  return sodium.crypto_generichash(32, data);
}

/**
 * Generate secure random bytes
 */
export function randomBytes(length: number): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  return sodium.randombytes_buf(length);
}

/**
 * Derive key from password using Argon2id
 */
export function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  opsLimit: number = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
  memLimit: number = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  return sodium.crypto_pwhash(
    32, // 256-bit key
    password,
    salt,
    opsLimit,
    memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}

/**
 * Generate salt for key derivation
 */
export function generateSalt(): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
}

/**
 * Generate encryption key
 */
export function generateEncryptionKey(): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  return sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
}

/**
 * Securely wipe data from memory
 */
export function secureWipe(data: Uint8Array): void {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  sodium.memzero(data);
}

/**
 * Constant-time comparison
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  return sodium.memcmp(a, b);
}

/**
 * Create MAC (Message Authentication Code) for integrity verification
 */
export function createMAC(message: Uint8Array, key: Uint8Array): Uint8Array {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  return sodium.crypto_auth(message, key);
}

/**
 * Verify MAC
 */
export function verifyMAC(message: Uint8Array, mac: Uint8Array, key: Uint8Array): boolean {
  if (!sodiumReady) {
    throw new Error('Crypto not initialized. Call initCrypto() first.');
  }
  
  try {
    return sodium.crypto_auth_verify(mac, message, key);
  } catch {
    return false;
  }
}