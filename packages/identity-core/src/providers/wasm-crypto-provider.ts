/**
 * WASM Crypto Provider implementation for high-performance post-quantum algorithms
 */

import { 
  CryptoProvider, 
  CryptoCapabilities, 
  CryptoFeature, 
  ProviderPerformance,
  ProviderType 
} from '../interfaces/crypto-provider';
import { 
  AlgorithmIdentifier, 
  AlgorithmType, 
  AlgorithmCapabilities 
} from '../interfaces/algorithm-types';
import { KeyPair, PublicKey, PrivateKey, EncapsulationResult } from '../crypto-types';

interface WASMModule {
  VollyKEM: any;
  VollyDSA: any;
  get_algorithm_info(): any;
  get_dsa_algorithm_info(): any;
}

export class WASMCryptoProvider implements CryptoProvider {
  readonly name = 'volly-wasm';
  readonly version = '1.0.0';
  readonly priority = 10; // High priority for quantum-safe algorithms
  
  private wasmModule?: WASMModule;
  private loadPromise?: Promise<void>;
  private capabilities?: CryptoCapabilities;
  
  constructor(
    private wasmPath = '@volli/crypto-wasm'
  ) {}
  
  /**
   * Check if WASM is available in the environment
   */
  async isAvailable(): Promise<boolean> {
    if (typeof WebAssembly === 'undefined') {
      return false;
    }
    
    try {
      // Try to load the WASM module
      if (!this.wasmModule) {
        await this.loadWASMModule();
      }
      return !!this.wasmModule;
    } catch {
      return false;
    }
  }
  
  /**
   * Initialize the WASM provider
   */
  async initialize(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.loadWASMModule();
    }
    await this.loadPromise;
    
    if (!this.wasmModule) {
      throw new Error('Failed to load WASM module');
    }
    
    this.capabilities = await this.detectCapabilities();
  }
  
  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.wasmModule = undefined;
    this.loadPromise = undefined;
    this.capabilities = undefined;
  }
  
  /**
   * Get provider capabilities
   */
  getCapabilities(): CryptoCapabilities {
    if (!this.capabilities) {
      throw new Error('Provider not initialized');
    }
    return this.capabilities;
  }
  
  /**
   * Check if algorithm is supported
   */
  supportsAlgorithm(algorithm: AlgorithmIdentifier): boolean {
    if (!this.capabilities) return false;
    
    const typeAlgorithms = this.capabilities.algorithms.get(algorithm.type);
    if (!typeAlgorithms) return false;
    
    return Array.from(typeAlgorithms).some(
      alg => alg.name === algorithm.name && 
             alg.version.major === algorithm.version.major
    );
  }
  
  /**
   * Generate key pair
   */
  async generateKeyPair(algorithm: AlgorithmIdentifier): Promise<KeyPair> {
    this.ensureInitialized();
    
    if (algorithm.type === AlgorithmType.KEM && algorithm.name === 'ML-KEM-768') {
      return this.generateKyberKeyPair();
    } else if (algorithm.type === AlgorithmType.SIGNATURE && algorithm.name === 'ML-DSA-65') {
      return this.generateDilithiumKeyPair();
    }
    
    throw new Error(`Algorithm ${algorithm.name} not supported`);
  }
  
  /**
   * Encapsulate shared secret
   */
  async encapsulate(
    publicKey: PublicKey, 
    algorithm: AlgorithmIdentifier
  ): Promise<EncapsulationResult> {
    this.ensureInitialized();
    
    if (algorithm.type !== AlgorithmType.KEM) {
      throw new Error('Encapsulation only supports KEM algorithms');
    }
    
    if (algorithm.name === 'ML-KEM-768') {
      return this.kyberEncapsulate(publicKey.kyber);
    }
    
    throw new Error(`KEM algorithm ${algorithm.name} not supported`);
  }
  
  /**
   * Decapsulate shared secret
   */
  async decapsulate(
    privateKey: PrivateKey,
    ciphertext: Uint8Array,
    algorithm: AlgorithmIdentifier
  ): Promise<Uint8Array> {
    this.ensureInitialized();
    
    if (algorithm.type !== AlgorithmType.KEM) {
      throw new Error('Decapsulation only supports KEM algorithms');
    }
    
    if (algorithm.name === 'ML-KEM-768') {
      return this.kyberDecapsulate(privateKey.kyber, ciphertext);
    }
    
    throw new Error(`KEM algorithm ${algorithm.name} not supported`);
  }
  
  /**
   * Sign data
   */
  async sign(
    data: Uint8Array,
    privateKey: PrivateKey,
    algorithm: AlgorithmIdentifier
  ): Promise<Uint8Array> {
    this.ensureInitialized();
    
    if (algorithm.type !== AlgorithmType.SIGNATURE) {
      throw new Error('Signing only supports signature algorithms');
    }
    
    if (algorithm.name === 'ML-DSA-65') {
      return this.dilithiumSign(data, privateKey.dilithium);
    }
    
    throw new Error(`Signature algorithm ${algorithm.name} not supported`);
  }
  
  /**
   * Verify signature
   */
  async verify(
    data: Uint8Array,
    signature: Uint8Array,
    publicKey: PublicKey,
    algorithm: AlgorithmIdentifier
  ): Promise<boolean> {
    this.ensureInitialized();
    
    if (algorithm.type !== AlgorithmType.SIGNATURE) {
      throw new Error('Verification only supports signature algorithms');
    }
    
    if (algorithm.name === 'ML-DSA-65') {
      return this.dilithiumVerify(data, signature, publicKey.dilithium);
    }
    
    throw new Error(`Signature algorithm ${algorithm.name} not supported`);
  }
  
  /**
   * Import public key (not needed for WASM provider)
   */
  async importPublicKey(keyData: Uint8Array, algorithm: AlgorithmIdentifier): Promise<PublicKey> {
    throw new Error('WASM provider uses direct key data');
  }
  
  /**
   * Import private key (not needed for WASM provider)
   */
  async importPrivateKey(keyData: Uint8Array, algorithm: AlgorithmIdentifier): Promise<PrivateKey> {
    throw new Error('WASM provider uses direct key data');
  }
  
  /**
   * Export public key
   */
  async exportPublicKey(publicKey: PublicKey, algorithm: AlgorithmIdentifier): Promise<Uint8Array> {
    if (algorithm.name === 'ML-KEM-768') {
      return publicKey.kyber;
    } else if (algorithm.name === 'ML-DSA-65') {
      return publicKey.dilithium;
    }
    
    throw new Error(`Algorithm ${algorithm.name} not supported`);
  }
  
  /**
   * Export private key
   */
  async exportPrivateKey(privateKey: PrivateKey, algorithm: AlgorithmIdentifier): Promise<Uint8Array> {
    if (algorithm.name === 'ML-KEM-768') {
      return privateKey.kyber;
    } else if (algorithm.name === 'ML-DSA-65') {
      return privateKey.dilithium;
    }
    
    throw new Error(`Algorithm ${algorithm.name} not supported`);
  }
  
  private async loadWASMModule(): Promise<void> {
    try {
      this.wasmModule = await import(this.wasmPath) as WASMModule;
    } catch (error) {
      throw new Error(`Failed to load WASM module: ${error}`);
    }
  }
  
  private async detectCapabilities(): Promise<CryptoCapabilities> {
    if (!this.wasmModule) {
      throw new Error('WASM module not loaded');
    }
    
    const algorithms = new Map();
    
    // Add KEM algorithms
    const kemAlgorithms = new Set<AlgorithmIdentifier>();
    kemAlgorithms.add({
      name: 'ML-KEM-768',
      version: { major: 1, minor: 0, patch: 0 },
      type: AlgorithmType.KEM
    });
    algorithms.set(AlgorithmType.KEM, kemAlgorithms);
    
    // Add signature algorithms
    const sigAlgorithms = new Set<AlgorithmIdentifier>();
    sigAlgorithms.add({
      name: 'ML-DSA-65',
      version: { major: 1, minor: 0, patch: 0 },
      type: AlgorithmType.SIGNATURE
    });
    algorithms.set(AlgorithmType.SIGNATURE, sigAlgorithms);
    
    const features = new Set<CryptoFeature>([
      CryptoFeature.CONSTANT_TIME,
      CryptoFeature.SIDE_CHANNEL_RESISTANT,
      CryptoFeature.MEMORY_SECURE
    ]);
    
    const performance: ProviderPerformance = {
      initializationTimeMs: 0, // Will be measured during initialization
      memoryUsageMB: 5, // Estimated WASM memory usage
      parallelism: 1, // WASM is typically single-threaded
      benchmarks: new Map([
        ['ML-KEM-768-keygen', 1000], // ops/sec - placeholder
        ['ML-KEM-768-encaps', 2000],
        ['ML-DSA-65-sign', 800],
        ['ML-DSA-65-verify', 1500]
      ])
    };
    
    return {
      algorithms,
      features,
      performance
    };
  }
  
  private async generateKyberKeyPair(): Promise<KeyPair> {
    const kem = new this.wasmModule!.VollyKEM();
    
    return {
      publicKey: {
        kyber: new Uint8Array(kem.public_key),
        dilithium: new Uint8Array(0), // Not generated here
        x25519: new Uint8Array(0),
        ed25519: new Uint8Array(0)
      },
      privateKey: {
        kyber: new Uint8Array(kem.secret_key),
        dilithium: new Uint8Array(0), // Not generated here
        x25519: new Uint8Array(0),
        ed25519: new Uint8Array(0)
      }
    };
  }
  
  private async generateDilithiumKeyPair(): Promise<KeyPair> {
    const dsa = new this.wasmModule!.VollyDSA();
    
    return {
      publicKey: {
        kyber: new Uint8Array(0),
        dilithium: new Uint8Array(dsa.public_key),
        x25519: new Uint8Array(0),
        ed25519: new Uint8Array(0)
      },
      privateKey: {
        kyber: new Uint8Array(0),
        dilithium: new Uint8Array(dsa.secret_key),
        x25519: new Uint8Array(0),
        ed25519: new Uint8Array(0)
      }
    };
  }
  
  private async kyberEncapsulate(publicKey: Uint8Array): Promise<EncapsulationResult> {
    const kem = new this.wasmModule!.VollyKEM();
    const result = kem.encapsulate(publicKey);
    
    return {
      sharedSecret: new Uint8Array(result.shared_secret),
      ciphertext: new Uint8Array(result.ciphertext)
    };
  }
  
  private async kyberDecapsulate(privateKey: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
    // Use static method if available, otherwise use instance method
    if (this.wasmModule!.VollyKEM.decapsulate_with_key) {
      return new Uint8Array(
        this.wasmModule!.VollyKEM.decapsulate_with_key(privateKey, ciphertext)
      );
    } else {
      // Fallback to instance method (less efficient)
      const kem = this.wasmModule!.VollyKEM.from_keys(
        new Uint8Array(1184), // Dummy public key
        privateKey
      );
      return new Uint8Array(kem.decapsulate(ciphertext));
    }
  }
  
  private async dilithiumSign(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Use static method if available
    if (this.wasmModule!.VollyDSA.sign_with_key) {
      return new Uint8Array(
        this.wasmModule!.VollyDSA.sign_with_key(privateKey, data)
      );
    } else {
      throw new Error('Static signing method not available - WASM module needs rebuild');
    }
  }
  
  private async dilithiumVerify(
    data: Uint8Array, 
    signature: Uint8Array, 
    publicKey: Uint8Array
  ): Promise<boolean> {
    return this.wasmModule!.VollyDSA.verify_with_key(publicKey, data, signature);
  }
  
  private ensureInitialized(): void {
    if (!this.wasmModule) {
      throw new Error('WASM provider not initialized');
    }
  }
}