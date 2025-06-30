import sodium from 'libsodium-wrappers';

/**
 * Production-grade cryptographic provider using libsodium
 * Replaces all insecure crypto implementations with authenticated encryption
 */

export interface SecureEncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  algorithm: string;
  version: number;
}

export interface SecureKeyDerivationParams {
  salt: Uint8Array;
  opsLimit: number;
  memLimit: number;
  algorithm: string;
}

export interface HashResult {
  hash: Uint8Array;
  algorithm: string;
  version: number;
}

/**
 * Secure cryptographic operations using authenticated encryption
 */
export class SecureCryptoProvider {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await sodium.ready;
    this.isInitialized = true;
  }

  /**
   * Encrypt data with XChaCha20-Poly1305 authenticated encryption
   */
  async encryptData(data: Uint8Array, key: Uint8Array): Promise<SecureEncryptedData> {
    this.ensureInitialized();
    
    if (key.length !== 32) {
      throw new SecurityError('Invalid key length. Expected 32 bytes.', 'INVALID_KEY_LENGTH');
    }
    
    // Generate cryptographically secure random nonce
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
    
    // Encrypt with authenticated encryption (provides both confidentiality and integrity)
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      data,
      null, // no additional data
      null, // no secret nonce
      nonce,
      key
    );
    
    return {
      ciphertext,
      nonce,
      algorithm: 'xchacha20poly1305',
      version: 1
    };
  }

  /**
   * Decrypt data with XChaCha20-Poly1305 authenticated encryption
   */
  async decryptData(encryptedData: SecureEncryptedData, key: Uint8Array): Promise<Uint8Array> {
    this.ensureInitialized();
    
    if (key.length !== 32) {
      throw new SecurityError('Invalid key length. Expected 32 bytes.', 'INVALID_KEY_LENGTH');
    }
    
    if (encryptedData.algorithm !== 'xchacha20poly1305') {
      throw new SecurityError('Unsupported encryption algorithm', 'UNSUPPORTED_ALGORITHM');
    }
    
    try {
      // Decrypt and verify authenticity in one operation
      const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null, // no secret nonce
        encryptedData.ciphertext,
        null, // no additional data
        encryptedData.nonce,
        key
      );
      
      return decrypted;
    } catch (error) {
      throw new SecurityError('Decryption failed - data may be corrupted or tampered', 'DECRYPTION_FAILED');
    }
  }

  /**
   * Derive key from password using Argon2id (memory-hard, side-channel resistant)
   */
  async deriveKeyFromPassword(
    password: string, 
    salt?: Uint8Array,
    params?: Partial<SecureKeyDerivationParams>
  ): Promise<{ key: Uint8Array; params: SecureKeyDerivationParams }> {
    this.ensureInitialized();
    
    // Generate salt if not provided
    const actualSalt = salt || sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    
    // Use high-security parameters by default
    const opsLimit = params?.opsLimit || sodium.crypto_pwhash_OPSLIMIT_SENSITIVE;
    const memLimit = params?.memLimit || sodium.crypto_pwhash_MEMLIMIT_SENSITIVE;
    
    try {
      // Use Argon2id for password-based key derivation
      const key = sodium.crypto_pwhash(
        32, // 256-bit key
        password,
        actualSalt,
        opsLimit,
        memLimit,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );
      
      const derivationParams: SecureKeyDerivationParams = {
        salt: actualSalt,
        opsLimit,
        memLimit,
        algorithm: 'argon2id'
      };
      
      return { key, params: derivationParams };
    } catch (error) {
      throw new SecurityError('Key derivation failed', 'KEY_DERIVATION_FAILED');
    }
  }

  /**
   * Generate cryptographically secure hash using BLAKE2b
   */
  async hashData(data: Uint8Array, outputLength: number = 32): Promise<HashResult> {
    this.ensureInitialized();
    
    if (outputLength < 16 || outputLength > 64) {
      throw new SecurityError('Invalid hash output length. Must be between 16 and 64 bytes.', 'INVALID_HASH_LENGTH');
    }
    
    const hash = sodium.crypto_generichash(outputLength, data);
    
    return {
      hash,
      algorithm: 'blake2b',
      version: 1
    };
  }

  /**
   * Generate cryptographically secure random bytes
   */
  generateRandomBytes(length: number): Uint8Array {
    this.ensureInitialized();
    
    if (length <= 0 || length > 1024 * 1024) { // Max 1MB
      throw new SecurityError('Invalid random bytes length', 'INVALID_RANDOM_LENGTH');
    }
    
    return sodium.randombytes_buf(length);
  }

  /**
   * Securely wipe sensitive data from memory
   */
  secureWipe(data: Uint8Array): void {
    this.ensureInitialized();
    sodium.memzero(data);
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
    this.ensureInitialized();
    
    if (a.length !== b.length) {
      return false;
    }
    
    return sodium.memcmp(a, b);
  }

  /**
   * Generate salt for key derivation
   */
  generateSalt(): Uint8Array {
    this.ensureInitialized();
    return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  }

  /**
   * Derive a key for a specific purpose (key separation)
   */
  async deriveSubkey(
    masterKey: Uint8Array, 
    context: string, 
    keyId: number = 0,
    outputLength: number = 32
  ): Promise<Uint8Array> {
    this.ensureInitialized();
    
    if (masterKey.length !== 32) {
      throw new SecurityError('Invalid master key length. Expected 32 bytes.', 'INVALID_MASTER_KEY');
    }
    
    if (context.length > 8) {
      throw new SecurityError('Context string too long. Maximum 8 characters.', 'INVALID_CONTEXT');
    }
    
    // Pad context to 8 characters for libsodium
    const paddedContext = context.padEnd(8, '\0').slice(0, 8);
    
    try {
      // Use BLAKE2b with key and personalization for key separation
      const subkey = sodium.crypto_kdf_derive_from_key(
        outputLength,
        keyId,
        paddedContext,
        masterKey
      );
      
      return subkey;
    } catch (error) {
      throw new SecurityError('Subkey derivation failed', 'SUBKEY_DERIVATION_FAILED');
    }
  }

  /**
   * Generate a master key for the system
   */
  generateMasterKey(): Uint8Array {
    this.ensureInitialized();
    return sodium.crypto_kdf_keygen();
  }

  /**
   * Sign data with Ed25519 (for authentication)
   */
  async signData(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    this.ensureInitialized();
    
    if (privateKey.length !== sodium.crypto_sign_SECRETKEYBYTES) {
      throw new SecurityError('Invalid Ed25519 private key length', 'INVALID_SIGNING_KEY');
    }
    
    try {
      return sodium.crypto_sign_detached(data, privateKey);
    } catch (error) {
      throw new SecurityError('Signing failed', 'SIGNING_FAILED');
    }
  }

  /**
   * Verify Ed25519 signature
   */
  async verifySignature(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    this.ensureInitialized();
    
    if (publicKey.length !== sodium.crypto_sign_PUBLICKEYBYTES) {
      throw new SecurityError('Invalid Ed25519 public key length', 'INVALID_VERIFICATION_KEY');
    }
    
    if (signature.length !== sodium.crypto_sign_BYTES) {
      throw new SecurityError('Invalid signature length', 'INVALID_SIGNATURE');
    }
    
    try {
      return sodium.crypto_sign_verify_detached(signature, data, publicKey);
    } catch {
      return false; // Invalid signature
    }
  }

  /**
   * Generate Ed25519 key pair for signing
   */
  generateSigningKeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
    this.ensureInitialized();
    
    const keyPair = sodium.crypto_sign_keypair();
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  /**
   * Compute authenticated hash (HMAC) for message authentication
   */
  async computeMAC(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    this.ensureInitialized();
    
    if (key.length !== 32) {
      throw new SecurityError('Invalid MAC key length. Expected 32 bytes.', 'INVALID_MAC_KEY');
    }
    
    try {
      return sodium.crypto_auth(data, key);
    } catch (error) {
      throw new SecurityError('MAC computation failed', 'MAC_FAILED');
    }
  }

  /**
   * Verify authenticated hash (HMAC)
   */
  async verifyMAC(data: Uint8Array, mac: Uint8Array, key: Uint8Array): Promise<boolean> {
    this.ensureInitialized();
    
    if (key.length !== 32) {
      throw new SecurityError('Invalid MAC key length. Expected 32 bytes.', 'INVALID_MAC_KEY');
    }
    
    try {
      return sodium.crypto_auth_verify(mac, data, key);
    } catch {
      return false; // Invalid MAC
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new SecurityError('Crypto provider not initialized. Call initialize() first.', 'NOT_INITIALIZED');
    }
  }
}

/**
 * Security-specific error class
 */
export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Default secure crypto provider instance
 */
export const secureCrypto = new SecureCryptoProvider();