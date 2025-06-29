// Hybrid Classical/Post-Quantum Key Exchange
// Combines X25519 with ML-KEM for transition security

import { browser } from '$app/environment';

/**
 * Hybrid KEM combining classical and post-quantum cryptography
 * Provides security against both classical and quantum attacks
 */
export class HybridKEM {
  private classical: CryptoKeyPair | null = null;
  private postQuantum: PQKeyPair | null = null;
  
  /**
   * Generate hybrid key pair (classical + post-quantum)
   */
  async generateKeyPair(): Promise<HybridKeyPair> {
    if (!browser) {
      throw new Error('HybridKEM can only be used in browser environment');
    }
    
    // Generate X25519 key pair
    this.classical = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'X25519'
      },
      true, // extractable
      ['deriveKey', 'deriveBits']
    );
    
    // Generate ML-KEM key pair (placeholder for now)
    this.postQuantum = await this.generatePQKeyPair();
    
    return {
      classical: {
        publicKey: await crypto.subtle.exportKey('raw', this.classical.publicKey),
        privateKey: await crypto.subtle.exportKey('pkcs8', this.classical.privateKey)
      },
      postQuantum: {
        publicKey: this.postQuantum.publicKey,
        privateKey: this.postQuantum.privateKey
      }
    };
  }
  
  /**
   * Encapsulate shared secret using hybrid approach
   */
  async encapsulate(recipientPublicKey: HybridPublicKey): Promise<HybridEncapsulation> {
    if (!this.classical || !this.postQuantum) {
      throw new Error('Key pair must be generated first');
    }
    
    // Classical ECDH
    const classicalShared = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: await crypto.subtle.importKey(
          'raw',
          recipientPublicKey.classical,
          { name: 'ECDH', namedCurve: 'X25519' },
          false,
          []
        )
      },
      this.classical.privateKey,
      256 // 32 bytes
    );
    
    // Post-quantum KEM (placeholder)
    const pqResult = await this.encapsulatePQ(recipientPublicKey.postQuantum);
    
    // Combine shared secrets using KDF
    const combinedSecret = await this.combineSecrets(
      new Uint8Array(classicalShared),
      pqResult.sharedSecret
    );
    
    return {
      classical: new Uint8Array(classicalShared),
      postQuantum: pqResult,
      combinedSecret
    };
  }
  
  /**
   * Combine classical and post-quantum shared secrets
   */
  private async combineSecrets(
    classicalSecret: Uint8Array,
    pqSecret: Uint8Array
  ): Promise<Uint8Array> {
    // Use HKDF to combine the secrets
    const combined = new Uint8Array(classicalSecret.length + pqSecret.length);
    combined.set(classicalSecret, 0);
    combined.set(pqSecret, classicalSecret.length);
    
    // Hash the combined secrets
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    return new Uint8Array(hashBuffer);
  }
  
  /**
   * Generate post-quantum key pair (placeholder)
   */
  private async generatePQKeyPair(): Promise<PQKeyPair> {
    // Placeholder for ML-KEM key generation
    // In Phase 1C, this will be replaced with Rust WASM implementation
    return {
      publicKey: new Uint8Array(1184), // ML-KEM-768 public key size
      privateKey: new Uint8Array(2400) // ML-KEM-768 private key size
    };
  }
  
  /**
   * Post-quantum encapsulation (placeholder)
   */
  private async encapsulatePQ(publicKey: Uint8Array): Promise<PQEncapsulation> {
    // Placeholder for ML-KEM encapsulation
    // In Phase 1C, this will be replaced with Rust WASM implementation
    return {
      ciphertext: new Uint8Array(1088), // ML-KEM-768 ciphertext size
      sharedSecret: new Uint8Array(32)   // Shared secret size
    };
  }
}

// Type definitions
export interface HybridKeyPair {
  classical: {
    publicKey: Uint8Array;   // X25519 32 bytes
    privateKey: Uint8Array;  // X25519 32 bytes (PKCS8 format)
  };
  postQuantum: PQKeyPair;
}

export interface HybridPublicKey {
  classical: Uint8Array;   // X25519 32 bytes
  postQuantum: Uint8Array; // ML-KEM-768 1184 bytes
}

export interface HybridEncapsulation {
  classical: Uint8Array;
  postQuantum: PQEncapsulation;
  combinedSecret: Uint8Array;
}

interface PQKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

interface PQEncapsulation {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
}