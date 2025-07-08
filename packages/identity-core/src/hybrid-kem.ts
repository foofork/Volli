/**
 * Hybrid Classical/Post-Quantum Key Encapsulation Mechanism
 * 
 * Implements a production-ready hybrid key exchange that combines:
 * - X25519 (classical Elliptic Curve Diffie-Hellman) 
 * - ML-KEM-768 (post-quantum key encapsulation)
 * 
 * This provides defense-in-depth security:
 * - Protection against current attacks (via X25519)
 * - Protection against future quantum computers (via ML-KEM-768)
 * - Protection against "Harvest Now, Decrypt Later" attacks
 * - Fallback security if either algorithm is compromised
 */

import { 
  generateKyber768KeyPair,
  kyber768Encapsulate,
  kyber768Decapsulate,
  KYBER768_PUBLIC_KEY_SIZE,
  KYBER768_PRIVATE_KEY_SIZE,
  KYBER768_CIPHERTEXT_SIZE,
  KYBER768_SHARED_SECRET_SIZE
} from './kyber';

/**
 * Hybrid KEM key pair interface
 */
export interface HybridKEM {
  classical: {
    publicKey: Uint8Array;   // X25519 32 bytes
    privateKey: Uint8Array;  // X25519 32 bytes
  };
  postQuantum: {
    publicKey: Uint8Array;   // ML-KEM-768 1184 bytes
    privateKey: Uint8Array;  // ML-KEM-768 2400 bytes
  };
}

/**
 * Hybrid encapsulation result
 */
export interface HybridEncapsulation {
  sharedSecret: Uint8Array;      // 32 bytes derived from both algorithms
  ciphertext: HybridCiphertext;  // Combined ciphertexts
}

/**
 * Hybrid ciphertext containing both classical and post-quantum components
 */
export interface HybridCiphertext {
  classical: Uint8Array;    // X25519 ephemeral public key (32 bytes)
  postQuantum: Uint8Array;  // ML-KEM-768 ciphertext (1088 bytes)
}

/**
 * Security level indicators for hybrid operations
 */
export enum HybridSecurityLevel {
  FULL = 'full',           // Both algorithms succeeded
  CLASSICAL_ONLY = 'classical',  // Only classical succeeded
  POST_QUANTUM_ONLY = 'pq',      // Only post-quantum succeeded
  FAILED = 'failed'              // Both algorithms failed
}

/**
 * Result of a hybrid cryptographic operation with security level indicator
 */
export interface HybridResult<T> {
  value: T;
  securityLevel: HybridSecurityLevel;
}

/**
 * Generate a new hybrid key pair
 */
export async function generateHybridKeyPair(): Promise<HybridKEM> {
  // Import libsodium for X25519
  const sodiumModule = await import('libsodium-wrappers');
  const sodium = sodiumModule.default || sodiumModule;
  await sodium.ready;
  
  // Generate classical X25519 key pair
  const classicalKeyPair = sodium.crypto_box_keypair();
  
  // Generate post-quantum ML-KEM-768 key pair
  const pqKeyPair = await generateKyber768KeyPair();
  
  return {
    classical: {
      publicKey: classicalKeyPair.publicKey,
      privateKey: classicalKeyPair.privateKey
    },
    postQuantum: {
      publicKey: pqKeyPair.publicKey,
      privateKey: pqKeyPair.privateKey
    }
  };
}

/**
 * Perform hybrid encapsulation with fallback security
 */
export async function hybridEncapsulate(
  publicKeys: Pick<HybridKEM, 'classical' | 'postQuantum'>
): Promise<HybridResult<HybridEncapsulation>> {
  const sodiumModule = await import('libsodium-wrappers');
  const sodium = sodiumModule.default || sodiumModule;
  await sodium.ready;
  
  let classicalResult: { sharedSecret: Uint8Array; ciphertext: Uint8Array } | null = null;
  let pqResult: { sharedSecret: Uint8Array; ciphertext: Uint8Array } | null = null;
  let classicalError = false;
  let pqError = false;
  
  // Try classical encapsulation
  try {
    const ephemeralKeyPair = sodium.crypto_box_keypair();
    const classicalSecret = sodium.crypto_scalarmult(
      ephemeralKeyPair.privateKey,
      publicKeys.classical.publicKey
    );
    classicalResult = {
      sharedSecret: classicalSecret,
      ciphertext: ephemeralKeyPair.publicKey
    };
  } catch (error) {
    console.warn('Classical encapsulation failed:', error);
    classicalError = true;
  }
  
  // Try post-quantum encapsulation
  try {
    pqResult = await kyber768Encapsulate(publicKeys.postQuantum.publicKey);
  } catch (error) {
    console.warn('Post-quantum encapsulation failed:', error);
    pqError = true;
  }
  
  // Determine security level and derive shared secret
  let securityLevel: HybridSecurityLevel;
  let sharedSecret: Uint8Array;
  
  if (classicalResult && pqResult) {
    // Both succeeded - full hybrid security
    securityLevel = HybridSecurityLevel.FULL;
    sharedSecret = await deriveHybridSharedSecret(
      pqResult.sharedSecret,
      classicalResult.sharedSecret
    );
  } else if (classicalResult && !pqResult) {
    // Only classical succeeded
    securityLevel = HybridSecurityLevel.CLASSICAL_ONLY;
    sharedSecret = classicalResult.sharedSecret;
  } else if (!classicalResult && pqResult) {
    // Only post-quantum succeeded
    securityLevel = HybridSecurityLevel.POST_QUANTUM_ONLY;
    sharedSecret = pqResult.sharedSecret;
  } else {
    // Both failed
    throw new Error('Both classical and post-quantum encapsulation failed');
  }
  
  return {
    value: {
      sharedSecret,
      ciphertext: {
        classical: classicalResult?.ciphertext || new Uint8Array(32),
        postQuantum: pqResult?.ciphertext || new Uint8Array(KYBER768_CIPHERTEXT_SIZE)
      }
    },
    securityLevel
  };
}

/**
 * Perform hybrid decapsulation with fallback security
 */
export async function hybridDecapsulate(
  privateKeys: Pick<HybridKEM, 'classical' | 'postQuantum'>,
  ciphertext: HybridCiphertext
): Promise<HybridResult<Uint8Array>> {
  const sodiumModule = await import('libsodium-wrappers');
  const sodium = sodiumModule.default || sodiumModule;
  await sodium.ready;
  
  let classicalSecret: Uint8Array | null = null;
  let pqSecret: Uint8Array | null = null;
  let classicalError = false;
  let pqError = false;
  
  // Try classical decapsulation
  try {
    classicalSecret = sodium.crypto_scalarmult(
      privateKeys.classical.privateKey,
      ciphertext.classical
    );
  } catch (error) {
    console.warn('Classical decapsulation failed:', error);
    classicalError = true;
  }
  
  // Try post-quantum decapsulation
  try {
    pqSecret = await kyber768Decapsulate(
      privateKeys.postQuantum.privateKey,
      ciphertext.postQuantum
    );
  } catch (error) {
    console.warn('Post-quantum decapsulation failed:', error);
    pqError = true;
  }
  
  // Determine security level and derive shared secret
  let securityLevel: HybridSecurityLevel;
  let sharedSecret: Uint8Array;
  
  if (classicalSecret && pqSecret) {
    // Both succeeded - full hybrid security
    securityLevel = HybridSecurityLevel.FULL;
    sharedSecret = await deriveHybridSharedSecret(pqSecret, classicalSecret);
  } else if (classicalSecret && !pqSecret) {
    // Only classical succeeded
    securityLevel = HybridSecurityLevel.CLASSICAL_ONLY;
    sharedSecret = classicalSecret;
  } else if (!classicalSecret && pqSecret) {
    // Only post-quantum succeeded
    securityLevel = HybridSecurityLevel.POST_QUANTUM_ONLY;
    sharedSecret = pqSecret;
  } else {
    // Both failed
    throw new Error('Both classical and post-quantum decapsulation failed');
  }
  
  return {
    value: sharedSecret,
    securityLevel
  };
}

/**
 * Derive a combined shared secret using HKDF
 */
async function deriveHybridSharedSecret(
  postQuantumSecret: Uint8Array,
  classicalSecret: Uint8Array
): Promise<Uint8Array> {
  // Concatenate both secrets as input key material (IKM)
  const ikm = new Uint8Array(postQuantumSecret.length + classicalSecret.length);
  ikm.set(postQuantumSecret, 0);
  ikm.set(classicalSecret, postQuantumSecret.length);
  
  // Use Web Crypto API for HKDF
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  // Derive the combined shared secret
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('volly-hybrid-kem-v1'),
      info: new TextEncoder().encode('shared-secret')
    },
    keyMaterial,
    256 // 32 bytes = 256 bits
  );
  
  return new Uint8Array(derivedBits);
}

/**
 * Get security information about the hybrid KEM
 */
export function getHybridKEMInfo() {
  return {
    classical: {
      algorithm: 'X25519',
      securityLevel: '128-bit classical',
      publicKeySize: 32,
      privateKeySize: 32,
      ciphertextSize: 32
    },
    postQuantum: {
      algorithm: 'ML-KEM-768',
      standard: 'NIST FIPS 203',
      securityLevel: '192-bit post-quantum',
      publicKeySize: KYBER768_PUBLIC_KEY_SIZE,
      privateKeySize: KYBER768_PRIVATE_KEY_SIZE,
      ciphertextSize: KYBER768_CIPHERTEXT_SIZE
    },
    hybrid: {
      totalPublicKeySize: 32 + KYBER768_PUBLIC_KEY_SIZE,
      totalPrivateKeySize: 32 + KYBER768_PRIVATE_KEY_SIZE,
      totalCiphertextSize: 32 + KYBER768_CIPHERTEXT_SIZE,
      sharedSecretSize: 32,
      securityGuarantee: 'Secure against both classical and quantum adversaries'
    }
  };
}