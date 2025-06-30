/**
 * Post-Quantum Message Encryption using ML-KEM-768 + XChaCha20-Poly1305
 * 
 * Hybrid approach:
 * - ML-KEM-768 for quantum-resistant key establishment
 * - XChaCha20-Poly1305 for fast symmetric message encryption
 */

import {
  CryptoFacade,
  ProviderRegistry,
  WASMCryptoProvider,
  type PublicKey,
  type PrivateKey,
  type EncapsulationResult
} from '@volli/identity-core';
import { encryptMessage, decryptMessage } from './encryption';
import { type MessageContent, type EncryptionInfo } from './types';

export interface PostQuantumSession {
  sessionKey: Uint8Array;
  kemCiphertext: Uint8Array;
  keyId: string;
  algorithm: string;
  createdAt: number;
  expiresAt: number;
}

export interface PostQuantumEncryptedMessage {
  encryptedContent: Uint8Array;
  encryptionInfo: EncryptionInfo;
  kemCiphertext: Uint8Array;
  postQuantumKeyId: string;
}

export class PostQuantumMessageEncryption {
  private cryptoFacade: CryptoFacade;
  private providerRegistry: ProviderRegistry;
  private wasmProvider: WASMCryptoProvider;
  private sessionCache = new Map<string, PostQuantumSession>();
  private initialized = false;

  constructor() {
    this.providerRegistry = new ProviderRegistry();
    this.wasmProvider = new WASMCryptoProvider();
    this.cryptoFacade = new CryptoFacade({
      enableWorkerPool: false, // Disable for now to avoid complexity
      cacheResults: true
    });
  }

  /**
   * Initialize the post-quantum encryption system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if WASM is available
      const isAvailable = await this.wasmProvider.isAvailable();
      if (!isAvailable) {
        throw new Error('WASM crypto provider not available');
      }

      // Initialize WASM provider
      await this.wasmProvider.initialize();

      // Register the WASM provider
      await this.providerRegistry.register(this.wasmProvider);

      // Initialize crypto facade
      await this.cryptoFacade.initialize(this.providerRegistry);

      this.initialized = true;
      console.log('🔐 Post-quantum encryption initialized with ML-KEM-768');
    } catch (error) {
      console.error('❌ Failed to initialize post-quantum encryption:', error);
      throw error;
    }
  }

  /**
   * Establish a new post-quantum session with a recipient
   */
  async establishSession(
    recipientPublicKey: PublicKey,
    sessionDurationMs: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): Promise<PostQuantumSession> {
    await this.ensureInitialized();

    try {
      // Perform ML-KEM-768 key encapsulation
      const encapsulationResult: EncapsulationResult = await this.cryptoFacade.encapsulate(
        recipientPublicKey
      );

      const keyId = this.generateKeyId();
      const now = Date.now();

      const session: PostQuantumSession = {
        sessionKey: encapsulationResult.sharedSecret,
        kemCiphertext: encapsulationResult.ciphertext,
        keyId,
        algorithm: 'ML-KEM-768',
        createdAt: now,
        expiresAt: now + sessionDurationMs
      };

      // Cache the session
      this.sessionCache.set(keyId, session);

      console.log(`🔑 Established post-quantum session ${keyId} with ML-KEM-768`);
      return session;
    } catch (error) {
      console.error('❌ Failed to establish post-quantum session:', error);
      throw new Error(`Post-quantum session establishment failed: ${error}`);
    }
  }

  /**
   * Decrypt a KEM ciphertext to recover session key
   */
  async recoverSession(
    kemCiphertext: Uint8Array,
    recipientPrivateKey: PrivateKey,
    keyId: string
  ): Promise<PostQuantumSession> {
    await this.ensureInitialized();

    try {
      // Check cache first
      const cached = this.sessionCache.get(keyId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached;
      }

      // Perform ML-KEM-768 key decapsulation
      const sharedSecret = await this.cryptoFacade.decapsulate(
        recipientPrivateKey,
        kemCiphertext
      );

      const session: PostQuantumSession = {
        sessionKey: sharedSecret,
        kemCiphertext,
        keyId,
        algorithm: 'ML-KEM-768',
        createdAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      // Cache the recovered session
      this.sessionCache.set(keyId, session);

      console.log(`🔓 Recovered post-quantum session ${keyId}`);
      return session;
    } catch (error) {
      console.error('❌ Failed to recover post-quantum session:', error);
      throw new Error(`Post-quantum session recovery failed: ${error}`);
    }
  }

  /**
   * Encrypt a message using post-quantum key establishment + fast symmetric crypto
   */
  async encryptMessage(
    content: MessageContent,
    recipientPublicKey: PublicKey,
    existingSession?: PostQuantumSession
  ): Promise<PostQuantumEncryptedMessage> {
    await this.ensureInitialized();

    let session = existingSession;

    // Establish new session if none provided or expired
    if (!session || session.expiresAt <= Date.now()) {
      session = await this.establishSession(recipientPublicKey);
    }

    // Encrypt message content with fast symmetric crypto
    const { encryptedContent, encryptionInfo } = await encryptMessage(
      content,
      session.sessionKey,
      session.keyId
    );

    // Update encryption info to indicate post-quantum protection
    const pqEncryptionInfo: EncryptionInfo = {
      ...encryptionInfo,
      algorithm: `${session.algorithm}+${encryptionInfo.algorithm}`, // "ML-KEM-768+XChaCha20-Poly1305"
      version: 2 // Post-quantum version
    };

    return {
      encryptedContent,
      encryptionInfo: pqEncryptionInfo,
      kemCiphertext: session.kemCiphertext,
      postQuantumKeyId: session.keyId
    };
  }

  /**
   * Decrypt a post-quantum encrypted message
   */
  async decryptMessage(
    encrypted: PostQuantumEncryptedMessage,
    recipientPrivateKey: PrivateKey
  ): Promise<MessageContent> {
    await this.ensureInitialized();

    // Recover the session using the KEM ciphertext
    const session = await this.recoverSession(
      encrypted.kemCiphertext,
      recipientPrivateKey,
      encrypted.postQuantumKeyId
    );

    // Decrypt the message content using symmetric crypto
    const content = await decryptMessage(
      encrypted.encryptedContent,
      encrypted.encryptionInfo,
      session.sessionKey
    );

    return content;
  }

  /**
   * Generate a new key pair for post-quantum messaging
   */
  async generateKeyPair() {
    await this.ensureInitialized();
    // Use the default KEM generation which will select ML-KEM-768
    return this.cryptoFacade.generateKeyPair();
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [keyId, session] of this.sessionCache.entries()) {
      if (session.expiresAt <= now) {
        this.sessionCache.delete(keyId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired post-quantum sessions`);
    }

    return cleaned;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const activeSessions = this.sessionCache.size;
    const expiredCount = Array.from(this.sessionCache.values())
      .filter(s => s.expiresAt <= Date.now()).length;

    return {
      activeSessions,
      expiredCount,
      provider: this.wasmProvider.name,
      version: this.wasmProvider.version
    };
  }

  /**
   * Force session refresh (useful for key rotation)
   */
  clearSession(keyId: string): boolean {
    return this.sessionCache.delete(keyId);
  }

  /**
   * Clear all sessions (logout/reset)
   */
  clearAllSessions(): void {
    this.sessionCache.clear();
    console.log('🔐 Cleared all post-quantum sessions');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateKeyId(): string {
    // Generate a random key ID for session tracking
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// Export a singleton instance for easy use
export const postQuantumEncryption = new PostQuantumMessageEncryption();

/**
 * Convenience function to encrypt a message with post-quantum security
 */
export async function encryptPostQuantumMessage(
  content: MessageContent,
  recipientPublicKey: PublicKey,
  existingSession?: PostQuantumSession
): Promise<PostQuantumEncryptedMessage> {
  return postQuantumEncryption.encryptMessage(content, recipientPublicKey, existingSession);
}

/**
 * Convenience function to decrypt a post-quantum message
 */
export async function decryptPostQuantumMessage(
  encrypted: PostQuantumEncryptedMessage,
  recipientPrivateKey: PrivateKey
): Promise<MessageContent> {
  return postQuantumEncryption.decryptMessage(encrypted, recipientPrivateKey);
}

/**
 * Initialize post-quantum encryption system
 */
export async function initPostQuantumEncryption(): Promise<void> {
  return postQuantumEncryption.initialize();
}