// Import crypto types from crypto-types.ts
import type { PublicKey, PrivateKey, KeyPair, KeyDerivationParams } from './crypto-types';

// Re-export them
export type { PublicKey, PrivateKey, KeyPair, KeyDerivationParams };

export interface Identity {
  id: string;
  publicKey: PublicKey;
  privateKey: PrivateKey;
  deviceKeys: DeviceKey[];
  createdAt: number;
  metadata: IdentityMetadata;
}

export interface DeviceKey {
  id: string;
  name: string;
  publicKey: PublicKey;
  addedAt: number;
  lastSeen: number;
  trustLevel: TrustLevel;
}

export interface SessionKey {
  id: string;
  sharedSecret: Uint8Array;
  sendKey: Uint8Array;
  receiveKey: Uint8Array;
  createdAt: number;
  expiresAt: number;
}

export interface PairingData {
  qrCode: string;
  pin: string;
  publicKey: PublicKey;
  expiresAt: number;
}

export enum TrustLevel {
  NONE = 0,
  DEVICE = 1,
  VERIFIED = 2,
  TRUSTED = 3
}

export interface IdentityMetadata {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface EncryptedBackup {
  version: number;
  encryptedData: Uint8Array;
  params: KeyDerivationParams;
  checksum: Uint8Array;
}