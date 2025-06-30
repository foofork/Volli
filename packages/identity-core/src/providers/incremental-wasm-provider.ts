/**
 * Incremental WASM Provider for Phase 2B Enhancement
 * Provides feature-flagged WASM integration with automatic fallback
 */

import { EventEmitter } from 'eventemitter3';
import { 
  CryptoProvider,
  CryptoCapabilities,
  CryptoFeature,
  ProviderPerformance,
  ProviderLimitations
} from '../interfaces/crypto-provider';
import { 
  AlgorithmIdentifier, 
  AlgorithmType 
} from '../interfaces/algorithm-types';
import { 
  KeyPair, 
  PublicKey, 
  PrivateKey, 
  EncapsulationResult,
  EncryptedData 
} from '../crypto-types';

export interface WASMFeatureFlags {
  ENABLE_WASM_CRYPTO: boolean;
  ENABLE_WASM_KEM: boolean;
  ENABLE_WASM_SIGNATURES: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;
  WASM_FALLBACK_THRESHOLD: number; // ms - fallback if WASM operation takes longer
  GRADUAL_ROLLOUT_PERCENTAGE: number; // 0-100 - percentage of operations to use WASM
}

export interface WASMOperationMetrics {
  operationType: string;
  algorithm: string;
  wasmDuration?: number;
  fallbackDuration?: number;
  success: boolean;
  usedWasm: boolean;
  fallbackReason?: string;
  timestamp: number;
}

export interface WASMProviderConfig {
  featureFlags: WASMFeatureFlags;
  wasmProvider: CryptoProvider;
  fallbackProvider: CryptoProvider;
  metricsCallback?: (metrics: WASMOperationMetrics) => void;
}

/**
 * Incremental WASM Provider with intelligent fallback
 * 
 * Features:
 * - Feature-flagged WASM enablement
 * - Automatic fallback on failures or timeouts
 * - Performance monitoring and metrics
 * - A/B testing support via gradual rollout
 * - Zero service disruption guarantee
 */
export class IncrementalWASMProvider extends EventEmitter implements CryptoProvider {
  readonly name: string = 'incremental-wasm';
  readonly version: string = '1.0.0';
  readonly priority: number = 100; // High priority due to performance benefits

  private config: WASMProviderConfig;
  private metrics: WASMOperationMetrics[] = [];
  private wasmFailureCount = 0;
  private lastWasmFailure?: number;
  private initialized = false;

  constructor(config: WASMProviderConfig) {
    super();
    this.config = config;
    
    // Default feature flags for safe rollout
    const defaultFlags: WASMFeatureFlags = {
      ENABLE_WASM_CRYPTO: true,
      ENABLE_WASM_KEM: true,
      ENABLE_WASM_SIGNATURES: true,
      ENABLE_PERFORMANCE_MONITORING: true,
      WASM_FALLBACK_THRESHOLD: 5000, // 5 seconds timeout
      GRADUAL_ROLLOUT_PERCENTAGE: 10 // Start with 10% of operations
    };
    
    this.config.featureFlags = {
      ...defaultFlags,
      ...config.featureFlags
    };
  }

  async isAvailable(): Promise<boolean> {
    // Both providers must be available for safety
    const wasmAvailable = await this.config.wasmProvider.isAvailable();
    const fallbackAvailable = await this.config.fallbackProvider.isAvailable();
    return wasmAvailable && fallbackAvailable;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize both providers in parallel
      await Promise.all([
        this.config.wasmProvider.initialize(),
        this.config.fallbackProvider.initialize()
      ]);

      this.initialized = true;
      this.emit('provider:initialized', { name: this.name });
    } catch (error) {
      this.emit('provider:error', { name: this.name, error });
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (!this.initialized) return;

    try {
      await Promise.all([
        this.config.wasmProvider.destroy(),
        this.config.fallbackProvider.destroy()
      ]);

      this.initialized = false;
      this.emit('provider:destroyed', { name: this.name });
    } catch (error) {
      this.emit('provider:error', { name: this.name, error });
      throw error;
    }
  }

  getCapabilities(): CryptoCapabilities {
    // Combine capabilities from both providers
    const wasmCaps = this.config.wasmProvider.getCapabilities();
    const fallbackCaps = this.config.fallbackProvider.getCapabilities();

    return {
      algorithms: new Map([...wasmCaps.algorithms, ...fallbackCaps.algorithms]),
      features: new Set([
        ...wasmCaps.features,
        ...fallbackCaps.features,
        CryptoFeature.BATCH_OPERATIONS,
        CryptoFeature.PARALLEL_EXECUTION
      ]),
      performance: this.getCombinedPerformance(wasmCaps.performance, fallbackCaps.performance),
      limitations: {
        ...wasmCaps.limitations,
        ...fallbackCaps.limitations,
        platformRestrictions: ['requires-wasm-support']
      }
    };
  }

  supportsAlgorithm(algorithm: AlgorithmIdentifier): boolean {
    return this.config.wasmProvider.supportsAlgorithm(algorithm) ||
           this.config.fallbackProvider.supportsAlgorithm(algorithm);
  }

  async generateKeyPair(algorithm: AlgorithmIdentifier): Promise<KeyPair> {
    return this.executeWithIntelligentFallback(
      'generateKeyPair',
      algorithm,
      async (provider) => provider.generateKeyPair(algorithm)
    );
  }

  async importPublicKey(keyData: Uint8Array, algorithm: AlgorithmIdentifier): Promise<PublicKey> {
    return this.executeWithIntelligentFallback(
      'importPublicKey',
      algorithm,
      async (provider) => provider.importPublicKey(keyData, algorithm)
    );
  }

  async importPrivateKey(keyData: Uint8Array, algorithm: AlgorithmIdentifier): Promise<PrivateKey> {
    return this.executeWithIntelligentFallback(
      'importPrivateKey',
      algorithm,
      async (provider) => provider.importPrivateKey(keyData, algorithm)
    );
  }

  async exportPublicKey(publicKey: PublicKey, algorithm: AlgorithmIdentifier): Promise<Uint8Array> {
    return this.executeWithIntelligentFallback(
      'exportPublicKey',
      algorithm,
      async (provider) => provider.exportPublicKey(publicKey, algorithm)
    );
  }

  async exportPrivateKey(privateKey: PrivateKey, algorithm: AlgorithmIdentifier): Promise<Uint8Array> {
    return this.executeWithIntelligentFallback(
      'exportPrivateKey',
      algorithm,
      async (provider) => provider.exportPrivateKey(privateKey, algorithm)
    );
  }

  async encapsulate(publicKey: PublicKey, algorithm: AlgorithmIdentifier): Promise<EncapsulationResult> {
    if (!this.config.featureFlags.ENABLE_WASM_KEM) {
      return this.config.fallbackProvider.encapsulate!(publicKey, algorithm);
    }

    return this.executeWithIntelligentFallback(
      'encapsulate',
      algorithm,
      async (provider) => provider.encapsulate!(publicKey, algorithm)
    );
  }

  async decapsulate(privateKey: PrivateKey, ciphertext: Uint8Array, algorithm: AlgorithmIdentifier): Promise<Uint8Array> {
    if (!this.config.featureFlags.ENABLE_WASM_KEM) {
      return this.config.fallbackProvider.decapsulate!(privateKey, ciphertext, algorithm);
    }

    return this.executeWithIntelligentFallback(
      'decapsulate',
      algorithm,
      async (provider) => provider.decapsulate!(privateKey, ciphertext, algorithm)
    );
  }

  async sign(data: Uint8Array, privateKey: PrivateKey, algorithm: AlgorithmIdentifier): Promise<Uint8Array> {
    if (!this.config.featureFlags.ENABLE_WASM_SIGNATURES) {
      return this.config.fallbackProvider.sign!(data, privateKey, algorithm);
    }

    return this.executeWithIntelligentFallback(
      'sign',
      algorithm,
      async (provider) => provider.sign!(data, privateKey, algorithm)
    );
  }

  async verify(data: Uint8Array, signature: Uint8Array, publicKey: PublicKey, algorithm: AlgorithmIdentifier): Promise<boolean> {
    if (!this.config.featureFlags.ENABLE_WASM_SIGNATURES) {
      return this.config.fallbackProvider.verify!(data, signature, publicKey, algorithm);
    }

    return this.executeWithIntelligentFallback(
      'verify',
      algorithm,
      async (provider) => provider.verify!(data, signature, publicKey, algorithm)
    );
  }

  async encrypt(data: Uint8Array, key: Uint8Array, algorithm: AlgorithmIdentifier): Promise<EncryptedData> {
    return this.executeWithIntelligentFallback(
      'encrypt',
      algorithm,
      async (provider) => provider.encrypt!(data, key, algorithm)
    );
  }

  async decrypt(encrypted: EncryptedData, key: Uint8Array, algorithm: AlgorithmIdentifier): Promise<Uint8Array> {
    return this.executeWithIntelligentFallback(
      'decrypt',
      algorithm,
      async (provider) => provider.decrypt!(encrypted, key, algorithm)
    );
  }

  getBatchSize(): number {
    return Math.max(
      this.config.wasmProvider.getBatchSize?.() || 1,
      this.config.fallbackProvider.getBatchSize?.() || 1
    );
  }

  supportsBatchOperations(): boolean {
    return this.config.wasmProvider.supportsBatchOperations?.() ||
           this.config.fallbackProvider.supportsBatchOperations?.() ||
           false;
  }

  /**
   * Core intelligent fallback execution logic
   */
  private async executeWithIntelligentFallback<T>(
    operationType: string,
    algorithm: AlgorithmIdentifier,
    operation: (provider: CryptoProvider) => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let usedWasm = false;
    let fallbackReason: string | undefined;

    try {
      // Check if we should attempt WASM
      if (this.shouldUseWasm(operationType)) {
        try {
          usedWasm = true;
          const result = await this.executeWithTimeout(
            operation(this.config.wasmProvider),
            this.config.featureFlags.WASM_FALLBACK_THRESHOLD
          );

          // Record successful WASM operation
          this.recordMetrics({
            operationType,
            algorithm: algorithm.name,
            wasmDuration: performance.now() - startTime,
            success: true,
            usedWasm: true,
            timestamp: Date.now()
          });

          return result;
        } catch (error) {
          // WASM failed, use fallback
          fallbackReason = error instanceof Error ? error.message : 'Unknown WASM error';
          this.wasmFailureCount++;
          this.lastWasmFailure = Date.now();
          this.emit('wasm:fallback', { operationType, algorithm: algorithm.name, error });
        }
      } else {
        fallbackReason = 'Gradual rollout or feature flag disabled';
      }

      // Execute fallback
      const fallbackStartTime = performance.now();
      const result = await operation(this.config.fallbackProvider);

      // Record fallback operation
      this.recordMetrics({
        operationType,
        algorithm: algorithm.name,
        fallbackDuration: performance.now() - fallbackStartTime,
        success: true,
        usedWasm: false,
        fallbackReason,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      // Both providers failed
      this.recordMetrics({
        operationType,
        algorithm: algorithm.name,
        success: false,
        usedWasm,
        fallbackReason: 'Both providers failed',
        timestamp: Date.now()
      });

      this.emit('provider:error', { name: this.name, operationType, error });
      throw error;
    }
  }

  /**
   * Determine if WASM should be used for this operation
   */
  private shouldUseWasm(operationType: string): boolean {
    // Check global WASM flag
    if (!this.config.featureFlags.ENABLE_WASM_CRYPTO) {
      return false;
    }

    // Check if we've had too many recent failures
    if (this.wasmFailureCount > 5 && this.lastWasmFailure && 
        Date.now() - this.lastWasmFailure < 60000) { // 1 minute cooldown
      return false;
    }

    // Gradual rollout - use percentage to determine usage
    const random = Math.random() * 100;
    return random < this.config.featureFlags.GRADUAL_ROLLOUT_PERCENTAGE;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('WASM operation timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: WASMOperationMetrics): void {
    if (!this.config.featureFlags.ENABLE_PERFORMANCE_MONITORING) {
      return;
    }

    this.metrics.push(metrics);

    // Keep only recent metrics (last 1000 operations)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Call external metrics callback if provided
    if (this.config.metricsCallback) {
      this.config.metricsCallback(metrics);
    }

    this.emit('metrics:recorded', metrics);
  }

  /**
   * Get performance metrics summary
   */
  getMetricsSummary(): {
    totalOperations: number;
    wasmSuccessRate: number;
    fallbackRate: number;
    averageWasmDuration: number;
    averageFallbackDuration: number;
    recentFailures: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        wasmSuccessRate: 0,
        fallbackRate: 0,
        averageWasmDuration: 0,
        averageFallbackDuration: 0,
        recentFailures: 0
      };
    }

    const wasmOperations = this.metrics.filter(m => m.usedWasm && m.success);
    const fallbackOperations = this.metrics.filter(m => !m.usedWasm && m.success);
    const recentFailures = this.metrics.filter(m => 
      !m.success && Date.now() - m.timestamp < 300000 // Last 5 minutes
    ).length;

    return {
      totalOperations: this.metrics.length,
      wasmSuccessRate: wasmOperations.length / this.metrics.length,
      fallbackRate: fallbackOperations.length / this.metrics.length,
      averageWasmDuration: this.calculateAverageDuration(wasmOperations, 'wasmDuration'),
      averageFallbackDuration: this.calculateAverageDuration(fallbackOperations, 'fallbackDuration'),
      recentFailures
    };
  }

  /**
   * Update feature flags at runtime
   */
  updateFeatureFlags(newFlags: Partial<WASMFeatureFlags>): void {
    this.config.featureFlags = { ...this.config.featureFlags, ...newFlags };
    this.emit('featureFlags:updated', this.config.featureFlags);
  }

  /**
   * Get current feature flags
   */
  getFeatureFlags(): WASMFeatureFlags {
    return { ...this.config.featureFlags };
  }

  /**
   * Calculate average duration for metrics
   */
  private calculateAverageDuration(operations: WASMOperationMetrics[], field: 'wasmDuration' | 'fallbackDuration'): number {
    if (operations.length === 0) return 0;
    
    const durations = operations
      .map(op => op[field])
      .filter((d): d is number => d !== undefined);
    
    if (durations.length === 0) return 0;
    
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }

  /**
   * Combine performance metrics from multiple providers
   */
  private getCombinedPerformance(
    wasmPerf: ProviderPerformance,
    fallbackPerf: ProviderPerformance
  ): ProviderPerformance {
    return {
      initializationTimeMs: Math.max(wasmPerf.initializationTimeMs, fallbackPerf.initializationTimeMs),
      memoryUsageMB: wasmPerf.memoryUsageMB + fallbackPerf.memoryUsageMB,
      parallelism: Math.max(wasmPerf.parallelism, fallbackPerf.parallelism),
      benchmarks: new Map([
        ...(wasmPerf.benchmarks || []),
        ...(fallbackPerf.benchmarks || [])
      ])
    };
  }
}

/**
 * Factory function to create incremental WASM provider
 */
export async function createIncrementalWASMProvider(
  wasmProvider: CryptoProvider,
  fallbackProvider: CryptoProvider,
  config: Partial<WASMProviderConfig> = {}
): Promise<IncrementalWASMProvider> {
  const defaultFlags: WASMFeatureFlags = {
    ENABLE_WASM_CRYPTO: true,
    ENABLE_WASM_KEM: true,
    ENABLE_WASM_SIGNATURES: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    WASM_FALLBACK_THRESHOLD: 5000,
    GRADUAL_ROLLOUT_PERCENTAGE: 10
  };
  
  const provider = new IncrementalWASMProvider({
    wasmProvider,
    fallbackProvider,
    featureFlags: {
      ...defaultFlags,
      ...config.featureFlags
    },
    metricsCallback: config.metricsCallback
  });

  await provider.initialize();
  return provider;
}