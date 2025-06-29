/**
 * Shared crypto types to avoid circular dependencies
 * This module contains only type definitions, no implementations
 */

export interface KeyPair {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}

export interface PublicKey {
  kyber: Uint8Array;      // ML-KEM-768 (1184 bytes)
  dilithium: Uint8Array;  // ML-DSA-65 (1952 bytes)
  x25519: Uint8Array;     // X25519 (32 bytes)
  ed25519: Uint8Array;    // Ed25519 (32 bytes)
}

export interface PrivateKey {
  kyber: Uint8Array;      // ML-KEM-768 (2400 bytes)
  dilithium: Uint8Array;  // ML-DSA-65 (4032 bytes)
  x25519: Uint8Array;     // X25519 (32 bytes)
  ed25519: Uint8Array;    // Ed25519 (64 bytes)
}

export interface EncapsulationResult {
  sharedSecret: Uint8Array;
  ciphertext: Uint8Array;
}

export interface SignatureResult {
  signature: Uint8Array;
}

export interface CryptoOperations {
  generateKeyPair(): Promise<KeyPair>;
  keyEncapsulation(publicKey: PublicKey): Promise<EncapsulationResult>;
  keyDecapsulation(privateKey: PrivateKey, ciphertext: Uint8Array): Promise<Uint8Array>;
  sign(data: Uint8Array, privateKey: PrivateKey): Promise<Uint8Array>;
  verify(data: Uint8Array, signature: Uint8Array, publicKey: PublicKey): Promise<boolean>;
}

export interface KeyDerivationParams {
  salt: Uint8Array;
  iterations: number;
  keyLength?: number;
  memory?: number;
  parallelism?: number;
}

export interface EncryptedData {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  mac?: Uint8Array;
}

