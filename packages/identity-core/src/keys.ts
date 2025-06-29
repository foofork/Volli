import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { 
  PublicKey, 
  PrivateKey, 
  DeviceKey, 
  SessionKey, 
  TrustLevel,
  KeyDerivationParams,
  EncryptedBackup
} from './types';
import { 
  generateKeyPair, 
  keyEncapsulation, 
  deriveSessionKeys,
  encryptData,
  decryptData,
  deriveKeyFromPassword,
  randomBytes,
  secureWipe
} from './crypto';

/**
 * Key management utilities for Volli identity system
 */

/**
 * Generate a new device key pair
 */
export async function generateDeviceKeys(name: string): Promise<{
  deviceKey: DeviceKey;
  privateKey: PrivateKey;
}> {
  const { publicKey, privateKey } = await generateKeyPair();
  
  const deviceKey: DeviceKey = {
    id: uuidv4(),
    name,
    publicKey,
    addedAt: Date.now(),
    lastSeen: Date.now(),
    trustLevel: TrustLevel.DEVICE
  };
  
  return { deviceKey, privateKey };
}

/**
 * Create a session key between two devices
 */
export async function createSessionKey(
  myPrivateKey: PrivateKey,
  theirPublicKey: PublicKey,
  expirationHours: number = 24
): Promise<SessionKey> {
  // Perform key exchange
  const { sharedSecret } = await keyEncapsulation(theirPublicKey);
  
  // Generate session ID
  const sessionId = uuidv4();
  
  // Derive session keys
  const { sendKey, receiveKey } = await deriveSessionKeys(sharedSecret, sessionId);
  
  const sessionKey: SessionKey = {
    id: sessionId,
    sharedSecret,
    sendKey,
    receiveKey,
    createdAt: Date.now(),
    expiresAt: Date.now() + (expirationHours * 60 * 60 * 1000)
  };
  
  // Clear shared secret from memory
  secureWipe(sharedSecret);
  
  return sessionKey;
}

/**
 * Check if a session key is expired
 */
export function isSessionExpired(sessionKey: SessionKey): boolean {
  return Date.now() > sessionKey.expiresAt;
}

/**
 * Rotate session keys (create new ones)
 */
export async function rotateSessionKey(
  oldSessionKey: SessionKey,
  myPrivateKey: PrivateKey,
  theirPublicKey: PublicKey,
  expirationHours: number = 24
): Promise<SessionKey> {
  // Clear old keys
  secureWipe(oldSessionKey.sharedSecret);
  secureWipe(oldSessionKey.sendKey);
  secureWipe(oldSessionKey.receiveKey);
  
  // Create new session
  return createSessionKey(myPrivateKey, theirPublicKey, expirationHours);
}

/**
 * Verify device key fingerprint
 */
export function getKeyFingerprint(publicKey: PublicKey): string {
  // Create a stable fingerprint from all public key components
  const combined = new Uint8Array(
    publicKey.kyber.length + 
    publicKey.dilithium.length + 
    publicKey.x25519.length + 
    publicKey.ed25519.length
  );
  
  let offset = 0;
  combined.set(publicKey.kyber, offset);
  offset += publicKey.kyber.length;
  combined.set(publicKey.dilithium, offset);
  offset += publicKey.dilithium.length;
  combined.set(publicKey.x25519, offset);
  offset += publicKey.x25519.length;
  combined.set(publicKey.ed25519, offset);
  
  // Create readable fingerprint (SHA-256 hash in hex)
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  
  // Format as fingerprint blocks
  return hash.match(/.{1,4}/g)?.join(' ').toUpperCase() || hash.toUpperCase();
}

/**
 * Export key pair for backup (encrypted)
 */
export async function exportKeyPairEncrypted(
  publicKey: PublicKey,
  privateKey: PrivateKey,
  password: string
): Promise<EncryptedBackup> {
  // Generate key derivation parameters
  const salt = await randomBytes(32);
  const params: KeyDerivationParams = {
    salt,
    iterations: 4, // Argon2id parameter
    memory: 67108864, // 64MB
    parallelism: 1
  };
  
  // Derive encryption key from password
  const encryptionKey = await deriveKeyFromPassword(password, params);
  
  // Serialize key data with proper Uint8Array handling
  const keyData = {
    publicKey: {
      kyber: Array.from(publicKey.kyber),
      dilithium: Array.from(publicKey.dilithium),
      x25519: Array.from(publicKey.x25519),
      ed25519: Array.from(publicKey.ed25519)
    },
    privateKey: {
      kyber: Array.from(privateKey.kyber),
      dilithium: Array.from(privateKey.dilithium),
      x25519: Array.from(privateKey.x25519),
      ed25519: Array.from(privateKey.ed25519)
    }
  };
  const serialized = new TextEncoder().encode(JSON.stringify(keyData));
  
  // Encrypt the data
  const { ciphertext, nonce } = await encryptData(serialized, encryptionKey);
  
  // Combine nonce and ciphertext
  const encryptedData = new Uint8Array(nonce.length + ciphertext.length);
  encryptedData.set(nonce, 0);
  encryptedData.set(ciphertext, nonce.length);
  
  // Create checksum
  const checksum = crypto.createHash('sha256')
    .update(encryptedData)
    .digest();
  
  // Clear sensitive data
  secureWipe(encryptionKey);
  secureWipe(serialized);
  
  return {
    version: 1,
    encryptedData,
    params,
    checksum: new Uint8Array(checksum)
  };
}

/**
 * Import key pair from backup (decrypt)
 */
export async function importKeyPairEncrypted(
  backup: EncryptedBackup,
  password: string
): Promise<{ publicKey: PublicKey; privateKey: PrivateKey }> {
  // Verify checksum
  const checksum = crypto.createHash('sha256')
    .update(backup.encryptedData)
    .digest();
  
  if (!Buffer.from(backup.checksum).equals(checksum)) {
    throw new Error('Invalid backup: checksum mismatch');
  }
  
  // Derive decryption key
  const decryptionKey = await deriveKeyFromPassword(password, backup.params);
  
  try {
    // Extract nonce and ciphertext
    const nonceLength = 24; // XChaCha20 nonce length
    const nonce = backup.encryptedData.slice(0, nonceLength);
    const ciphertext = backup.encryptedData.slice(nonceLength);
    
    // Decrypt the data
    const decrypted = await decryptData(ciphertext, decryptionKey, nonce);
    
    // Parse the key data
    const keyData = JSON.parse(new TextDecoder().decode(decrypted));
    
    // Convert arrays back to Uint8Arrays
    const publicKey: PublicKey = {
      kyber: new Uint8Array(keyData.publicKey.kyber),
      dilithium: new Uint8Array(keyData.publicKey.dilithium),
      x25519: new Uint8Array(keyData.publicKey.x25519),
      ed25519: new Uint8Array(keyData.publicKey.ed25519)
    };
    
    const privateKey: PrivateKey = {
      kyber: new Uint8Array(keyData.privateKey.kyber),
      dilithium: new Uint8Array(keyData.privateKey.dilithium),
      x25519: new Uint8Array(keyData.privateKey.x25519),
      ed25519: new Uint8Array(keyData.privateKey.ed25519)
    };
    
    // Clear sensitive data
    secureWipe(decryptionKey);
    secureWipe(decrypted);
    
    return { publicKey, privateKey };
  } catch {
    secureWipe(decryptionKey);
    throw new Error('Failed to decrypt backup: invalid password or corrupted data');
  }
}

/**
 * Update device key trust level
 */
export function updateDeviceTrust(deviceKey: DeviceKey, trustLevel: TrustLevel): DeviceKey {
  return {
    ...deviceKey,
    trustLevel,
    lastSeen: Date.now()
  };
}

/**
 * Check if device keys can be trusted for sensitive operations
 */
export function canTrustDevice(deviceKey: DeviceKey): boolean {
  return deviceKey.trustLevel >= TrustLevel.VERIFIED;
}

/**
 * Generate key derivation parameters for password-based encryption
 */
export async function generateKDFParams(): Promise<KeyDerivationParams> {
  return {
    salt: await randomBytes(32),
    iterations: 4, // Argon2id opslimit interactive
    memory: 67108864, // 64MB memlimit interactive
    parallelism: 1
  };
}

/**
 * Validate key pair consistency
 */
export function validateKeyPair(publicKey: PublicKey, privateKey: PrivateKey): boolean {
  try {
    // Check if key components have expected lengths
    const kyberPublicValid = publicKey.kyber.length === 1568;
    const kyberPrivateValid = privateKey.kyber.length === 2400;
    const dilithiumPublicValid = publicKey.dilithium.length === 1952;
    const dilithiumPrivateValid = privateKey.dilithium.length === 4000;
    const x25519Valid = publicKey.x25519.length === 32 && privateKey.x25519.length === 32;
    const ed25519Valid = publicKey.ed25519.length === 32 && privateKey.ed25519.length === 64;
    
    return kyberPublicValid && kyberPrivateValid && 
           dilithiumPublicValid && dilithiumPrivateValid &&
           x25519Valid && ed25519Valid;
  } catch {
    return false;
  }
}

/**
 * Securely clear session key from memory
 */
export function clearSessionKey(sessionKey: SessionKey): void {
  secureWipe(sessionKey.sharedSecret);
  secureWipe(sessionKey.sendKey);
  secureWipe(sessionKey.receiveKey);
}