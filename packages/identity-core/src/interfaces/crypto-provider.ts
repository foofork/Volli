/**
 * Provider interface for hot-swappable crypto implementations
 */

import { 
  KeyPair, 
  PublicKey, 
  PrivateKey, 
  EncapsulationResult,
  EncryptedData 
} from '../crypto-types';
import { 
  AlgorithmIdentifier, 
  AlgorithmCapabilities,
  AlgorithmType 
} from './algorithm-types';

export interface CryptoProvider {
  readonly name: string;
  readonly version: string;
  readonly priority: number; // Higher priority providers are preferred
  
  // Lifecycle
  isAvailable(): Promise<boolean>;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  
  // Capabilities
  getCapabilities(): CryptoCapabilities;
  supportsAlgorithm(algorithm: AlgorithmIdentifier): boolean;
  
  // Key operations
  generateKeyPair(algorithm: AlgorithmIdentifier): Promise<KeyPair>;
  importPublicKey(keyData: Uint8Array, algorithm: AlgorithmIdentifier): Promise<PublicKey>;
  importPrivateKey(keyData: Uint8Array, algorithm: AlgorithmIdentifier): Promise<PrivateKey>;
  exportPublicKey(publicKey: PublicKey, algorithm: AlgorithmIdentifier): Promise<Uint8Array>;
  exportPrivateKey(privateKey: PrivateKey, algorithm: AlgorithmIdentifier): Promise<Uint8Array>;
  
  // KEM operations
  encapsulate?(publicKey: PublicKey, algorithm: AlgorithmIdentifier): Promise<EncapsulationResult>;
  decapsulate?(privateKey: PrivateKey, ciphertext: Uint8Array, algorithm: AlgorithmIdentifier): Promise<Uint8Array>;
  
  // Signature operations
  sign?(data: Uint8Array, privateKey: PrivateKey, algorithm: AlgorithmIdentifier): Promise<Uint8Array>;
  verify?(data: Uint8Array, signature: Uint8Array, publicKey: PublicKey, algorithm: AlgorithmIdentifier): Promise<boolean>;
  
  // Symmetric operations
  encrypt?(data: Uint8Array, key: Uint8Array, algorithm: AlgorithmIdentifier): Promise<EncryptedData>;
  decrypt?(encrypted: EncryptedData, key: Uint8Array, algorithm: AlgorithmIdentifier): Promise<Uint8Array>;
  
  // Performance hints
  getBatchSize?(): number;
  supportsBatchOperations?(): boolean;
}

export interface CryptoCapabilities {
  algorithms: Map<AlgorithmType, Set<AlgorithmIdentifier>>;
  features: Set<CryptoFeature>;
  performance: ProviderPerformance;
  limitations?: ProviderLimitations;
}

export enum CryptoFeature {
  BATCH_OPERATIONS = 'batch_operations',
  PARALLEL_EXECUTION = 'parallel_execution',
  HARDWARE_ACCELERATION = 'hardware_acceleration',
  CONSTANT_TIME = 'constant_time',
  SIDE_CHANNEL_RESISTANT = 'side_channel_resistant',
  MEMORY_SECURE = 'memory_secure',
  FIPS_COMPLIANT = 'fips_compliant'
}

export interface ProviderPerformance {
  initializationTimeMs: number;
  memoryUsageMB: number;
  parallelism: number;
  benchmarks?: Map<string, number>; // operation -> ops/sec
}

export interface ProviderLimitations {
  maxKeySize?: number;
  maxDataSize?: number;
  requiresNetworkAccess?: boolean;
  platformRestrictions?: string[];
}

// Provider registry for managing multiple providers
export interface ProviderRegistry {
  register(provider: CryptoProvider): Promise<void>;
  unregister(name: string): void;
  getProvider(name: string): CryptoProvider | undefined;
  getProviders(): CryptoProvider[];
  getBestProvider(algorithm: AlgorithmIdentifier): CryptoProvider | undefined;
  
  // Events
  onProviderAdded?: (provider: CryptoProvider) => void;
  onProviderRemoved?: (name: string) => void;
  onProviderError?: (name: string, error: Error) => void;
}

// Factory for creating providers
export interface ProviderFactory {
  createProvider(config: ProviderConfig): Promise<CryptoProvider>;
}

export interface ProviderConfig {
  name: string;
  type: ProviderType;
  options?: Record<string, any>;
  fallbackProvider?: string;
}

export enum ProviderType {
  WASM = 'wasm',
  NATIVE = 'native',
  WEB_CRYPTO = 'web_crypto',
  SOFTWARE = 'software',
  HARDWARE = 'hardware'
}