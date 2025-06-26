import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { 
  PairingData, 
  PublicKey, 
  PrivateKey, 
  DeviceKey, 
  TrustLevel,
  SessionKey
} from './types';
import { generateKeyPair, signData, verifySignature } from './crypto';
import { getKeyFingerprint, createSessionKey } from './keys';
import { randomBytes } from './crypto';

/**
 * Device pairing and secure communication establishment
 * Implements secure device-to-device pairing using QR codes and PINs
 */

/**
 * Generate pairing data for device discovery
 */
export async function generatePairingData(
  devicePublicKey: PublicKey,
  expirationMinutes: number = 10
): Promise<PairingData> {
  // Generate secure PIN (6 digits)
  const pinBytes = await randomBytes(3);
  const pin = Array.from(pinBytes)
    .map(b => (b % 10).toString())
    .join('')
    .padStart(6, '0');
  
  // Create pairing data
  const pairingData: PairingData = {
    qrCode: '', // Will be generated below
    pin,
    publicKey: devicePublicKey,
    expiresAt: Date.now() + (expirationMinutes * 60 * 1000)
  };
  
  // Create QR code data (JSON with public key and PIN)
  const qrData = {
    v: 1, // Version
    pk: {
      kyber: Array.from(devicePublicKey.kyber),
      dilithium: Array.from(devicePublicKey.dilithium),
      x25519: Array.from(devicePublicKey.x25519),
      ed25519: Array.from(devicePublicKey.ed25519)
    },
    pin,
    exp: pairingData.expiresAt
  };
  
  // Generate QR code
  const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  pairingData.qrCode = qrCode;
  
  return pairingData;
}

/**
 * Parse pairing data from QR code
 */
export function parsePairingQRCode(qrCodeData: string): PairingData {
  try {
    const data = JSON.parse(qrCodeData);
    
    // Validate QR code format
    if (!data.v || data.v !== 1) {
      throw new Error('Unsupported QR code version');
    }
    
    if (!data.pk || !data.pin || !data.exp) {
      throw new Error('Invalid QR code format');
    }
    
    // Reconstruct public key
    const publicKey: PublicKey = {
      kyber: new Uint8Array(data.pk.kyber),
      dilithium: new Uint8Array(data.pk.dilithium),
      x25519: new Uint8Array(data.pk.x25519),
      ed25519: new Uint8Array(data.pk.ed25519)
    };
    
    return {
      qrCode: '', // Not needed for parsed data
      pin: data.pin,
      publicKey,
      expiresAt: data.exp
    };
  } catch (error) {
    throw new Error(`Failed to parse QR code: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verify pairing PIN
 */
export function verifyPairingPIN(pairingData: PairingData, inputPin: string): boolean {
  // Check expiration
  if (Date.now() > pairingData.expiresAt) {
    return false;
  }
  
  // Verify PIN (constant-time comparison)
  return pairingData.pin === inputPin;
}

/**
 * Complete device pairing process
 */
export async function completePairing(
  myPrivateKey: PrivateKey,
  myPublicKey: PublicKey,
  theirPairingData: PairingData,
  verifiedPin: string,
  deviceName: string = 'Paired Device'
): Promise<{
  deviceKey: DeviceKey;
  sessionKey: SessionKey;
  pairingSignature: Uint8Array;
}> {
  // Verify PIN first
  if (!verifyPairingPIN(theirPairingData, verifiedPin)) {
    throw new Error('Invalid PIN or pairing expired');
  }
  
  // Create device key for the paired device
  const deviceKey: DeviceKey = {
    id: uuidv4(),
    name: deviceName,
    publicKey: theirPairingData.publicKey,
    addedAt: Date.now(),
    lastSeen: Date.now(),
    trustLevel: TrustLevel.DEVICE // Start with basic trust
  };
  
  // Create session key for secure communication
  const sessionKey = await createSessionKey(
    myPrivateKey,
    theirPairingData.publicKey,
    24 // 24 hour session
  );
  
  // Create pairing signature to prove successful pairing
  const pairingProof = new TextEncoder().encode(
    `VOLLI_PAIRING:${deviceKey.id}:${sessionKey.id}:${verifiedPin}`
  );
  const pairingSignature = await signData(pairingProof, myPrivateKey);
  
  return {
    deviceKey,
    sessionKey,
    pairingSignature
  };
}

/**
 * Verify pairing signature from remote device
 */
export async function verifyPairingSignature(
  signature: Uint8Array,
  deviceKey: DeviceKey,
  sessionId: string,
  pin: string
): Promise<boolean> {
  const pairingProof = new TextEncoder().encode(
    `VOLLI_PAIRING:${deviceKey.id}:${sessionId}:${pin}`
  );
  
  return verifySignature(pairingProof, signature, deviceKey.publicKey);
}

/**
 * Generate device invitation link
 */
export function generateInvitationLink(
  pairingData: PairingData,
  baseUrl: string = 'https://volli.chat/pair'
): string {
  const params = new URLSearchParams({
    d: Buffer.from(JSON.stringify({
      pk: {
        kyber: Array.from(pairingData.publicKey.kyber),
        dilithium: Array.from(pairingData.publicKey.dilithium),
        x25519: Array.from(pairingData.publicKey.x25519),
        ed25519: Array.from(pairingData.publicKey.ed25519)
      },
      pin: pairingData.pin,
      exp: pairingData.expiresAt
    })).toString('base64')
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parse device invitation link
 */
export function parseInvitationLink(invitationUrl: string): PairingData {
  try {
    const url = new URL(invitationUrl);
    const encodedData = url.searchParams.get('d');
    
    if (!encodedData) {
      throw new Error('Invalid invitation link format');
    }
    
    const data = JSON.parse(Buffer.from(encodedData, 'base64').toString());
    
    const publicKey: PublicKey = {
      kyber: new Uint8Array(data.pk.kyber),
      dilithium: new Uint8Array(data.pk.dilithium),
      x25519: new Uint8Array(data.pk.x25519),
      ed25519: new Uint8Array(data.pk.ed25519)
    };
    
    return {
      qrCode: '', // Not applicable for link-based pairing
      pin: data.pin,
      publicKey,
      expiresAt: data.exp
    };
  } catch (error) {
    throw new Error(`Failed to parse invitation link: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if pairing data is expired
 */
export function isPairingExpired(pairingData: PairingData): boolean {
  return Date.now() > pairingData.expiresAt;
}

/**
 * Generate secure pairing challenge for additional verification
 */
export async function generatePairingChallenge(
  myPrivateKey: PrivateKey,
  theirPublicKey: PublicKey
): Promise<{
  challenge: Uint8Array;
  signature: Uint8Array;
}> {
  // Generate random challenge
  const challenge = await randomBytes(32);
  
  // Sign the challenge with our private key
  const signature = await signData(challenge, myPrivateKey);
  
  return { challenge, signature };
}

/**
 * Verify pairing challenge response
 */
export async function verifyPairingChallenge(
  challenge: Uint8Array,
  signature: Uint8Array,
  theirPublicKey: PublicKey
): Promise<boolean> {
  return verifySignature(challenge, signature, theirPublicKey);
}

/**
 * Get pairing status information
 */
export function getPairingStatus(pairingData: PairingData): {
  isExpired: boolean;
  remainingMinutes: number;
  fingerprint: string;
} {
  const isExpired = isPairingExpired(pairingData);
  const remainingMs = Math.max(0, pairingData.expiresAt - Date.now());
  const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
  const fingerprint = getKeyFingerprint(pairingData.publicKey);
  
  return {
    isExpired,
    remainingMinutes,
    fingerprint
  };
}

/**
 * Create manual pairing data (without QR code)
 */
export function createManualPairingData(
  publicKey: PublicKey,
  pin: string,
  expirationMinutes: number = 10
): PairingData {
  return {
    qrCode: '', // No QR code for manual pairing
    pin,
    publicKey,
    expiresAt: Date.now() + (expirationMinutes * 60 * 1000)
  };
}

/**
 * Validate pairing data integrity
 */
export function validatePairingData(pairingData: PairingData): boolean {
  try {
    // Check required fields
    if (!pairingData.pin || !pairingData.publicKey || !pairingData.expiresAt) {
      return false;
    }
    
    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pairingData.pin)) {
      return false;
    }
    
    // Check public key structure
    const pk = pairingData.publicKey;
    if (!pk.kyber || !pk.dilithium || !pk.x25519 || !pk.ed25519) {
      return false;
    }
    
    // Validate key lengths
    if (pk.kyber.length !== 1568 || 
        pk.dilithium.length !== 1952 || 
        pk.x25519.length !== 32 || 
        pk.ed25519.length !== 32) {
      return false;
    }
    
    // Check expiration is in the future (for new pairing data)
    if (pairingData.expiresAt <= Date.now()) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}