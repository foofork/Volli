/**
 * High-level crypto facade with hot-swappable algorithms and performance optimization
 */

import { EventEmitter } from 'eventemitter3';
import { KeyPair, PublicKey, PrivateKey, EncapsulationResult } from '../crypto-types';
import { AlgorithmIdentifier, AlgorithmType } from '../interfaces/algorithm-types';
import { CryptoProvider, ProviderRegistry } from '../interfaces/crypto-provider';
import { AlgorithmRegistry } from '../providers/algorithm-registry';
import { CryptoWorkerPool } from '../workers/crypto-worker-pool';

interface CryptoFacadeConfig {
  enableWorkerPool?: boolean;
  workerPoolSize?: number;
  cacheResults?: boolean;
  circuitBreaker?: CircuitBreakerConfig;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  enabled: boolean;
}

interface OperationMetrics {
  operationType: string;
  algorithm: string;
  duration: number;
  success: boolean;
  workerId?: number;
}

export class CryptoFacade extends EventEmitter {
  private algorithmRegistry: AlgorithmRegistry;
  private providerRegistry?: ProviderRegistry;
  private workerPool?: CryptoWorkerPool;
  private resultCache = new Map<string, any>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private metrics: OperationMetrics[] = [];
  private config: CryptoFacadeConfig;
  
  constructor(config: CryptoFacadeConfig = {}) {
    super();
    
    this.config = {
      enableWorkerPool: true,
      workerPoolSize: navigator.hardwareConcurrency || 4,
      cacheResults: false,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000,
        enabled: true
      },
      ...config
    };
    
    this.algorithmRegistry = new AlgorithmRegistry();
    this.initializeCircuitBreakers();
    
    if (this.config.enableWorkerPool) {
      this.initializeWorkerPool();
    }
  }
  
  /**
   * Initialize the crypto facade with default providers
   */
  async initialize(providerRegistry: ProviderRegistry): Promise<void> {
    this.providerRegistry = providerRegistry;
    
    // Register algorithm events
    this.algorithmRegistry.on('algorithm:registered', (metadata) => {
      this.emit('algorithm:registered', metadata);
    });
    
    this.algorithmRegistry.on('algorithm:swapped', (event) => {
      this.emit('algorithm:swapped', event);
    });
    
    this.emit('facade:initialized');
  }
  
  /**
   * Generate a key pair using the best available algorithm
   */
  async generateKeyPair(type: AlgorithmType = AlgorithmType.KEM): Promise<KeyPair> {
    const algorithm = this.getBestAlgorithm(type);
    return this.executeWithFallback(
      'generateKeyPair',
      algorithm,
      async (provider) => {
        if (this.workerPool) {
          return this.workerPool.generateKeyPair(algorithm.metadata.id);
        }
        return provider.generateKeyPair(algorithm.metadata.id);
      }
    );
  }
  
  /**
   * Generate multiple key pairs in parallel
   */
  async generateKeyPairs(
    count: number, 
    type: AlgorithmType = AlgorithmType.KEM
  ): Promise<KeyPair[]> {
    if (!this.workerPool) {
      // Fall back to sequential generation
      const promises: Promise<KeyPair>[] = [];
      for (let i = 0; i < count; i++) {
        promises.push(this.generateKeyPair(type));
      }
      return Promise.all(promises);
    }
    
    const algorithm = this.getBestAlgorithm(type);
    return this.workerPool.batchGenerateKeyPairs(algorithm.metadata.id, count);
  }
  
  /**
   * Perform key encapsulation
   */
  async encapsulate(
    publicKey: PublicKey,
    algorithmHint?: AlgorithmIdentifier
  ): Promise<EncapsulationResult> {
    const algorithm = algorithmHint 
      ? this.getAlgorithm(algorithmHint)
      : this.getBestAlgorithm(AlgorithmType.KEM);
    
    const cacheKey = this.getCacheKey('encapsulate', publicKey.kyber, algorithm.metadata.id);
    
    if (this.config.cacheResults && this.resultCache.has(cacheKey)) {
      return this.resultCache.get(cacheKey);
    }
    
    const result = await this.executeWithFallback(
      'encapsulate',
      algorithm,
      async (provider) => {
        if (this.workerPool) {
          return this.workerPool.encapsulate(publicKey.kyber, algorithm.metadata.id);
        }
        return provider.encapsulate!(publicKey, algorithm.metadata.id);
      }
    );
    
    if (this.config.cacheResults) {
      this.resultCache.set(cacheKey, result);
    }
    
    return result;
  }
  
  /**
   * Batch encapsulation for multiple public keys
   */
  async batchEncapsulate(
    publicKeys: PublicKey[],
    algorithmHint?: AlgorithmIdentifier
  ): Promise<EncapsulationResult[]> {
    if (!this.workerPool) {
      return Promise.all(publicKeys.map(pk => this.encapsulate(pk, algorithmHint)));
    }
    
    const algorithm = algorithmHint 
      ? this.getAlgorithm(algorithmHint)
      : this.getBestAlgorithm(AlgorithmType.KEM);
    
    const kyberKeys = publicKeys.map(pk => pk.kyber);
    return this.workerPool.batchEncapsulate(kyberKeys, algorithm.metadata.id);
  }
  
  /**
   * Perform key decapsulation
   */
  async decapsulate(
    privateKey: PrivateKey,
    ciphertext: Uint8Array,
    algorithmHint?: AlgorithmIdentifier
  ): Promise<Uint8Array> {
    const algorithm = algorithmHint 
      ? this.getAlgorithm(algorithmHint)
      : this.getBestAlgorithm(AlgorithmType.KEM);
    
    return this.executeWithFallback(
      'decapsulate',
      algorithm,
      async (provider) => {
        return provider.decapsulate!(privateKey, ciphertext, algorithm.metadata.id);
      }
    );
  }
  
  /**
   * Sign data
   */
  async sign(
    data: Uint8Array,
    privateKey: PrivateKey,
    algorithmHint?: AlgorithmIdentifier
  ): Promise<Uint8Array> {
    const algorithm = algorithmHint 
      ? this.getAlgorithm(algorithmHint)
      : this.getBestAlgorithm(AlgorithmType.SIGNATURE);
    
    return this.executeWithFallback(
      'sign',
      algorithm,
      async (provider) => {
        return provider.sign!(data, privateKey, algorithm.metadata.id);
      }
    );
  }
  
  /**
   * Verify signature
   */
  async verify(
    data: Uint8Array,
    signature: Uint8Array,
    publicKey: PublicKey,
    algorithmHint?: AlgorithmIdentifier
  ): Promise<boolean> {
    const algorithm = algorithmHint 
      ? this.getAlgorithm(algorithmHint)
      : this.getBestAlgorithm(AlgorithmType.SIGNATURE);
    
    return this.executeWithFallback(
      'verify',
      algorithm,
      async (provider) => {
        return provider.verify!(data, signature, publicKey, algorithm.metadata.id);
      }
    );
  }
  
  /**
   * Hot-swap an algorithm implementation
   */
  async hotSwapAlgorithm(
    algorithm: AlgorithmIdentifier,
    newProvider: CryptoProvider
  ): Promise<void> {
    await this.algorithmRegistry.hotSwap(algorithm, newProvider);
    
    // Clear related cache entries
    if (this.config.cacheResults) {
      this.clearCacheForAlgorithm(algorithm);
    }
    
    // Reset circuit breaker for this algorithm
    const cbKey = this.getCircuitBreakerKey('*', algorithm);
    this.circuitBreakers.delete(cbKey);
  }
  
  /**
   * Get algorithm performance metrics
   */
  getMetrics(): {
    operations: OperationMetrics[];
    workerPool?: any;
    algorithms: Map<string, number>;
  } {
    return {
      operations: [...this.metrics],
      workerPool: this.workerPool?.getMetrics(),
      algorithms: this.algorithmRegistry.getUsageStats()
    };
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.resultCache.clear();
    this.metrics = [];
    this.emit('cache:cleared');
  }
  
  /**
   * Destroy the facade and cleanup resources
   */
  destroy(): void {
    this.workerPool?.destroy();
    this.clearCache();
    this.removeAllListeners();
  }
  
  private initializeWorkerPool(): void {
    if (typeof Worker !== 'undefined') {
      // In a real implementation, this would point to the crypto worker file
      const workerPath = '/workers/crypto-worker.js';
      this.workerPool = new CryptoWorkerPool(
        workerPath,
        this.config.workerPoolSize
      );
    }
  }
  
  private initializeCircuitBreakers(): void {
    // Circuit breakers will be created on-demand
  }
  
  private async executeWithFallback<T>(
    operation: string,
    algorithm: any,
    executor: (provider: CryptoProvider) => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const cbKey = this.getCircuitBreakerKey(operation, algorithm.metadata.id);
    
    // Check circuit breaker
    if (this.config.circuitBreaker?.enabled) {
      const cb = this.getOrCreateCircuitBreaker(cbKey);
      if (cb.isOpen()) {
        throw new Error(`Circuit breaker open for ${operation}`);
      }
    }
    
    try {
      const result = await executor(algorithm.provider);
      
      // Record success
      this.recordMetrics(operation, algorithm.metadata.id, startTime, true);
      
      if (this.config.circuitBreaker?.enabled) {
        this.getOrCreateCircuitBreaker(cbKey).recordSuccess();
      }
      
      return result;
    } catch (error) {
      // Record failure
      this.recordMetrics(operation, algorithm.metadata.id, startTime, false);
      
      if (this.config.circuitBreaker?.enabled) {
        this.getOrCreateCircuitBreaker(cbKey).recordFailure();
      }
      
      throw error;
    }
  }
  
  private getBestAlgorithm(type: AlgorithmType): any {
    if (!this.providerRegistry) {
      throw new Error('Provider registry not initialized');
    }
    const algorithm = this.algorithmRegistry.getBestAlgorithm(type);
    if (!algorithm) {
      throw new Error(`No algorithm available for type: ${type}`);
    }
    return algorithm;
  }
  
  private getAlgorithm(id: AlgorithmIdentifier): any {
    const algorithm = this.algorithmRegistry.getAlgorithm(id);
    if (!algorithm) {
      throw new Error(`Algorithm not found: ${id.name}@${id.version}`);
    }
    return algorithm;
  }
  
  private getOrCreateCircuitBreaker(key: string): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker(
        this.config.circuitBreaker!.failureThreshold,
        this.config.circuitBreaker!.resetTimeout
      ));
    }
    return this.circuitBreakers.get(key)!;
  }
  
  private getCircuitBreakerKey(operation: string, algorithm: AlgorithmIdentifier): string {
    return `${operation}:${algorithm.name}`;
  }
  
  private getCacheKey(operation: string, data: Uint8Array, algorithm: AlgorithmIdentifier): string {
    // Simple hash of the data for cache key
    const hash = Array.from(data.slice(0, 32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${operation}:${algorithm.name}:${hash}`;
  }
  
  private clearCacheForAlgorithm(algorithm: AlgorithmIdentifier): void {
    const prefix = `:${algorithm.name}:`;
    for (const key of this.resultCache.keys()) {
      if (key.includes(prefix)) {
        this.resultCache.delete(key);
      }
    }
  }
  
  private recordMetrics(
    operation: string,
    algorithm: AlgorithmIdentifier,
    startTime: number,
    success: boolean
  ): void {
    const metric: OperationMetrics = {
      operationType: operation,
      algorithm: algorithm.name,
      duration: performance.now() - startTime,
      success
    };
    
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    this.emit('metrics:recorded', metric);
  }
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number,
    private resetTimeout: number
  ) {}
  
  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }
  
  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}