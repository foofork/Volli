// Mock libsodium-wrappers for testing
import { vi } from 'vitest';

// Store encrypted data info for validation
const encryptedDataStore = new Map<string, { keyHash: number }>();

// Mock sodium constants and functions
export const mockSodium = {
  ready: Promise.resolve(),
  crypto_pwhash_SALTBYTES: 16,
  crypto_pwhash_OPSLIMIT_INTERACTIVE: 2,
  crypto_pwhash_MEMLIMIT_INTERACTIVE: 67108864,
  crypto_pwhash_ALG_ARGON2ID13: 2,
  crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: 24,
  crypto_aead_xchacha20poly1305_ietf_KEYBYTES: 32,
  crypto_sign_PUBLICKEYBYTES: 32,
  crypto_sign_SECRETKEYBYTES: 64,
  crypto_box_PUBLICKEYBYTES: 32,
  crypto_box_SECRETKEYBYTES: 32,
  crypto_generichash_BYTES: 32,
  crypto_auth_KEYBYTES: 32,
  
  randombytes_buf: vi.fn((length: number) => {
    const buffer = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      buffer[i] = (i * 37 + 42) % 256;
    }
    return buffer;
  }),
  
  crypto_pwhash: vi.fn((outlen: number, passwd: string, salt: Uint8Array, opslimit: number, memlimit: number, alg: number) => {
    // Mock key derivation - deterministic for testing but password-dependent
    const key = new Uint8Array(outlen);
    
    // Create a simple hash of the password
    let passwdHash = 0;
    for (let i = 0; i < passwd.length; i++) {
      passwdHash = ((passwdHash << 5) - passwdHash) + passwd.charCodeAt(i);
      passwdHash = passwdHash & 0xFFFFFFFF;
    }
    
    // Generate key based on password hash and salt
    for (let i = 0; i < outlen; i++) {
      const saltByte = salt[i % salt.length];
      const passwdByte = (passwdHash >> ((i % 4) * 8)) & 0xFF;
      key[i] = (passwdByte + saltByte + i) % 256;
    }
    
    return key;
  }),
  
  crypto_aead_xchacha20poly1305_ietf_encrypt: vi.fn((message: Uint8Array, ad: null, nsec: null, nonce: Uint8Array, key: Uint8Array) => {
    // Mock encryption - prefix with magic bytes and include key-dependent auth tag
    const encrypted = new Uint8Array(message.length + 16); // +16 for auth tag
    encrypted.set([0xDE, 0xAD, 0xBE, 0xEF], 0);
    encrypted.set(message, 4);
    
    // Create a simple key-dependent auth tag
    let keySum = 0;
    for (let i = 0; i < key.length; i++) {
      keySum += key[i];
    }
    
    // Store key hash for later validation
    const ciphertextId = Array.from(encrypted.slice(0, 8)).join(',');
    encryptedDataStore.set(ciphertextId, { keyHash: keySum });
    
    // Mock auth tag based on key
    for (let i = message.length + 4; i < encrypted.length; i++) {
      encrypted[i] = (keySum + i) % 256;
    }
    return encrypted;
  }),
  
  crypto_aead_xchacha20poly1305_ietf_decrypt: vi.fn((nsec: null, ciphertext: Uint8Array, ad: null, nonce: Uint8Array, key: Uint8Array) => {
    // Mock decryption - check magic bytes
    if (ciphertext[0] !== 0xDE || ciphertext[1] !== 0xAD || 
        ciphertext[2] !== 0xBE || ciphertext[3] !== 0xEF) {
      throw new Error('Decryption failed');
    }
    
    // Get stored key hash for this ciphertext
    const ciphertextId = Array.from(ciphertext.slice(0, 8)).join(',');
    const storedInfo = encryptedDataStore.get(ciphertextId);
    
    // Calculate current key hash
    let keySum = 0;
    for (let i = 0; i < key.length; i++) {
      keySum += key[i];
    }
    
    // Verify key matches what was used for encryption
    if (storedInfo && storedInfo.keyHash !== keySum) {
      throw new Error('Decryption failed');
    }
    
    // Check auth tag (last 12 bytes)
    const messageLength = ciphertext.length - 16;
    for (let i = messageLength + 4; i < ciphertext.length; i++) {
      const expectedByte = (keySum + i) % 256;
      if (ciphertext[i] !== expectedByte) {
        throw new Error('Decryption failed');
      }
    }
    
    return ciphertext.slice(4, messageLength + 4);
  }),
  
  crypto_sign_keypair: vi.fn(() => {
    const publicKey = new Uint8Array(32);
    const privateKey = new Uint8Array(64);
    for (let i = 0; i < 32; i++) {
      publicKey[i] = i;
      privateKey[i] = i + 32;
    }
    for (let i = 32; i < 64; i++) {
      privateKey[i] = i;
    }
    return { publicKey, privateKey };
  }),
  
  crypto_box_keypair: vi.fn(() => {
    const publicKey = new Uint8Array(32);
    const privateKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      publicKey[i] = i * 2;
      privateKey[i] = i * 2 + 1;
    }
    return { publicKey, privateKey };
  }),
  
  crypto_sign_detached: vi.fn((message: Uint8Array, privateKey: Uint8Array) => {
    const signature = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      signature[i] = (message[i % message.length] + privateKey[i % privateKey.length]) % 256;
    }
    return signature;
  }),
  
  crypto_sign_verify_detached: vi.fn((signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array) => {
    // Always return true in tests
    return true;
  }),
  
  crypto_generichash: vi.fn((outlen: number, input: Uint8Array, key?: Uint8Array) => {
    const hash = new Uint8Array(outlen);
    for (let i = 0; i < outlen; i++) {
      hash[i] = input[i % input.length] % 256;
    }
    return hash;
  }),
  
  from_base64: vi.fn((input: string) => {
    // Simple base64 decode mock
    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }),
  
  to_base64: vi.fn((input: Uint8Array) => {
    // Simple base64 encode mock
    let binary = '';
    for (let i = 0; i < input.length; i++) {
      binary += String.fromCharCode(input[i]);
    }
    return btoa(binary);
  }),
  
  crypto_auth: vi.fn((message: Uint8Array, key: Uint8Array) => {
    const mac = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      mac[i] = (message[i % message.length] + key[i % key.length]) % 256;
    }
    return mac;
  }),
  
  crypto_auth_verify: vi.fn(() => true),
  
  memzero: vi.fn((data: Uint8Array) => {
    data.fill(0);
  }),
  
  memcmp: vi.fn((a: Uint8Array, b: Uint8Array) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }),
};

// Set ready flag
let sodiumReady = false;

// Override ready promise
Object.defineProperty(mockSodium, 'ready', {
  get: () => {
    if (!sodiumReady) {
      sodiumReady = true;
      return Promise.resolve();
    }
    return Promise.resolve();
  }
});

// Export as both default and named exports to match libsodium-wrappers
export default mockSodium;
export const {
  ready,
  crypto_pwhash_SALTBYTES,
  crypto_pwhash_OPSLIMIT_INTERACTIVE,
  crypto_pwhash_MEMLIMIT_INTERACTIVE,
  crypto_pwhash_ALG_ARGON2ID13,
  crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
  crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
  crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES,
  crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES,
  crypto_generichash_BYTES,
  crypto_auth_KEYBYTES,
  randombytes_buf,
  crypto_pwhash,
  crypto_aead_xchacha20poly1305_ietf_encrypt,
  crypto_aead_xchacha20poly1305_ietf_decrypt,
  crypto_sign_keypair,
  crypto_box_keypair,
  crypto_sign_detached,
  crypto_sign_verify_detached,
  crypto_generichash,
  from_base64,
  to_base64,
  crypto_auth,
  crypto_auth_verify,
  memzero,
  memcmp,
} = mockSodium;