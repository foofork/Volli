/**
 * Algorithm type definitions for hot-swappable crypto system
 */

export interface AlgorithmIdentifier {
  name: string;
  version: AlgorithmVersion;
  type: AlgorithmType;
}

export interface AlgorithmVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  deprecated?: boolean;
  migrationPath?: AlgorithmIdentifier;
}

export const enum AlgorithmType {
  KEM = 'kem',
  SIGNATURE = 'signature',
  HASH = 'hash',
  SYMMETRIC = 'symmetric',
  KDF = 'kdf'
}

export interface AlgorithmCapabilities {
  keySize: number;
  publicKeySize: number;
  privateKeySize: number;
  ciphertextSize?: number;
  signatureSize?: number;
  securityLevel: number; // in bits
  quantumResistant: boolean;
  performance: PerformanceProfile;
}

export interface PerformanceProfile {
  keyGeneration: PerformanceMetric;
  encryption?: PerformanceMetric;
  decryption?: PerformanceMetric;
  signing?: PerformanceMetric;
  verification?: PerformanceMetric;
}

export interface PerformanceMetric {
  averageMs: number;
  opsPerSecond: number;
  memoryUsageKB: number;
}

export interface AlgorithmMetadata {
  id: AlgorithmIdentifier;
  capabilities: AlgorithmCapabilities;
  description: string;
  standard?: string; // e.g., "NIST FIPS 203"
  recommendedUsage: string[];
  warnings?: string[];
}

// Algorithm negotiation for compatibility
export interface AlgorithmNegotiation {
  supported: AlgorithmIdentifier[];
  preferred: AlgorithmIdentifier;
  minimum: AlgorithmVersion;
}

// Migration strategy interface
export interface AlgorithmMigration {
  from: AlgorithmIdentifier;
  to: AlgorithmIdentifier;
  automatic: boolean;
  dataTransform?: (data: Uint8Array) => Promise<Uint8Array>;
  keyTransform?: (key: Uint8Array) => Promise<Uint8Array>;
}