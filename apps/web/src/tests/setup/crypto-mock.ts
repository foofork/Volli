import { vi } from 'vitest';

export function mockCrypto() {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Mock crypto.getRandomValues
  Object.defineProperty(global, 'crypto', {
    value: {
      ...global.crypto,
      getRandomValues: vi.fn((array: Uint8Array) => {
      // Fill with deterministic values for tests
      for (let i = 0; i < array.length; i++) {
        array[i] = (i * 37) % 256;
      }
      return array;
    }),
    subtle: {
      generateKey: vi.fn().mockImplementation(async (algorithm, extractable, keyUsages) => {
        if (algorithm.name === 'RSA-OAEP' || algorithm.name === 'RSA-PSS') {
          return {
            publicKey: {
              type: 'public',
              algorithm,
              extractable: true,
              usages: keyUsages.filter((u: string) => ['encrypt', 'verify'].includes(u)),
            },
            privateKey: {
              type: 'private',
              algorithm,
              extractable: false,
              usages: keyUsages.filter((u: string) => ['decrypt', 'sign'].includes(u)),
            },
          };
        }
        return {
          type: 'secret',
          algorithm,
          extractable,
          usages: keyUsages,
        };
      }),
      
      importKey: vi.fn().mockImplementation(async (format, keyData, algorithm, extractable, keyUsages) => {
        return {
          type: 'secret',
          algorithm,
          extractable,
          usages: keyUsages,
        };
      }),
      
      deriveKey: vi.fn().mockImplementation(async (algorithm, baseKey, derivedKeyAlgorithm, extractable, keyUsages) => {
        return {
          type: 'secret',
          algorithm: derivedKeyAlgorithm,
          extractable,
          usages: keyUsages,
        };
      }),
      
      deriveBits: vi.fn().mockImplementation(async (algorithm, baseKey, length) => {
        const bytes = new Uint8Array(length / 8);
        crypto.getRandomValues(bytes);
        return bytes.buffer;
      }),
      
      encrypt: vi.fn().mockImplementation(async (algorithm, key, data) => {
        // Simple mock encryption - just prepend a magic number and the IV
        const dataArray = new Uint8Array(data);
        const iv = algorithm.iv ? new Uint8Array(algorithm.iv) : new Uint8Array(12);
        const encrypted = new Uint8Array(4 + iv.length + dataArray.length + 16); // 4 for magic, iv, data, 16 for tag
        
        // Magic number to identify encrypted data
        encrypted[0] = 0xDE;
        encrypted[1] = 0xAD;
        encrypted[2] = 0xBE;
        encrypted[3] = 0xEF;
        
        // Copy IV
        encrypted.set(iv, 4);
        
        // Copy data (in real encryption this would be transformed)
        encrypted.set(dataArray, 4 + iv.length);
        
        // Mock auth tag
        crypto.getRandomValues(encrypted.subarray(encrypted.length - 16));
        
        return encrypted.buffer;
      }),
      
      decrypt: vi.fn().mockImplementation(async (algorithm, key, data) => {
        const dataArray = new Uint8Array(data);
        
        // Check magic number
        if (dataArray[0] !== 0xDE || dataArray[1] !== 0xAD || 
            dataArray[2] !== 0xBE || dataArray[3] !== 0xEF) {
          throw new Error('Decryption failed');
        }
        
        const ivLength = algorithm.iv ? new Uint8Array(algorithm.iv).length : 12;
        const start = 4 + ivLength;
        const end = dataArray.length - 16; // Remove auth tag
        
        return dataArray.slice(start, end).buffer;
      }),
      
      sign: vi.fn().mockImplementation(async (algorithm, key, data) => {
        // Simple mock signature
        const signature = new Uint8Array(64);
        crypto.getRandomValues(signature);
        return signature.buffer;
      }),
      
      verify: vi.fn().mockImplementation(async (algorithm, key, signature, data) => {
        // Always return true for mock
        return true;
      }),
      
      digest: vi.fn().mockImplementation(async (algorithm, data) => {
        // Simple mock hash
        const hash = new Uint8Array(32);
        const dataArray = new Uint8Array(data);
        
        // Create a simple deterministic hash
        for (let i = 0; i < hash.length; i++) {
          hash[i] = dataArray.reduce((acc, val, idx) => (acc + val * (idx + 1)) % 256, i) % 256;
        }
        
        return hash.buffer;
      }),
      
      exportKey: vi.fn().mockImplementation(async (format, key) => {
        if (format === 'raw') {
          const keyData = new Uint8Array(32);
          crypto.getRandomValues(keyData);
          return keyData.buffer;
        }
        return { 
          kty: 'oct',
          k: 'mock-key-data',
          alg: 'A256GCM',
          ext: true,
          key_ops: key.usages,
        };
      }),
      
      wrapKey: vi.fn().mockImplementation(async (format, key, wrappingKey, wrapAlgo) => {
        // Mock wrapped key
        const wrapped = new Uint8Array(48);
        crypto.getRandomValues(wrapped);
        return wrapped.buffer;
      }),
      
      unwrapKey: vi.fn().mockImplementation(async (format, wrappedKey, unwrappingKey, unwrapAlgo, unwrappedKeyAlgo, extractable, keyUsages) => {
        return {
          type: 'secret',
          algorithm: unwrappedKeyAlgo,
          extractable,
          usages: keyUsages,
        };
      }),
    },
  } as unknown as Crypto,
    writable: true,
    configurable: true
  });
}

// Helper to create deterministic "random" values for testing
export function createDeterministicRandom(seed: number = 42) {
  let value = seed;
  
  return {
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        value = (value * 1103515245 + 12345) & 0x7fffffff;
        array[i] = value % 256;
      }
      return array;
    },
  };
}

// Helper to generate mock key material
export function generateMockKeyMaterial(length: number = 32): ArrayBuffer {
  const keyData = new Uint8Array(length);
  crypto.getRandomValues(keyData);
  return keyData.buffer;
}

// Mock passphrase strength calculator
export function mockPassphraseStrength(passphrase: string): { entropy: number; strength: string } {
  const length = passphrase.length;
  const hasLower = /[a-z]/.test(passphrase);
  const hasUpper = /[A-Z]/.test(passphrase);
  const hasNumber = /[0-9]/.test(passphrase);
  const hasSpecial = /[^a-zA-Z0-9]/.test(passphrase);
  
  let charsetSize = 0;
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasNumber) charsetSize += 10;
  if (hasSpecial) charsetSize += 32;
  
  const entropy = length * Math.log2(charsetSize || 1);
  
  let strength = 'weak';
  if (entropy >= 60) strength = 'fair';
  if (entropy >= 80) strength = 'good';
  if (entropy >= 100) strength = 'strong';
  if (entropy >= 128) strength = 'excellent';
  
  return { entropy, strength };
}