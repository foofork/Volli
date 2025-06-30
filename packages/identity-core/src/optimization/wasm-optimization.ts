/**
 * WASM Memory Management and Operation Batching Optimization
 * Phase 2B optimization for improved WASM performance
 */

import { EventEmitter } from 'eventemitter3';
import { CryptoProvider } from '../interfaces/crypto-provider';
import { AlgorithmIdentifier } from '../interfaces/algorithm-types';
import { KeyPair, PublicKey, PrivateKey, EncapsulationResult } from '../crypto-types';

export interface WASMMemoryConfig {
  initialMemoryMB: number;
  maxMemoryMB: number;
  growthThresholdMB: number;
  shrinkThresholdMB: number;
  cleanupIntervalMs: number;
  enableMemoryProfiling: boolean;
  preallocationStrategy: 'aggressive' | 'conservative' | 'adaptive';
}

export interface BatchingConfig {
  maxBatchSize: number;
  batchTimeoutMs: number;
  enableAutoBatching: boolean;
  batchingStrategies: {
    keyGeneration: boolean;
    encapsulation: boolean;
    signatures: boolean;
  };
  priorityLevels: ('high' | 'medium' | 'low')[];
}

export interface MemoryMetrics {
  heapUsedMB: number;
  heapTotalMB: number;
  heapFreeMB: number;
  wasmMemoryMB: number;
  allocationCount: number;
  deallocationCount: number;
  gcTriggerCount: number;
  lastGcTime?: number;
}

export interface BatchOperation {
  id: string;
  type: 'keyGeneration' | 'encapsulation' | 'signature' | 'verification';
  algorithm: AlgorithmIdentifier;
  priority: 'high' | 'medium' | 'low';
  data: any;
  timestamp: number;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export interface OptimizationMetrics {
  memory: MemoryMetrics;
  batching: {
    totalBatches: number;
    averageBatchSize: number;
    batchEfficiency: number; // operations per second improvement
    timeoutCount: number;
  };
  performance: {
    averageLatency: number;
    throughput: number; // operations per second
    memoryEfficiency: number; // operations per MB
    energyEfficiency: number; // estimated battery impact
  };
}

/**
 * WASM Memory Pool for efficient memory management
 */
class WASMMemoryPool {
  private allocatedBlocks = new Map<number, Uint8Array>();
  private freeBlocks: Uint8Array[] = [];
  private totalAllocated = 0;
  private allocationCount = 0;
  private deallocationCount = 0;

  constructor(private config: WASMMemoryConfig) {}

  allocate(size: number): Uint8Array {
    // Try to reuse existing block
    const reusableBlock = this.freeBlocks.find(block => block.length >= size);
    if (reusableBlock) {
      this.freeBlocks.splice(this.freeBlocks.indexOf(reusableBlock), 1);
      return reusableBlock.subarray(0, size);
    }

    // Allocate new block
    const block = new Uint8Array(size);
    const blockId = this.allocationCount++;
    this.allocatedBlocks.set(blockId, block);
    this.totalAllocated += size;

    return block;
  }

  deallocate(block: Uint8Array): void {
    // Mark block as free for reuse
    this.freeBlocks.push(block);
    this.deallocationCount++;
  }

  getMetrics(): Partial<MemoryMetrics> {
    return {
      allocationCount: this.allocationCount,
      deallocationCount: this.deallocationCount,
      heapUsedMB: this.totalAllocated / (1024 * 1024)
    };
  }

  cleanup(): void {
    // Clear free blocks to reclaim memory
    this.freeBlocks = [];
    
    // Trigger garbage collection hint
    if (typeof globalThis.gc === 'function') {
      globalThis.gc();
    }
  }
}

/**
 * Operation Batcher for efficient WASM calls
 */
class OperationBatcher extends EventEmitter {
  private batches = new Map<string, BatchOperation[]>();
  private timeouts = new Map<string, number>();
  private batchCount = 0;

  constructor(
    private config: BatchingConfig,
    private wasmProvider: CryptoProvider
  ) {
    super();
  }

  /**
   * Add operation to batch queue
   */
  addToBatch<T>(
    type: BatchOperation['type'],
    algorithm: AlgorithmIdentifier,
    data: any,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const operation: BatchOperation = {
        id: this.generateOperationId(),
        type,
        algorithm,
        priority,
        data,
        timestamp: Date.now(),
        resolve,
        reject
      };

      const batchKey = this.getBatchKey(type, algorithm);
      
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }

      const batch = this.batches.get(batchKey)!;
      batch.push(operation);

      // Sort by priority
      batch.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

      // Check if we should execute the batch
      if (this.shouldExecuteBatch(batch)) {
        this.executeBatch(batchKey, batch);
      } else {
        this.scheduleTimeout(batchKey);
      }
    });
  }

  /**
   * Execute a batch of operations
   */
  private async executeBatch(batchKey: string, operations: BatchOperation[]): Promise<void> {
    this.clearTimeout(batchKey);
    this.batches.delete(batchKey);
    this.batchCount++;

    const startTime = performance.now();
    
    try {
      const results = await this.executeOperationsBatch(operations);
      
      // Resolve all operations with their results
      operations.forEach((op, index) => {
        op.resolve(results[index]);
      });

      this.emit('batch:completed', {
        batchKey,
        operationCount: operations.length,
        duration: performance.now() - startTime
      });

    } catch (error) {
      // Reject all operations with the error
      operations.forEach(op => {
        op.reject(error as Error);
      });

      this.emit('batch:failed', {
        batchKey,
        operationCount: operations.length,
        error
      });
    }
  }

  /**
   * Execute operations as a batch in WASM
   */
  private async executeOperationsBatch(operations: BatchOperation[]): Promise<any[]> {
    if (operations.length === 0) return [];

    const type = operations[0].type;
    const algorithm = operations[0].algorithm;

    switch (type) {
      case 'keyGeneration':
        return this.batchKeyGeneration(operations, algorithm);
      
      case 'encapsulation':
        return this.batchEncapsulation(operations, algorithm);
      
      case 'signature':
        return this.batchSignature(operations, algorithm);
      
      case 'verification':
        return this.batchVerification(operations, algorithm);
      
      default:
        throw new Error(`Unsupported batch operation type: ${type}`);
    }
  }

  /**
   * Batch key generation operations
   */
  private async batchKeyGeneration(
    operations: BatchOperation[],
    algorithm: AlgorithmIdentifier
  ): Promise<KeyPair[]> {
    const count = operations.length;
    
    // Use batch API if available, otherwise fallback to individual operations
    if (this.wasmProvider.supportsBatchOperations?.()) {
      // Hypothetical batch API - would need WASM implementation
      return this.generateKeyPairsBatch(count, algorithm);
    }

    // Fallback: execute in parallel
    const keyGenPromises = operations.map(() => 
      this.wasmProvider.generateKeyPair(algorithm)
    );
    
    return Promise.all(keyGenPromises);
  }

  /**
   * Batch encapsulation operations
   */
  private async batchEncapsulation(
    operations: BatchOperation[],
    algorithm: AlgorithmIdentifier
  ): Promise<EncapsulationResult[]> {
    const publicKeys = operations.map(op => op.data.publicKey);
    
    if (this.wasmProvider.supportsBatchOperations?.()) {
      return this.encapsulateBatch(publicKeys, algorithm);
    }

    // Fallback: parallel execution
    const encapPromises = publicKeys.map(pk => 
      this.wasmProvider.encapsulate!(pk, algorithm)
    );
    
    return Promise.all(encapPromises);
  }

  /**
   * Batch signature operations
   */
  private async batchSignature(
    operations: BatchOperation[],
    algorithm: AlgorithmIdentifier
  ): Promise<Uint8Array[]> {
    const signData = operations.map(op => ({
      data: op.data.data,
      privateKey: op.data.privateKey
    }));

    if (this.wasmProvider.supportsBatchOperations?.()) {
      return this.signBatch(signData, algorithm);
    }

    // Fallback: parallel execution
    const signPromises = signData.map(({ data, privateKey }) => 
      this.wasmProvider.sign!(data, privateKey, algorithm)
    );
    
    return Promise.all(signPromises);
  }

  /**
   * Batch verification operations
   */
  private async batchVerification(
    operations: BatchOperation[],
    algorithm: AlgorithmIdentifier
  ): Promise<boolean[]> {
    const verifyData = operations.map(op => ({
      data: op.data.data,
      signature: op.data.signature,
      publicKey: op.data.publicKey
    }));

    if (this.wasmProvider.supportsBatchOperations?.()) {
      return this.verifyBatch(verifyData, algorithm);
    }

    // Fallback: parallel execution
    const verifyPromises = verifyData.map(({ data, signature, publicKey }) => 
      this.wasmProvider.verify!(data, signature, publicKey, algorithm)
    );
    
    return Promise.all(verifyPromises);
  }

  /**
   * Hypothetical batch API methods (would need WASM implementation)
   */
  private async generateKeyPairsBatch(count: number, algorithm: AlgorithmIdentifier): Promise<KeyPair[]> {
    // This would be implemented in WASM for true batching efficiency
    const keyPairs: KeyPair[] = [];
    for (let i = 0; i < count; i++) {
      keyPairs.push(await this.wasmProvider.generateKeyPair(algorithm));
    }
    return keyPairs;
  }

  private async encapsulateBatch(publicKeys: PublicKey[], algorithm: AlgorithmIdentifier): Promise<EncapsulationResult[]> {
    // Batch encapsulation in WASM
    const results: EncapsulationResult[] = [];
    for (const pk of publicKeys) {
      results.push(await this.wasmProvider.encapsulate!(pk, algorithm));
    }
    return results;
  }

  private async signBatch(
    signData: { data: Uint8Array; privateKey: PrivateKey }[], 
    algorithm: AlgorithmIdentifier
  ): Promise<Uint8Array[]> {
    // Batch signing in WASM
    const signatures: Uint8Array[] = [];
    for (const { data, privateKey } of signData) {
      signatures.push(await this.wasmProvider.sign!(data, privateKey, algorithm));
    }
    return signatures;
  }

  private async verifyBatch(
    verifyData: { data: Uint8Array; signature: Uint8Array; publicKey: PublicKey }[],
    algorithm: AlgorithmIdentifier
  ): Promise<boolean[]> {
    // Batch verification in WASM
    const results: boolean[] = [];
    for (const { data, signature, publicKey } of verifyData) {
      results.push(await this.wasmProvider.verify!(data, signature, publicKey, algorithm));
    }
    return results;
  }

  /**
   * Check if batch should be executed
   */
  private shouldExecuteBatch(batch: BatchOperation[]): boolean {
    if (batch.length >= this.config.maxBatchSize) {
      return true;
    }

    // Execute high priority operations immediately
    const highPriorityCount = batch.filter(op => op.priority === 'high').length;
    if (highPriorityCount > 0 && batch.length >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Schedule timeout for batch execution
   */
  private scheduleTimeout(batchKey: string): void {
    if (this.timeouts.has(batchKey)) {
      return; // Timeout already scheduled
    }

    const timeoutId = window.setTimeout(() => {
      const batch = this.batches.get(batchKey);
      if (batch && batch.length > 0) {
        this.executeBatch(batchKey, batch);
      }
    }, this.config.batchTimeoutMs);

    this.timeouts.set(batchKey, timeoutId);
  }

  /**
   * Clear timeout for batch
   */
  private clearTimeout(batchKey: string): void {
    const timeoutId = this.timeouts.get(batchKey);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      this.timeouts.delete(batchKey);
    }
  }

  /**
   * Get batch key for grouping operations
   */
  private getBatchKey(type: BatchOperation['type'], algorithm: AlgorithmIdentifier): string {
    return `${type}_${algorithm.name}_${algorithm.version}`;
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `batch_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get batching metrics
   */
  getMetrics(): { totalBatches: number; timeoutCount: number } {
    return {
      totalBatches: this.batchCount,
      timeoutCount: Array.from(this.timeouts.values()).length
    };
  }

  /**
   * Destroy batcher
   */
  destroy(): void {
    // Clear all timeouts
    for (const timeoutId of this.timeouts.values()) {
      window.clearTimeout(timeoutId);
    }
    
    // Reject all pending operations
    for (const batch of this.batches.values()) {
      for (const operation of batch) {
        operation.reject(new Error('Batcher destroyed'));
      }
    }

    this.batches.clear();
    this.timeouts.clear();
    this.removeAllListeners();
  }
}

/**
 * WASM Optimization Manager
 * 
 * Features:
 * - Memory pool management
 * - Operation batching
 * - Performance monitoring
 * - Adaptive optimization
 */
export class WASMOptimizationManager extends EventEmitter {
  private memoryPool: WASMMemoryPool;
  private batcher: OperationBatcher;
  private metrics: OptimizationMetrics;
  private monitoringInterval?: number;
  private cleanupInterval?: number;
  private initialized = false;
  private memoryConfig: WASMMemoryConfig;
  private batchingConfig: BatchingConfig;

  constructor(
    private wasmProvider: CryptoProvider,
    memoryConfig: Partial<WASMMemoryConfig> = {},
    batchingConfig: Partial<BatchingConfig> = {}
  ) {
    super();

    this.memoryConfig = {
      initialMemoryMB: 16,
      maxMemoryMB: 128,
      growthThresholdMB: 12,
      shrinkThresholdMB: 4,
      cleanupIntervalMs: 30000,
      enableMemoryProfiling: true,
      preallocationStrategy: 'adaptive',
      ...memoryConfig
    };

    this.batchingConfig = {
      maxBatchSize: 10,
      batchTimeoutMs: 100,
      enableAutoBatching: true,
      batchingStrategies: {
        keyGeneration: true,
        encapsulation: true,
        signatures: true
      },
      priorityLevels: ['high', 'medium', 'low'],
      ...batchingConfig
    };

    this.memoryPool = new WASMMemoryPool(this.memoryConfig);
    this.batcher = new OperationBatcher(this.batchingConfig, wasmProvider);

    this.metrics = {
      memory: {
        heapUsedMB: 0,
        heapTotalMB: 0,
        heapFreeMB: 0,
        wasmMemoryMB: 0,
        allocationCount: 0,
        deallocationCount: 0,
        gcTriggerCount: 0
      },
      batching: {
        totalBatches: 0,
        averageBatchSize: 0,
        batchEfficiency: 0,
        timeoutCount: 0
      },
      performance: {
        averageLatency: 0,
        throughput: 0,
        memoryEfficiency: 0,
        energyEfficiency: 0
      }
    };
  }

  /**
   * Initialize optimization manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Start monitoring
      this.startMonitoring();
      this.startCleanupTasks();

      // Setup event listeners
      this.setupEventListeners();

      this.initialized = true;
      this.emit('optimization:initialized');

    } catch (error) {
      this.emit('optimization:error', { error, phase: 'initialization' });
      throw error;
    }
  }

  /**
   * Optimized key pair generation with batching
   */
  async generateKeyPair(
    algorithm: AlgorithmIdentifier,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<KeyPair> {
    if (this.batchingConfig.enableAutoBatching && 
        this.batchingConfig.batchingStrategies.keyGeneration) {
      return this.batcher.addToBatch('keyGeneration', algorithm, {}, priority);
    }

    return this.wasmProvider.generateKeyPair(algorithm);
  }

  /**
   * Optimized encapsulation with batching
   */
  async encapsulate(
    publicKey: PublicKey,
    algorithm: AlgorithmIdentifier,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<EncapsulationResult> {
    if (this.batchingConfig.enableAutoBatching && 
        this.batchingConfig.batchingStrategies.encapsulation) {
      return this.batcher.addToBatch('encapsulation', algorithm, { publicKey }, priority);
    }

    return this.wasmProvider.encapsulate!(publicKey, algorithm);
  }

  /**
   * Get current optimization metrics
   */
  getMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Update optimization configuration
   */
  updateConfig(
    memoryConfig?: Partial<WASMMemoryConfig>,
    batchingConfig?: Partial<BatchingConfig>
  ): void {
    if (memoryConfig) {
      this.memoryConfig = { ...this.memoryConfig, ...memoryConfig };
    }
    
    if (batchingConfig) {
      this.batchingConfig = { ...this.batchingConfig, ...batchingConfig };
    }

    this.emit('config:updated', { memoryConfig, batchingConfig });
  }

  /**
   * Force garbage collection
   */
  forceGarbageCollection(): void {
    this.memoryPool.cleanup();
    this.metrics.memory.gcTriggerCount++;
    this.metrics.memory.lastGcTime = Date.now();
    
    this.emit('gc:triggered', { timestamp: Date.now() });
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics();
    }, 5000); // Every 5 seconds
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.performCleanup();
    }, this.memoryConfig.cleanupIntervalMs!);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    // Update memory metrics
    const memoryPoolMetrics = this.memoryPool.getMetrics();
    Object.assign(this.metrics.memory, memoryPoolMetrics);

    // Update browser memory if available
    const browserMemory = (performance as any).memory;
    if (browserMemory) {
      this.metrics.memory.heapUsedMB = browserMemory.usedJSHeapSize / (1024 * 1024);
      this.metrics.memory.heapTotalMB = browserMemory.totalJSHeapSize / (1024 * 1024);
      this.metrics.memory.heapFreeMB = this.metrics.memory.heapTotalMB - this.metrics.memory.heapUsedMB;
    }

    // Update batching metrics
    const batchingMetrics = this.batcher.getMetrics();
    this.metrics.batching.totalBatches = batchingMetrics.totalBatches;
    this.metrics.batching.timeoutCount = batchingMetrics.timeoutCount;

    // Calculate efficiency metrics
    this.calculateEfficiencyMetrics();

    this.emit('metrics:updated', this.metrics);
  }

  /**
   * Calculate efficiency metrics
   */
  private calculateEfficiencyMetrics(): void {
    const memoryUsed = this.metrics.memory.heapUsedMB;
    const totalOps = this.metrics.batching.totalBatches;

    if (totalOps > 0 && memoryUsed > 0) {
      this.metrics.performance.memoryEfficiency = totalOps / memoryUsed;
    }

    // Estimate energy efficiency (hypothetical calculation)
    this.metrics.performance.energyEfficiency = this.metrics.performance.memoryEfficiency * 0.8;
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup(): void {
    const memoryUsed = this.metrics.memory.heapUsedMB;
    const shrinkThreshold = this.memoryConfig.shrinkThresholdMB!;

    if (memoryUsed < shrinkThreshold) {
      this.forceGarbageCollection();
    }

    this.emit('cleanup:performed', { memoryUsed, timestamp: Date.now() });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.batcher.on('batch:completed', (event) => {
      this.metrics.batching.averageBatchSize = 
        (this.metrics.batching.averageBatchSize * (this.metrics.batching.totalBatches - 1) + event.operationCount) /
        this.metrics.batching.totalBatches;

      this.emit('batch:optimized', event);
    });

    this.batcher.on('batch:failed', (event) => {
      this.emit('batch:failed', event);
    });
  }

  /**
   * Destroy optimization manager
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.batcher.destroy();
    this.memoryPool.cleanup();
    this.removeAllListeners();
    
    this.initialized = false;
  }
}