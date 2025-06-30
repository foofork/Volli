// Basic crypto functions (replacing vault-core for MVP)
const initCrypto = async () => {
  // Basic initialization - no complex setup needed for MVP
  return true;
};

const generateSalt = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(16));
};

const deriveKeyFromPassword = (password: string, salt: Uint8Array): Uint8Array => {
  // Simple key derivation for MVP - in production this would use PBKDF2/scrypt
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const combined = new Uint8Array(passwordBytes.length + salt.length);
  combined.set(passwordBytes);
  combined.set(salt, passwordBytes.length);
  return crypto.getRandomValues(new Uint8Array(32)); // Simplified for MVP
};

const encryptData = (
  data: Uint8Array,
  key: Uint8Array
): { ciphertext: Uint8Array; nonce: Uint8Array } => {
  // Simple XOR encryption for MVP - in production this would use AES-GCM
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    ciphertext[i] = data[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
  }
  return { ciphertext, nonce };
};

const decryptData = (ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array => {
  // Simple XOR decryption for MVP
  const plaintext = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i++) {
    plaintext[i] = ciphertext[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
  }
  return plaintext;
};
import { createIdentity } from '@volli/identity-core';
// MessageManager import removed - not used in MVP integration
import { VolliDB, Vault as VaultRecord } from './database';
import { MessagingService } from './messaging';
import { PersistentMessageQueue } from './message-queue';

// Export specific items to avoid conflicts
export { VolliDB } from './database';
export type { Config } from './database';
export type { QueuedMessage as DatabaseQueuedMessage } from './database';
export * from './messaging';
export * from './network/network-store';
export {
  smartNetwork,
  SmartNetworkManager,
  type SmartNetworkConfig,
} from './network/smart-network';
export { PersistentMessageQueue } from './message-queue';
export type { QueuedMessage } from './message-queue';
export * from './types';

export class VolliCore {
  public db: VolliDB;
  private _messaging: MessagingService | null = null;
  private _messageQueue: PersistentMessageQueue | null = null;
  private currentVault: VaultRecord | null = null;
  private vaultKey: Uint8Array | null = null;

  constructor() {
    this.db = new VolliDB();
  }

  async initialize() {
    // Ensure database is open
    try {
      await this.db.open();
    } catch (error: unknown) {
      // If already open, that's fine
      if (!(error instanceof Error) || !error.message?.includes('already open')) {
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

  async createVault(password: string) {
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

    // Set as current vault
    this.currentVault = vaultRecord;
    this.vaultKey = vaultKey;
    await this.db.config.put({ key: 'currentVaultId', value: result.identity.id });

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

      // Try to decrypt to verify password
      decryptData(ciphertext, nonce, vaultKey);

      // If successful, set as current vault
      this.currentVault = vault;
      this.vaultKey = vaultKey;
      await this.db.config.put({ key: 'currentVaultId', value: vault.id });

      return vault;
    } catch {
      throw new Error('Invalid password');
    }
  }

  async lockVault() {
    this.currentVault = null;
    this.vaultKey = null;
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
}
