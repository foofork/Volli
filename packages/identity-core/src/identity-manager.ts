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
  addDevice,
  removeDevice,
  updateDeviceTrustLevel,
  getDevice,
  getTrustedDevices,
  signWithIdentity,
  verifyIdentitySignature,
  exportIdentityEncrypted,
  importIdentityEncrypted,
  getIdentityFingerprint,
  validateIdentity,
  getIdentityStats,
  cleanupDevices
} from './identity';
import { generateKeyPair, verifySignature } from './crypto';

/**
 * Identity Manager class for managing identities and devices
 */
export class IdentityManager {
  private identities: Map<string, Identity> = new Map();
  private privateKeys: Map<string, PrivateKey> = new Map();

  /**
   * Create a new identity
   */
  async createIdentity(
    deviceName?: string,
    metadata?: Partial<IdentityMetadata>
  ): Promise<Identity> {
    const { identity, privateKey } = await createIdentity(deviceName, metadata);
    
    this.identities.set(identity.id, identity);
    this.privateKeys.set(identity.id, privateKey);
    
    return identity;
  }

  /**
   * Get an identity by ID
   */
  getIdentity(identityId: string): Identity | undefined {
    return this.identities.get(identityId);
  }

  /**
   * Get all identities
   */
  getAllIdentities(): Identity[] {
    return Array.from(this.identities.values());
  }

  /**
   * Add a device to an identity
   */
  async addDevice(
    identityId: string,
    deviceName: string,
    devicePublicKey: PublicKey,
    trustLevel?: TrustLevel
  ): Promise<Identity> {
    const identity = this.identities.get(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    const updatedIdentity = await addDevice(identity, deviceName, devicePublicKey, trustLevel);
    this.identities.set(identityId, updatedIdentity);
    
    return updatedIdentity;
  }

  /**
   * Remove a device from an identity
   */
  removeDevice(identityId: string, deviceId: string): Identity {
    const identity = this.identities.get(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    const updatedIdentity = removeDevice(identity, deviceId);
    this.identities.set(identityId, updatedIdentity);
    
    return updatedIdentity;
  }

  /**
   * Update device trust level
   */
  updateDeviceTrustLevel(
    identityId: string,
    deviceId: string,
    trustLevel: TrustLevel
  ): Identity {
    const identity = this.identities.get(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    const updatedIdentity = updateDeviceTrustLevel(identity, deviceId, trustLevel);
    this.identities.set(identityId, updatedIdentity);
    
    return updatedIdentity;
  }

  /**
   * Get a specific device
   */
  getDevice(identityId: string, deviceId: string): DeviceKey | undefined {
    const identity = this.identities.get(identityId);
    if (!identity) {
      return undefined;
    }

    return getDevice(identity, deviceId);
  }

  /**
   * Get all trusted devices for an identity
   */
  getTrustedDevices(identityId: string): DeviceKey[] {
    const identity = this.identities.get(identityId);
    if (!identity) {
      return [];
    }

    return getTrustedDevices(identity);
  }

  /**
   * Sign data with an identity
   */
  async signWithIdentity(
    identityId: string,
    data: Uint8Array
  ): Promise<Uint8Array> {
    const identity = this.identities.get(identityId);
    const privateKey = this.privateKeys.get(identityId);
    
    if (!identity || !privateKey) {
      throw new Error('Identity or private key not found');
    }

    return signWithIdentity(identity, privateKey, data);
  }

  /**
   * Verify signature against an identity
   */
  async verifyIdentitySignature(
    identityId: string,
    data: Uint8Array,
    signature: Uint8Array
  ): Promise<boolean> {
    const identity = this.identities.get(identityId);
    if (!identity) {
      return false;
    }

    return verifyIdentitySignature(identity, data, signature);
  }

  /**
   * Export identity for backup
   */
  async exportIdentity(identityId: string, password: string): Promise<EncryptedBackup> {
    const identity = this.identities.get(identityId);
    const privateKey = this.privateKeys.get(identityId);
    
    if (!identity || !privateKey) {
      throw new Error('Identity or private key not found');
    }

    return await exportIdentityEncrypted(identity, privateKey, password);
  }

  /**
   * Import identity from backup
   */
  async importIdentity(backup: EncryptedBackup, password: string): Promise<Identity> {
    const { identity, privateKey } = await importIdentityEncrypted(backup, password);
    
    this.identities.set(identity.id, identity);
    this.privateKeys.set(identity.id, privateKey);
    
    return identity;
  }

  /**
   * Get identity fingerprint
   */
  getIdentityFingerprint(identityId: string): string {
    const identity = this.identities.get(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    return getIdentityFingerprint(identity);
  }

  /**
   * Validate identity
   */
  validateIdentity(identityId: string): boolean {
    const identity = this.identities.get(identityId);
    if (!identity) {
      return false;
    }

    return validateIdentity(identity);
  }

  /**
   * Get identity statistics
   */
  getIdentityStats(identityId: string) {
    const identity = this.identities.get(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    return getIdentityStats(identity);
  }

  /**
   * Rotate keys for an identity
   */
  async rotateKeys(identityId: string): Promise<Identity> {
    const identity = this.identities.get(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    // Generate new key pair
    const { publicKey, privateKey } = await generateKeyPair();
    
    // Update identity with new keys
    const updatedIdentity: Identity = {
      ...identity,
      publicKey,
      // Add the new keys as a device
      deviceKeys: [
        ...identity.deviceKeys,
        {
          id: `rotated-${Date.now()}`,
          name: 'Rotated Keys',
          publicKey,
          addedAt: Date.now(),
          lastSeen: Date.now(),
          trustLevel: TrustLevel.TRUSTED
        }
      ]
    };

    this.identities.set(identityId, updatedIdentity);
    this.privateKeys.set(identityId, privateKey);
    
    return updatedIdentity;
  }

  /**
   * Validate device signature
   */
  async validateDevice(
    identityId: string,
    deviceId: string,
    data: Uint8Array,
    signature: Uint8Array
  ): Promise<boolean> {
    const identity = this.identities.get(identityId);
    if (!identity) {
      return false;
    }

    const device = getDevice(identity, deviceId);
    if (!device) {
      return false;
    }

    // Verify signature against the device's public key
    // For the primary device, this should be the same as the identity's public key
    return verifySignature(data, signature, device.publicKey);
  }

  /**
   * Clean up expired devices
   */
  cleanupDevices(identityId: string, maxInactivityDays?: number): Identity {
    const identity = this.identities.get(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    const updatedIdentity = cleanupDevices(identity, maxInactivityDays);
    this.identities.set(identityId, updatedIdentity);
    
    return updatedIdentity;
  }
}