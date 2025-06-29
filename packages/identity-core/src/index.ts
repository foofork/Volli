// Export types first to establish the foundation
export type {
  KeyPair,
  PublicKey,
  PrivateKey,
  EncapsulationResult,
  SignatureResult,
  CryptoOperations,
  KeyDerivationParams,
  EncryptedData
} from './crypto-types';

// Export all types from types.ts (which includes re-exports from crypto-types)
export * from './types';

// Export new crypto architecture
export type {
  AlgorithmIdentifier,
  AlgorithmVersion,
  AlgorithmCapabilities,
  AlgorithmMetadata,
  PerformanceProfile,
  PerformanceMetric
} from './interfaces/algorithm-types';

export { AlgorithmType } from './interfaces/algorithm-types';

export type {
  CryptoProvider,
  CryptoCapabilities,
  CryptoFeature,
  ProviderRegistry as IProviderRegistry,
  ProviderConfig,
  ProviderType
} from './interfaces/crypto-provider';

// Export new architecture implementations
export { AlgorithmRegistry } from './providers/algorithm-registry';
export { ProviderRegistry } from './providers/provider-registry';
export { WASMCryptoProvider } from './providers/wasm-crypto-provider';
export { CryptoWorkerPool } from './workers/crypto-worker-pool';
export { CryptoFacade } from './orchestration/crypto-facade';

// Export core modules
export * from './identity';
export * from './identity-manager';
export * from './keys';
export * from './pairing';

// Export crypto functions (legacy compatibility)
export {
  initCrypto,
  generateKeyPair,
  keyEncapsulation,
  keyDecapsulation,
  signData,
  verifySignature,
  encryptData,
  decryptData,
  deriveKeyFromPassword,
  deriveSessionKeys,
  randomBytes,
  secureWipe,
  constantTimeEqual,
  generateSalt,
  generateKeyFromPassphrase
} from './crypto';

// Export kyber functions
export {
  KYBER768_PUBLIC_KEY_SIZE,
  KYBER768_PRIVATE_KEY_SIZE,
  KYBER768_CIPHERTEXT_SIZE,
  KYBER768_SHARED_SECRET_SIZE,
  generateKyber768KeyPair,
  generateKyber768KeyPairFromSeed,
  kyber768Encapsulate,
  kyber768Decapsulate,
  generateHybridKeyPairWithKyber768,
  hybridKeyEncapsulation,
  hybridKeyDecapsulation,
  validateKyber768KeySizes,
  getKyber768SecurityInfo,
  getWASMModuleInfo
} from './kyber';

// Export hybrid KEM types and functions
export type {
  HybridKEM,
  HybridEncapsulation,
  HybridCiphertext,
  HybridResult
} from './hybrid-kem';

export {
  HybridSecurityLevel,
  generateHybridKeyPair as generateHybridKEMKeyPair,
  hybridEncapsulate,
  hybridDecapsulate,
  getHybridKEMInfo
} from './hybrid-kem';

// Export dilithium functions
export {
  DILITHIUM_PUBLIC_KEY_SIZE,
  DILITHIUM_PRIVATE_KEY_SIZE,
  DILITHIUM_SIGNATURE_SIZE,
  generateDilithiumKeyPair,
  generateDilithiumKeyPairFromSeed,
  dilithiumSign,
  dilithiumVerify,
  getDilithiumSecurityInfo,
  getDSAModuleInfo
} from './dilithium';

// Export the combined crypto implementation functions
export {
  generateHybridKeyPair,
  performHybridKeyEncapsulation,
  performHybridKeyDecapsulation
} from './crypto-impl';