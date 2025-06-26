import { v4 as uuidv4 } from 'uuid';
import { 
  Identity, 
  PublicKey, 
  PrivateKey, 
  DeviceKey, 
  TrustLevel, 
  IdentityMetadata,
  EncryptedBackup
} from './types';
import { generateKeyPair, signData, verifySignature } from './crypto';
import { 
  getKeyFingerprint, 
  exportKeyPairEncrypted,
  importKeyPairEncrypted,
  updateDeviceTrust,
  canTrustDevice
} from './keys';

/**
 * Core identity management for Volli
 * Handles user identity creation, device management, and trust relationships
 */

/**
 * Create a new identity with initial device
 */
export async function createIdentity(
  deviceName: string = 'Primary Device',
  metadata: Partial<IdentityMetadata> = {}
): Promise<{ identity: Identity; privateKey: PrivateKey }> {
  // Generate master key pair
  const { publicKey, privateKey } = await generateKeyPair();
  
  // Create initial device key (same as master key for primary device)
  const primaryDevice: DeviceKey = {
    id: uuidv4(),
    name: deviceName,
    publicKey,
    addedAt: Date.now(),
    lastSeen: Date.now(),
    trustLevel: TrustLevel.TRUSTED // Primary device is always trusted
  };
  
  // Create identity
  const identity: Identity = {
    id: uuidv4(),
    publicKey,
    privateKey: privateKey, // This will be removed for storage
    deviceKeys: [primaryDevice],
    createdAt: Date.now(),
    metadata: {
      displayName: metadata.displayName || 'Anonymous User',
      avatarUrl: metadata.avatarUrl,
      bio: metadata.bio
    }
  };
  
  return { identity, privateKey };
}

/**
 * Load identity from stored data (without private key)
 */
export function loadIdentity(identityData: Omit<Identity, 'privateKey'>): Identity {
  return {
    ...identityData,
    privateKey: {} as PrivateKey // Placeholder - private key loaded separately
  };
}

/**
 * Update identity metadata
 */
export function updateIdentityMetadata(
  identity: Identity, 
  metadata: Partial<IdentityMetadata>
): Identity {
  return {
    ...identity,
    metadata: {
      ...identity.metadata,
      ...metadata
    }
  };
}

/**
 * Add a new device to identity
 */
export async function addDevice(
  identity: Identity,
  deviceName: string,
  devicePublicKey: PublicKey,
  trustLevel: TrustLevel = TrustLevel.DEVICE
): Promise<Identity> {
  // Validate the device public key format (just check if it has the expected structure)
  if (!devicePublicKey.x25519 || !devicePublicKey.ed25519 || !devicePublicKey.kyber || !devicePublicKey.dilithium) {
    throw new Error('Invalid device public key format');
  }
  
  // Check if device already exists
  const existingDevice = identity.deviceKeys.find(
    device => getKeyFingerprint(device.publicKey) === getKeyFingerprint(devicePublicKey)
  );
  
  if (existingDevice) {
    throw new Error('Device already exists in identity');
  }
  
  // Create new device key
  const deviceKey: DeviceKey = {
    id: uuidv4(),
    name: deviceName,
    publicKey: devicePublicKey,
    addedAt: Date.now(),
    lastSeen: Date.now(),
    trustLevel
  };
  
  return {
    ...identity,
    deviceKeys: [...identity.deviceKeys, deviceKey]
  };
}

/**
 * Remove a device from identity
 */
export function removeDevice(identity: Identity, deviceId: string): Identity {
  // Prevent removing the last device
  if (identity.deviceKeys.length <= 1) {
    throw new Error('Cannot remove the last device from identity');
  }
  
  // Find the device
  const deviceIndex = identity.deviceKeys.findIndex(device => device.id === deviceId);
  if (deviceIndex === -1) {
    throw new Error('Device not found in identity');
  }
  
  // Remove the device
  const updatedDevices = identity.deviceKeys.filter(device => device.id !== deviceId);
  
  return {
    ...identity,
    deviceKeys: updatedDevices
  };
}

/**
 * Update device trust level
 */
export function updateDeviceTrustLevel(
  identity: Identity, 
  deviceId: string, 
  trustLevel: TrustLevel
): Identity {
  const deviceIndex = identity.deviceKeys.findIndex(device => device.id === deviceId);
  if (deviceIndex === -1) {
    throw new Error('Device not found in identity');
  }
  
  const updatedDevices = [...identity.deviceKeys];
  updatedDevices[deviceIndex] = updateDeviceTrust(updatedDevices[deviceIndex], trustLevel);
  
  return {
    ...identity,
    deviceKeys: updatedDevices
  };
}

/**
 * Get device by ID
 */
export function getDevice(identity: Identity, deviceId: string): DeviceKey | undefined {
  return identity.deviceKeys.find(device => device.id === deviceId);
}

/**
 * Get all trusted devices
 */
export function getTrustedDevices(identity: Identity): DeviceKey[] {
  return identity.deviceKeys.filter(device => canTrustDevice(device));
}

/**
 * Sign data with identity (using primary device key if available)
 */
export async function signWithIdentity(
  identity: Identity,
  privateKey: PrivateKey,
  data: Uint8Array
): Promise<Uint8Array> {
  // Verify the private key has the expected structure
  if (!privateKey.x25519 || !privateKey.ed25519 || !privateKey.kyber || !privateKey.dilithium) {
    throw new Error('Private key does not match identity public key');
  }
  
  return signData(data, privateKey);
}

/**
 * Verify signature against identity
 */
export async function verifyIdentitySignature(
  identity: Identity,
  data: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  return verifySignature(data, signature, identity.publicKey);
}

/**
 * Export identity for backup (encrypted)
 */
export async function exportIdentityEncrypted(
  identity: Identity,
  privateKey: PrivateKey,
  password: string
): Promise<EncryptedBackup> {
  // Use the existing key export function
  return await exportKeyPairEncrypted(identity.publicKey, privateKey, password);
}

/**
 * Import identity from backup (decrypt)
 */
export async function importIdentityEncrypted(
  backup: EncryptedBackup,
  password: string
): Promise<{ identity: Identity; privateKey: PrivateKey }> {
  const { publicKey, privateKey } = await importKeyPairEncrypted(backup, password);
  
  // Create a minimal identity structure
  // In a real implementation, the backup would contain full identity data
  const identity: Identity = {
    id: uuidv4(), // Generate new ID for imported identity
    publicKey,
    privateKey: {} as PrivateKey, // Remove private key from identity object
    deviceKeys: [{
      id: uuidv4(),
      name: 'Imported Device',
      publicKey,
      addedAt: Date.now(),
      lastSeen: Date.now(),
      trustLevel: TrustLevel.TRUSTED
    }],
    createdAt: Date.now(),
    metadata: {
      displayName: 'Imported Identity'
    }
  };
  
  return { identity, privateKey };
}

/**
 * Get identity fingerprint for display
 */
export function getIdentityFingerprint(identity: Identity): string {
  return getKeyFingerprint(identity.publicKey);
}

/**
 * Validate identity structure
 */
export function validateIdentity(identity: Identity): boolean {
  try {
    // Check required fields
    if (!identity.id || !identity.publicKey || !identity.deviceKeys || !identity.createdAt) {
      return false;
    }
    
    // Validate public key format
    if (!identity.publicKey.x25519 || !identity.publicKey.ed25519 || 
        !identity.publicKey.kyber || !identity.publicKey.dilithium) {
      return false;
    }
    
    // Check that at least one device exists
    if (identity.deviceKeys.length === 0) {
      return false;
    }
    
    // Validate each device key
    for (const device of identity.deviceKeys) {
      if (!device.id || !device.name || !device.publicKey || !device.addedAt) {
        return false;
      }
      
      if (!device.publicKey.x25519 || !device.publicKey.ed25519 || 
          !device.publicKey.kyber || !device.publicKey.dilithium) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get identity stats
 */
export function getIdentityStats(identity: Identity): {
  deviceCount: number;
  trustedDeviceCount: number;
  createdDaysAgo: number;
  lastActiveDevice: DeviceKey | undefined;
} {
  const trustedDevices = getTrustedDevices(identity);
  const lastActiveDevice = identity.deviceKeys.reduce((latest, device) => 
    !latest || device.lastSeen > latest.lastSeen ? device : latest
  );
  
  return {
    deviceCount: identity.deviceKeys.length,
    trustedDeviceCount: trustedDevices.length,
    createdDaysAgo: Math.floor((Date.now() - identity.createdAt) / (1000 * 60 * 60 * 24)),
    lastActiveDevice
  };
}

/**
 * Clean up expired or unused devices
 */
export function cleanupDevices(
  identity: Identity, 
  maxInactivityDays: number = 90
): Identity {
  const cutoffTime = Date.now() - (maxInactivityDays * 24 * 60 * 60 * 1000);
  
  // Keep at least one device (the primary/most recent)
  const sortedDevices = [...identity.deviceKeys].sort((a, b) => b.lastSeen - a.lastSeen);
  const activeDevices = sortedDevices.filter((device, index) => 
    index === 0 || device.lastSeen > cutoffTime || device.trustLevel >= TrustLevel.VERIFIED
  );
  
  return {
    ...identity,
    deviceKeys: activeDevices
  };
}