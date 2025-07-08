import {
  initCrypto,
  encryptData,
  decryptData,
  deriveKeyFromPassword,
  generateSalt,
  Vault,
  VaultConfig,
} from '@volli/vault-core';
import { createIdentity } from '@volli/identity-core';
import { VolliDB, Vault as VaultRecord } from './database';
import { MessagingService } from './messaging';
import { PersistentMessageQueue } from './message-queue';

// Export specific items to avoid conflicts
export { VolliDB } from './database';
export type { Config } from './database';
export type { QueuedMessage as DatabaseQueuedMessage } from './database';
export * from './messaging';
export * from './network/network-store';
export { PersistentMessageQueue } from './message-queue';
export type { QueuedMessage } from './message-queue';
export * from './types';

export class VolliCore {
  public db: VolliDB;
  private _messaging: MessagingService | null = null;
  private _messageQueue: PersistentMessageQueue | null = null;
  private currentVault: VaultRecord | null = null;
  private vaultKey: Uint8Array | null = null;
  private documentVault: Vault | null = null;

  constructor() {
    this.db = new VolliDB();
  }

  async initialize() {
    // Ensure database is open
    try {
      await this.db.open();
    } catch (error) {
      // If already open, that's fine
      if (error instanceof Error && !error.message?.includes('already open')) {
        throw error;
      }
    }

    await initCrypto();

    // Check if already initialized
    const initialized = await this.db.config.get('initialized');
    if (!initialized) {
      await this.db.config.add({ key: 'initialized', value: true });
    }

    return !!initialized;
  }

  async createVault(password: string, name?: string) {
    // Create identity
    const result = await createIdentity();

    // Generate salt and derive key from password
    const salt = generateSalt();
    const vaultKey = deriveKeyFromPassword(password, salt);

    // Encrypt private key
    const privateKeyData = new TextEncoder().encode(JSON.stringify(result.privateKey));
    const { ciphertext, nonce } = encryptData(privateKeyData, vaultKey);

    // Store encrypted private key with salt and nonce
    const encryptedPrivateKey = JSON.stringify({
      ciphertext: Array.from(ciphertext),
      nonce: Array.from(nonce),
      salt: Array.from(salt),
    });

    // Store vault record in database
    const vaultRecord: VaultRecord = {
      id: result.identity.id,
      publicKey: JSON.stringify(result.identity.publicKey),
      encryptedPrivateKey,
      createdAt: Date.now(),
    };

    await this.db.vaults.add(vaultRecord);

    // Initialize document vault with Dexie-based storage
    const vaultConfig: VaultConfig = {
      name: name || `vault-${result.identity.id}`,
      encryptionKey: vaultKey,
      useWebCrypto: false, // Use libsodium for consistency
      syncEnabled: false, // Disable sync for now
      searchEnabled: true,
      collections: ['notes', 'messages', 'files'],
    };

    this.documentVault = new Vault(vaultConfig);
    await this.documentVault.initialize();

    // Set as current vault
    this.currentVault = vaultRecord;
    this.vaultKey = vaultKey;
    await this.db.config.put({ key: 'currentVaultId', value: result.identity.id });

    // Store vault name for persistence
    await this.db.config.put({
      key: `vaultName-${result.identity.id}`,
      value: name || vaultConfig.name,
    });

    return result.identity.id;
  }

  async unlockVault(password: string) {
    // Get vault from DB
    const vaults = await this.db.vaults.toArray();
    if (vaults.length === 0) {
      throw new Error('No vault found');
    }

    const vault = vaults[0]; // For now, use first vault

    try {
      // Parse encrypted data
      const encryptedData = JSON.parse(vault.encryptedPrivateKey);
      const ciphertext = new Uint8Array(encryptedData.ciphertext);
      const nonce = new Uint8Array(encryptedData.nonce);
      const salt = new Uint8Array(encryptedData.salt);

      // Derive key from password
      const vaultKey = deriveKeyFromPassword(password, salt);

      // Try to decrypt to verify password (will throw if password is wrong)
      decryptData(ciphertext, nonce, vaultKey);

      // If successful, set as current vault
      this.currentVault = vault;
      this.vaultKey = vaultKey;
      await this.db.config.put({ key: 'currentVaultId', value: vault.id });

      // Restore document vault
      const vaultNameConfig = await this.db.config.get(`vaultName-${vault.id}`);
      const vaultName = vaultNameConfig?.value || `vault-${vault.id}`;

      const vaultConfig: VaultConfig = {
        name: vaultName,
        encryptionKey: vaultKey,
        useWebCrypto: false,
        syncEnabled: false,
        searchEnabled: true,
        collections: ['notes', 'messages', 'files'],
      };

      this.documentVault = new Vault(vaultConfig);
      await this.documentVault.initialize();

      return vault;
    } catch {
      throw new Error('Invalid password');
    }
  }

  async lockVault() {
    this.currentVault = null;
    this.vaultKey = null;
    if (this.documentVault) {
      await this.documentVault.close();
      this.documentVault = null;
    }
    await this.db.config.delete('currentVaultId');
  }

  get messaging(): MessagingService {
    if (!this._messaging) {
      this._messaging = new MessagingService(this.db, this);
    }
    return this._messaging;
  }

  get messageQueue(): PersistentMessageQueue {
    if (!this._messageQueue) {
      this._messageQueue = new PersistentMessageQueue(this.db);
    }
    return this._messageQueue;
  }

  async getCurrentVault(): Promise<VaultRecord | null> {
    if (this.currentVault) {
      return this.currentVault;
    }

    const currentVaultId = await this.db.config.get('currentVaultId');
    if (currentVaultId?.value) {
      this.currentVault = (await this.db.vaults.get(currentVaultId.value)) || null;
      return this.currentVault;
    }

    return null;
  }

  // Crypto methods for messaging service
  async encrypt(data: string): Promise<string> {
    if (!this.vaultKey) {
      throw new Error('Vault is locked');
    }

    const dataBytes = new TextEncoder().encode(data);
    const { ciphertext, nonce } = encryptData(dataBytes, this.vaultKey);

    return JSON.stringify({
      ciphertext: Array.from(ciphertext),
      nonce: Array.from(nonce),
    });
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.vaultKey) {
      throw new Error('Vault is locked');
    }

    const { ciphertext, nonce } = JSON.parse(encryptedData);
    const decrypted = decryptData(new Uint8Array(ciphertext), new Uint8Array(nonce), this.vaultKey);

    return new TextDecoder().decode(decrypted);
  }

  // Expose database for development/debugging
  get database(): VolliDB {
    return this.db;
  }

  // Document vault methods

  /**
   * Store a document in the encrypted vault
   */
  async storeDocument(type: string, data: unknown, metadata?: Record<string, unknown>) {
    if (!this.documentVault) {
      throw new Error('Vault is locked');
    }

    return this.documentVault.addDocument({
      type,
      data,
      metadata: metadata || {},
    });
  }

  /**
   * Get a document from the vault
   */
  async getDocument(id: string) {
    if (!this.documentVault) {
      throw new Error('Vault is locked');
    }

    return this.documentVault.getDocument(id);
  }

  /**
   * Get all documents of a specific type
   */
  async getDocumentsByType(type: string, limit?: number) {
    if (!this.documentVault) {
      throw new Error('Vault is locked');
    }

    return this.documentVault.getDocumentsByType(type, limit);
  }

  /**
   * Search documents in the vault
   */
  async searchDocuments(query: string, options?: Record<string, unknown>) {
    if (!this.documentVault) {
      throw new Error('Vault is locked');
    }

    return this.documentVault.search(query, options);
  }

  /**
   * Delete a document from the vault
   */
  async deleteDocument(id: string) {
    if (!this.documentVault) {
      throw new Error('Vault is locked');
    }

    return this.documentVault.deleteDocument(id);
  }

  /**
   * Get vault statistics
   */
  async getVaultStats() {
    if (!this.documentVault) {
      throw new Error('Vault is locked');
    }

    return this.documentVault.getStats();
  }

  /**
   * Check if a vault exists and is unlocked
   */
  isVaultUnlocked(): boolean {
    return this.documentVault !== null && this.vaultKey !== null;
  }
}
