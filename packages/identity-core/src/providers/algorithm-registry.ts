/**
 * Algorithm Registry for hot-swappable crypto algorithms
 */

import { 
  AlgorithmIdentifier, 
  AlgorithmType, 
  AlgorithmMetadata,
  AlgorithmMigration,
  AlgorithmVersion
} from '../interfaces/algorithm-types';
import { CryptoProvider } from '../interfaces/crypto-provider';
import { EventEmitter } from 'eventemitter3';

export interface RegisteredAlgorithm {
  metadata: AlgorithmMetadata;
  provider: CryptoProvider;
  enabled: boolean;
  usage: number; // Track usage for analytics
}

export class AlgorithmRegistry extends EventEmitter {
  private algorithms = new Map<string, RegisteredAlgorithm>();
  private migrations = new Map<string, AlgorithmMigration>();
  private defaultAlgorithms = new Map<AlgorithmType, AlgorithmIdentifier>();
  
  constructor() {
    super();
    this.initializeDefaults();
  }
  
  private initializeDefaults(): void {
    // Set quantum-safe defaults
    this.defaultAlgorithms.set(AlgorithmType.KEM, {
      name: 'ML-KEM-768',
      version: { major: 1, minor: 0, patch: 0 },
      type: AlgorithmType.KEM
    });
    
    this.defaultAlgorithms.set(AlgorithmType.SIGNATURE, {
      name: 'ML-DSA-65',
      version: { major: 1, minor: 0, patch: 0 },
      type: AlgorithmType.SIGNATURE
    });
  }
  
  /**
   * Register a new algorithm with its provider
   */
  async register(
    metadata: AlgorithmMetadata, 
    provider: CryptoProvider
  ): Promise<void> {
    const key = this.getAlgorithmKey(metadata.id);
    
    // Check if provider supports this algorithm
    if (!provider.supportsAlgorithm(metadata.id)) {
      throw new Error(`Provider ${provider.name} does not support algorithm ${key}`);
    }
    
    // Initialize provider if needed
    if (!await provider.isAvailable()) {
      await provider.initialize();
    }
    
    const registered: RegisteredAlgorithm = {
      metadata,
      provider,
      enabled: true,
      usage: 0
    };
    
    this.algorithms.set(key, registered);
    this.emit('algorithm:registered', metadata);
  }
  
  /**
   * Unregister an algorithm
   */
  unregister(id: AlgorithmIdentifier): void {
    const key = this.getAlgorithmKey(id);
    const algorithm = this.algorithms.get(key);
    
    if (algorithm) {
      this.algorithms.delete(key);
      this.emit('algorithm:unregistered', id);
    }
  }
  
  /**
   * Get algorithm with automatic fallback
   */
  getAlgorithm(id: AlgorithmIdentifier): RegisteredAlgorithm | undefined {
    const key = this.getAlgorithmKey(id);
    let algorithm = this.algorithms.get(key);
    
    // Try to find compatible version if exact match not found
    if (!algorithm) {
      algorithm = this.findCompatibleVersion(id);
    }
    
    // Increment usage counter
    if (algorithm) {
      algorithm.usage++;
    }
    
    return algorithm;
  }
  
  /**
   * Get the best available algorithm for a type
   */
  getBestAlgorithm(type: AlgorithmType): RegisteredAlgorithm | undefined {
    // First try default
    const defaultId = this.defaultAlgorithms.get(type);
    if (defaultId) {
      const algorithm = this.getAlgorithm(defaultId);
      if (algorithm?.enabled) return algorithm;
    }
    
    // Find best alternative based on security level and performance
    let best: RegisteredAlgorithm | undefined;
    let bestScore = 0;
    
    for (const [_, algorithm] of this.algorithms) {
      if (algorithm.metadata.id.type === type && algorithm.enabled) {
        const score = this.calculateAlgorithmScore(algorithm);
        if (score > bestScore) {
          best = algorithm;
          bestScore = score;
        }
      }
    }
    
    return best;
  }
  
  /**
   * Register a migration path between algorithms
   */
  registerMigration(migration: AlgorithmMigration): void {
    const key = `${this.getAlgorithmKey(migration.from)}->${this.getAlgorithmKey(migration.to)}`;
    this.migrations.set(key, migration);
    this.emit('migration:registered', migration);
  }
  
  /**
   * Get migration path between algorithms
   */
  getMigration(from: AlgorithmIdentifier, to: AlgorithmIdentifier): AlgorithmMigration | undefined {
    const key = `${this.getAlgorithmKey(from)}->${this.getAlgorithmKey(to)}`;
    return this.migrations.get(key);
  }
  
  /**
   * Enable or disable an algorithm
   */
  setEnabled(id: AlgorithmIdentifier, enabled: boolean): void {
    const algorithm = this.getAlgorithm(id);
    if (algorithm) {
      algorithm.enabled = enabled;
      this.emit('algorithm:status', { id, enabled });
    }
  }
  
  /**
   * Get usage statistics
   */
  getUsageStats(): Map<string, number> {
    const stats = new Map<string, number>();
    for (const [key, algorithm] of this.algorithms) {
      stats.set(key, algorithm.usage);
    }
    return stats;
  }
  
  /**
   * Hot-swap an algorithm implementation
   */
  async hotSwap(
    id: AlgorithmIdentifier, 
    newProvider: CryptoProvider
  ): Promise<void> {
    const key = this.getAlgorithmKey(id);
    const existing = this.algorithms.get(key);
    
    if (!existing) {
      throw new Error(`Algorithm ${key} not found`);
    }
    
    // Initialize new provider
    if (!await newProvider.isAvailable()) {
      await newProvider.initialize();
    }
    
    // Verify new provider supports the algorithm
    if (!newProvider.supportsAlgorithm(id)) {
      throw new Error(`New provider does not support algorithm ${key}`);
    }
    
    // Swap providers
    const oldProvider = existing.provider;
    existing.provider = newProvider;
    
    // Cleanup old provider if no longer used
    const stillUsed = Array.from(this.algorithms.values())
      .some(alg => alg.provider === oldProvider);
    
    if (!stillUsed) {
      await oldProvider.destroy();
    }
    
    this.emit('algorithm:swapped', { id, oldProvider, newProvider });
  }
  
  /**
   * List all registered algorithms
   */
  listAlgorithms(type?: AlgorithmType): AlgorithmMetadata[] {
    const algorithms: AlgorithmMetadata[] = [];
    
    for (const algorithm of this.algorithms.values()) {
      if (!type || algorithm.metadata.id.type === type) {
        algorithms.push(algorithm.metadata);
      }
    }
    
    return algorithms;
  }
  
  private getAlgorithmKey(id: AlgorithmIdentifier): string {
    return `${id.name}@${id.version.major}.${id.version.minor}.${id.version.patch}`;
  }
  
  private findCompatibleVersion(id: AlgorithmIdentifier): RegisteredAlgorithm | undefined {
    let compatible: RegisteredAlgorithm | undefined;
    let bestVersion: AlgorithmVersion | undefined;
    
    for (const [_, algorithm] of this.algorithms) {
      const meta = algorithm.metadata;
      
      // Same algorithm name and type
      if (meta.id.name === id.name && meta.id.type === id.type) {
        const version = meta.id.version;
        
        // Check compatibility (same major version)
        if (version.major === id.version.major) {
          // Pick highest compatible version
          if (!bestVersion || this.compareVersions(version, bestVersion) > 0) {
            compatible = algorithm;
            bestVersion = version;
          }
        }
      }
    }
    
    return compatible;
  }
  
  private compareVersions(a: AlgorithmVersion, b: AlgorithmVersion): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }
  
  private calculateAlgorithmScore(algorithm: RegisteredAlgorithm): number {
    const meta = algorithm.metadata;
    const caps = meta.capabilities;
    
    let score = 0;
    
    // Security level is most important
    score += caps.securityLevel * 10;
    
    // Quantum resistance is critical
    if (caps.quantumResistant) score += 1000;
    
    // Performance considerations
    const perf = caps.performance;
    if (perf.keyGeneration) {
      score += Math.max(0, 100 - perf.keyGeneration.averageMs);
    }
    
    // Penalize deprecated algorithms
    if (meta.id.version.deprecated) score -= 500;
    
    return score;
  }
}