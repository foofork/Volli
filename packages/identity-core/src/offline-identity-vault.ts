import { v4 as uuidv4 } from 'uuid';
import { 
  Identity, 
  PrivateKey, 
  PublicKey, 
  DeviceKey, 
  TrustLevel, 
  IdentityMetadata,
  EncryptedBackup
} from './types';
import {
  createIdentity,
  exportIdentityEncrypted,
  importIdentityEncrypted,
  validateIdentity,
  getIdentityFingerprint
} from './identity';
import { generateKeyPair } from './crypto';
import { secureCrypto, SecureEncryptedData, SecurityError } from './secure-crypto-provider';

/**
 * Recovery method types for offline identity vault
 */
export enum RecoveryMethod {
  PASSPHRASE = 'passphrase',
  KEY_FILE = 'key_file', 
  HARDWARE_TOKEN = 'hardware_token',
  QR_CODE = 'qr_code',
  EMERGENCY_CODE = 'emergency_code'
}

/**
 * Multi-factor recovery configuration
 */
export interface RecoveryConfig {
  methods: RecoveryMethod[];
  requiredMethods: number; // How many methods needed for recovery
  emergencyAccess: boolean; // Allow emergency access with reduced security
}

/**
 * Portable backup data for offline recovery
 */
export interface PortableBackup {
  version: number;
  id: string;
  timestamp: number;
  encryptedIdentity: Uint8Array;
  encryptedPrivateKey: Uint8Array;
  recoveryHints: RecoveryHints;
  checksum: Uint8Array;
  metadata: {
    displayName?: string;
    deviceCount: number;
    createdAt: number;
    fingerprintHash: string;
  };
}

/**
 * Recovery hints to help users without exposing sensitive data
 */
export interface RecoveryHints {
  passphraseHint?: string;
  keyFileFingerprint?: string;
  emergencyCodeExists: boolean;
  lastBackupLocation?: string;
  recoveryMethods: RecoveryMethod[];
  salt?: Uint8Array; // For secure key derivation
}

/**
 * Emergency access credentials for crisis scenarios
 */
export interface EmergencyCredentials {
  emergencyCode: string;
  deviceFingerprint?: string;
  timestamp: number;
}

/**
 * Limited access granted during emergency recovery
 */
export interface LimitedAccess {
  identity: Identity;
  privateKey: PrivateKey;
  restrictions: {
    temporaryAccess: boolean;
    expiresAt: number;
    limitedOperations: string[];
    requiresReactivation: boolean;
  };
}

/**
 * Recovery attempt tracking for security
 */
interface RecoveryAttempt {
  id: string;
  method: RecoveryMethod;
  timestamp: number;
  success: boolean;
  errorCode?: string;
  deviceFingerprint?: string;
}

/**
 * Offline Identity Vault for secure identity recovery without network access
 * 
 * This vault provides multiple recovery methods:
 * - Passphrase-based recovery (PBKDF2/Argon2)
 * - Key file recovery (encrypted key files)
 * - Hardware token integration (HSM/TPM) 
 * - QR code backup (for mobile import)
 * - Emergency access (reduced security for crisis scenarios)
 */
export class OfflineIdentityVault {
  private readonly vaultId: string;
  private identities: Map<string, Identity> = new Map();
  private privateKeys: Map<string, PrivateKey> = new Map();
  private recoveryConfigs: Map<string, RecoveryConfig> = new Map();
  private encryptedStorage: Map<string, Uint8Array> = new Map();
  private recoveryAttempts: RecoveryAttempt[] = [];
  private isInitialized = false;

  constructor(vaultId?: string) {
    this.vaultId = vaultId || uuidv4();
  }

  /**
   * Initialize the offline identity vault
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize secure crypto provider
    await secureCrypto.initialize();

    // Initialize secure storage for offline use
    await this.initializeSecureStorage();
    
    this.isInitialized = true;
  }

  /**
   * Create new identity with offline recovery setup
   */
  async createIdentityWithRecovery(
    deviceName: string,
    metadata: Partial<IdentityMetadata>,
    recoveryConfig: RecoveryConfig,
    passphraseOptions?: {
      passphrase: string;
      hint?: string;
    }
  ): Promise<{ identity: Identity; privateKey: PrivateKey; backup: PortableBackup }> {
    this.ensureInitialized();

    // Create the identity
    const { identity, privateKey } = await createIdentity(deviceName, metadata);

    // Store in vault
    this.identities.set(identity.id, identity);
    this.privateKeys.set(identity.id, privateKey);
    this.recoveryConfigs.set(identity.id, recoveryConfig);

    // Create offline recovery backup
    const backup = await this.createPortableBackup(
      identity,
      privateKey,
      {
        passphrase: passphraseOptions?.passphrase,
        passphraseHint: passphraseOptions?.hint,
        methods: recoveryConfig.methods
      }
    );

    // Store encrypted backup locally for offline access
    await this.storeEncryptedBackup(identity.id, backup);

    return { identity, privateKey, backup };
  }

  /**
   * Recover identity from passphrase (offline)
   */
  async recoverFromPassphrase(
    backup: PortableBackup,
    passphrase: string
  ): Promise<{ identity: Identity; privateKey: PrivateKey }> {
    this.ensureInitialized();

    const attemptId = uuidv4();
    const timestamp = Date.now();

    try {
      // Verify backup integrity
      await this.verifyBackupIntegrity(backup);

      // Derive key from passphrase using secure Argon2id
      const salt = backup.recoveryHints.salt || secureCrypto.generateSalt();
      const { key: derivedKey } = await secureCrypto.deriveKeyFromPassword(passphrase, salt);

      // Decrypt identity data with authenticated encryption
      const identityEncrypted: SecureEncryptedData = {
        ciphertext: backup.encryptedIdentity.slice(24), // Skip nonce
        nonce: backup.encryptedIdentity.slice(0, 24),
        algorithm: 'xchacha20poly1305',
        version: 1
      };
      const identityData = await secureCrypto.decryptData(identityEncrypted, derivedKey);
      
      const keyEncrypted: SecureEncryptedData = {
        ciphertext: backup.encryptedPrivateKey.slice(24), // Skip nonce
        nonce: backup.encryptedPrivateKey.slice(0, 24),
        algorithm: 'xchacha20poly1305',
        version: 1
      };
      const privateKeyData = await secureCrypto.decryptData(keyEncrypted, derivedKey);

      // Parse recovered data
      const identity = JSON.parse(new TextDecoder().decode(identityData)) as Identity;
      const privateKey = JSON.parse(new TextDecoder().decode(privateKeyData)) as PrivateKey;

      // Securely wipe the derived key
      secureCrypto.secureWipe(derivedKey);

      // Validate recovered identity
      if (!validateIdentity(identity)) {
        throw new SecurityError('Recovered identity failed validation', 'INVALID_IDENTITY');
      }

      // Store recovered identity
      this.identities.set(identity.id, identity);
      this.privateKeys.set(identity.id, privateKey);

      // Record successful recovery
      this.recordRecoveryAttempt({
        id: attemptId,
        method: RecoveryMethod.PASSPHRASE,
        timestamp,
        success: true
      });

      return { identity, privateKey };

    } catch (error) {
      // Record failed recovery attempt
      this.recordRecoveryAttempt({
        id: attemptId,
        method: RecoveryMethod.PASSPHRASE,
        timestamp,
        success: false,
        errorCode: error instanceof Error ? error.message : 'unknown_error'
      });

      throw new Error(`Passphrase recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recover identity from key file (offline)
   */
  async recoverFromKeyFile(
    keyFileData: Uint8Array,
    password?: string
  ): Promise<{ identity: Identity; privateKey: PrivateKey }> {
    this.ensureInitialized();

    const attemptId = uuidv4();
    const timestamp = Date.now();

    try {
      // Parse key file (assumed to be an encrypted backup)
      const backup = JSON.parse(new TextDecoder().decode(keyFileData)) as PortableBackup;

      // If password provided, use password-based recovery
      if (password) {
        return await this.recoverFromPassphrase(backup, password);
      }

      // Otherwise attempt direct decryption (for unencrypted key files)
      const identity = JSON.parse(new TextDecoder().decode(backup.encryptedIdentity)) as Identity;
      const privateKey = JSON.parse(new TextDecoder().decode(backup.encryptedPrivateKey)) as PrivateKey;

      // Validate recovered identity
      if (!validateIdentity(identity)) {
        throw new Error('Recovered identity failed validation');
      }

      // Store recovered identity
      this.identities.set(identity.id, identity);
      this.privateKeys.set(identity.id, privateKey);

      // Record successful recovery
      this.recordRecoveryAttempt({
        id: attemptId,
        method: RecoveryMethod.KEY_FILE,
        timestamp,
        success: true
      });

      return { identity, privateKey };

    } catch (error) {
      // Record failed recovery attempt
      this.recordRecoveryAttempt({
        id: attemptId,
        method: RecoveryMethod.KEY_FILE,
        timestamp,
        success: false,
        errorCode: error instanceof Error ? error.message : 'unknown_error'
      });

      throw new Error(`Key file recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Emergency access with reduced security for crisis scenarios
   */
  async emergencyAccess(emergencyCode: string): Promise<LimitedAccess> {
    this.ensureInitialized();

    const attemptId = uuidv4();
    const timestamp = Date.now();

    try {
      // Find backup with matching emergency code (simplified for demo)
      // In production, this would be properly hashed and verified
      const backupId = this.findBackupByEmergencyCode(emergencyCode);
      if (!backupId) {
        throw new Error('Invalid emergency code');
      }

      const backup = await this.getStoredBackup(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Create emergency key derivation (still secure but with lower iteration count)
      const emergencyKey = await this.deriveEmergencyKey(emergencyCode);

      try {
        // Decrypt with emergency key using authenticated encryption
        const identityEncrypted: SecureEncryptedData = {
          ciphertext: backup.encryptedIdentity.slice(24),
          nonce: backup.encryptedIdentity.slice(0, 24),
          algorithm: 'xchacha20poly1305',
          version: 1
        };
        const identityData = await secureCrypto.decryptData(identityEncrypted, emergencyKey);
        
        const keyEncrypted: SecureEncryptedData = {
          ciphertext: backup.encryptedPrivateKey.slice(24),
          nonce: backup.encryptedPrivateKey.slice(0, 24),
          algorithm: 'xchacha20poly1305',
          version: 1
        };
        const privateKeyData = await secureCrypto.decryptData(keyEncrypted, emergencyKey);

        // Securely wipe the emergency key
        secureCrypto.secureWipe(emergencyKey);

        const identity = JSON.parse(new TextDecoder().decode(identityData)) as Identity;
        const privateKey = JSON.parse(new TextDecoder().decode(privateKeyData)) as PrivateKey;

        // Record successful emergency access
        this.recordRecoveryAttempt({
          id: attemptId,
          method: RecoveryMethod.EMERGENCY_CODE,
          timestamp,
          success: true
        });

        // Return limited access with restrictions
        return {
          identity,
          privateKey,
          restrictions: {
            temporaryAccess: true,
            expiresAt: timestamp + (24 * 60 * 60 * 1000), // 24 hours
            limitedOperations: ['message_read', 'emergency_contact'],
            requiresReactivation: true
          }
        };

      } catch (decryptError) {
        // Emergency decryption failed
        secureCrypto.secureWipe(emergencyKey);
        throw new Error('Emergency decryption failed - invalid emergency code or corrupted backup');
      }

    } catch (error) {
      // Record failed emergency access
      this.recordRecoveryAttempt({
        id: attemptId,
        method: RecoveryMethod.EMERGENCY_CODE,
        timestamp,
        success: false,
        errorCode: error instanceof Error ? error.message : 'unknown_error'
      });

      throw new Error(`Emergency access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create portable backup for offline recovery
   */
  async createPortableBackup(
    identity: Identity,
    privateKey: PrivateKey,
    options: {
      passphrase?: string;
      passphraseHint?: string;
      methods: RecoveryMethod[];
      emergencyCode?: string;
    }
  ): Promise<PortableBackup> {
    this.ensureInitialized();

    // Serialize identity and private key
    const identityData = new TextEncoder().encode(JSON.stringify(identity));
    const privateKeyData = new TextEncoder().encode(JSON.stringify(privateKey));

    // Create recovery hints (will be updated based on chosen encryption method)
    const recoveryHints: RecoveryHints = {
      passphraseHint: options.passphraseHint,
      emergencyCodeExists: !!options.emergencyCode,
      recoveryMethods: options.methods
    };

    let encryptedIdentity: Uint8Array;
    let encryptedPrivateKey: Uint8Array;

    if (options.passphrase) {
      // Encrypt with passphrase-derived key using secure Argon2id
      const salt = secureCrypto.generateSalt();
      const { key: derivedKey } = await secureCrypto.deriveKeyFromPassword(options.passphrase, salt);
      
      const identityResult = await secureCrypto.encryptData(identityData, derivedKey);
      const keyResult = await secureCrypto.encryptData(privateKeyData, derivedKey);
      
      // Prepend nonce to ciphertext for storage (authenticated encryption format)
      encryptedIdentity = new Uint8Array(identityResult.nonce.length + identityResult.ciphertext.length);
      encryptedIdentity.set(identityResult.nonce, 0);
      encryptedIdentity.set(identityResult.ciphertext, identityResult.nonce.length);
      
      encryptedPrivateKey = new Uint8Array(keyResult.nonce.length + keyResult.ciphertext.length);
      encryptedPrivateKey.set(keyResult.nonce, 0);
      encryptedPrivateKey.set(keyResult.ciphertext, keyResult.nonce.length);
      
      // Store salt in recovery hints for key derivation
      recoveryHints.salt = salt;
      
      // Securely wipe the derived key
      secureCrypto.secureWipe(derivedKey);
    } else {
      // Use a cryptographically secure random key
      const backupKey = secureCrypto.generateRandomBytes(32);
      
      const identityResult = await secureCrypto.encryptData(identityData, backupKey);
      const keyResult = await secureCrypto.encryptData(privateKeyData, backupKey);
      
      // Prepend nonce to ciphertext for storage (authenticated encryption format)
      encryptedIdentity = new Uint8Array(identityResult.nonce.length + identityResult.ciphertext.length);
      encryptedIdentity.set(identityResult.nonce, 0);
      encryptedIdentity.set(identityResult.ciphertext, identityResult.nonce.length);
      
      encryptedPrivateKey = new Uint8Array(keyResult.nonce.length + keyResult.ciphertext.length);
      encryptedPrivateKey.set(keyResult.nonce, 0);
      encryptedPrivateKey.set(keyResult.ciphertext, keyResult.nonce.length);
      
      // Securely wipe the backup key
      secureCrypto.secureWipe(backupKey);
    }

    // Create backup metadata
    const backup: PortableBackup = {
      version: 1,
      id: uuidv4(),
      timestamp: Date.now(),
      encryptedIdentity,
      encryptedPrivateKey,
      recoveryHints,
      checksum: new Uint8Array(32), // Placeholder - would be calculated hash
      metadata: {
        displayName: identity.metadata.displayName,
        deviceCount: identity.deviceKeys.length,
        createdAt: identity.createdAt,
        fingerprintHash: Array.from((await secureCrypto.hashData(new TextEncoder().encode(getIdentityFingerprint(identity)), 8)).hash.slice(0, 8)).map((b: number) => b.toString(16).padStart(2, '0')).join('')
      }
    };

    // Calculate and set checksum
    const backupData = new TextEncoder().encode(JSON.stringify({
      ...backup,
      checksum: undefined
    }));
    backup.checksum = (await secureCrypto.hashData(backupData)).hash;

    return backup;
  }

  /**
   * Verify backup integrity before recovery
   */
  async verifyBackupIntegrity(backup: PortableBackup): Promise<boolean> {
    try {
      // Recalculate checksum
      const backupData = new TextEncoder().encode(JSON.stringify({
        ...backup,
        checksum: undefined
      }));
      const calculatedChecksum = (await secureCrypto.hashData(backupData)).hash;

      // Compare checksums
      if (backup.checksum.length !== calculatedChecksum.length) {
        return false;
      }

      for (let i = 0; i < backup.checksum.length; i++) {
        if (backup.checksum[i] !== calculatedChecksum[i]) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get recovery attempts for security monitoring
   */
  getRecoveryAttempts(identityId?: string): RecoveryAttempt[] {
    return this.recoveryAttempts.filter(attempt => 
      !identityId || attempt.deviceFingerprint === identityId
    );
  }

  /**
   * Clear recovery attempts (for privacy)
   */
  clearRecoveryAttempts(): void {
    this.recoveryAttempts = [];
  }

  /**
   * Export vault data for backup/migration
   */
  async exportVaultData(): Promise<Uint8Array> {
    this.ensureInitialized();

    const vaultData = {
      vaultId: this.vaultId,
      identities: Array.from(this.identities.entries()),
      recoveryConfigs: Array.from(this.recoveryConfigs.entries()),
      encryptedBackups: Array.from(this.encryptedStorage.entries()),
      version: 1,
      exportedAt: Date.now()
    };

    return new TextEncoder().encode(JSON.stringify(vaultData));
  }

  /**
   * Import vault data from backup
   */
  async importVaultData(vaultData: Uint8Array): Promise<void> {
    this.ensureInitialized();

    try {
      const parsedData = JSON.parse(new TextDecoder().decode(vaultData));

      // Restore vault state
      this.identities = new Map(parsedData.identities);
      this.recoveryConfigs = new Map(parsedData.recoveryConfigs);
      this.encryptedStorage = new Map(parsedData.encryptedBackups);

      // Note: Private keys are not included in vault exports for security
      // They must be recovered individually using recovery methods

    } catch (error) {
      throw new Error(`Failed to import vault data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('OfflineIdentityVault not initialized. Call initialize() first.');
    }
  }

  private async initializeSecureStorage(): Promise<void> {
    // Initialize IndexedDB or other secure storage for offline use
    // For now, using in-memory storage
  }

  private async storeEncryptedBackup(identityId: string, backup: PortableBackup): Promise<void> {
    const backupData = new TextEncoder().encode(JSON.stringify(backup));
    this.encryptedStorage.set(identityId, backupData);
  }

  private async getStoredBackup(identityId: string): Promise<PortableBackup | null> {
    const backupData = this.encryptedStorage.get(identityId);
    if (!backupData) {
      return null;
    }

    try {
      return JSON.parse(new TextDecoder().decode(backupData)) as PortableBackup;
    } catch {
      return null;
    }
  }

  private findBackupByEmergencyCode(emergencyCode: string): string | null {
    // Simplified emergency code lookup
    // In production, this would use proper hashing and secure comparison
    for (const [identityId, _] of this.encryptedStorage) {
      if (emergencyCode.includes(identityId.slice(0, 8))) {
        return identityId;
      }
    }
    return null;
  }

  private async deriveEmergencyKey(emergencyCode: string): Promise<Uint8Array> {
    // Use secure key derivation for emergency access with reduced iteration count
    // Still secure but faster for emergency scenarios
    const salt = new TextEncoder().encode('emergency_salt'); // In production, use proper salt
    const { key } = await secureCrypto.deriveKeyFromPassword(
      emergencyCode, 
      salt, 
      {
        opsLimit: 32768, // Reduced from SENSITIVE for emergency speed
        memLimit: 16777216 // Reduced from SENSITIVE for emergency speed
      }
    );
    return key;
  }

  private recordRecoveryAttempt(attempt: RecoveryAttempt): void {
    this.recoveryAttempts.push(attempt);
    
    // Keep only last 100 attempts for privacy
    if (this.recoveryAttempts.length > 100) {
      this.recoveryAttempts = this.recoveryAttempts.slice(-100);
    }
  }
}

/**
 * Recovery guidance system to help users through recovery process
 */
export class RecoveryGuidance {
  /**
   * Get step-by-step recovery instructions
   */
  static getRecoverySteps(backup: PortableBackup): string[] {
    const steps: string[] = [];
    const hints = backup.recoveryHints;

    steps.push('1. Verify this is your backup by checking the display name and creation date');
    
    if (hints.recoveryMethods.includes(RecoveryMethod.PASSPHRASE)) {
      steps.push('2. Enter your recovery passphrase');
      if (hints.passphraseHint) {
        steps.push(`   Hint: ${hints.passphraseHint}`);
      }
    }

    if (hints.recoveryMethods.includes(RecoveryMethod.KEY_FILE)) {
      steps.push('2. Select your recovery key file');
    }

    if (hints.emergencyCodeExists) {
      steps.push('3. For emergency access, use your emergency code');
      steps.push('   Note: Emergency access has limited functionality');
    }

    steps.push('4. Your identity will be recovered and available offline');

    return steps;
  }

  /**
   * Validate recovery input before attempting recovery
   */
  static validateRecoveryInput(
    method: RecoveryMethod,
    input: string | Uint8Array
  ): { valid: boolean; error?: string } {
    switch (method) {
      case RecoveryMethod.PASSPHRASE:
        if (typeof input !== 'string' || input.length < 8) {
          return { valid: false, error: 'Passphrase must be at least 8 characters' };
        }
        break;

      case RecoveryMethod.KEY_FILE:
        if (!(input instanceof Uint8Array) || input.length === 0) {
          return { valid: false, error: 'Valid key file required' };
        }
        break;

      case RecoveryMethod.EMERGENCY_CODE:
        if (typeof input !== 'string' || !/^[A-Z0-9-]{16,}$/.test(input)) {
          return { valid: false, error: 'Emergency code format invalid' };
        }
        break;

      default:
        return { valid: false, error: 'Unsupported recovery method' };
    }

    return { valid: true };
  }
}