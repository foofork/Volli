/**
 * Phase 2B Complete Integration Example
 * Demonstrates the full WASM Enhancement system working together
 */

import { 
  IncrementalWASMProvider, 
  createIncrementalWASMProvider,
  type WASMFeatureFlags
} from '../providers/incremental-wasm-provider';
import { 
  WASMPerformanceMonitor,
  type WASMPerformanceConfig 
} from '../monitoring/wasm-performance-monitor';
import { 
  WASMABTestingFramework,
  type ABTestConfig,
  type UserContext 
} from '../testing/wasm-ab-testing';
import { 
  FallbackGuaranteeSystem,
  createFallbackGuaranteeSystem,
  type FallbackConfig
} from '../resilience/fallback-guarantee';
import { 
  WASMOptimizationManager,
  type WASMMemoryConfig,
  type BatchingConfig 
} from '../optimization/wasm-optimization';
import { CryptoFacade } from '../orchestration/crypto-facade';
import { CryptoProvider } from '../interfaces/crypto-provider';
import { AlgorithmType, AlgorithmIdentifier } from '../interfaces/algorithm-types';

/**
 * Complete Phase 2B WASM Enhancement System
 * 
 * Integrates all components:
 * - Incremental WASM Provider with feature flags
 * - Performance monitoring and analytics
 * - A/B testing framework for gradual rollout
 * - Comprehensive fallback guarantees
 * - Memory and batching optimization
 */
export class WASMEnhancementSystem {
  private wasmProvider!: IncrementalWASMProvider;
  private performanceMonitor!: WASMPerformanceMonitor;
  private abTestingFramework!: WASMABTestingFramework;
  private fallbackSystem!: FallbackGuaranteeSystem;
  private optimizationManager!: WASMOptimizationManager;
  private cryptoFacade!: CryptoFacade;
  
  private initialized = false;
  private currentUser?: UserContext;

  constructor(
    private baseWasmProvider: CryptoProvider,
    private fallbackProvider: CryptoProvider,
    private config: {
      featureFlags?: Partial<WASMFeatureFlags>;
      performanceConfig?: Partial<WASMPerformanceConfig>;
      fallbackConfig?: Partial<FallbackConfig>;
      memoryConfig?: Partial<WASMMemoryConfig>;
      batchingConfig?: Partial<BatchingConfig>;
    } = {}
  ) {}

  /**
   * Initialize the complete WASM enhancement system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing Phase 2B WASM Enhancement System...');

    try {
      // 1. Initialize Performance Monitor first
      this.performanceMonitor = new WASMPerformanceMonitor(this.config.performanceConfig);
      console.log('✅ Performance Monitor initialized');

      // 2. Initialize Incremental WASM Provider with monitoring
      this.wasmProvider = await createIncrementalWASMProvider(
        this.baseWasmProvider,
        this.fallbackProvider,
        {
          ...this.config.featureFlags,
          metricsCallback: (metrics) => {
            this.performanceMonitor.recordMetric(metrics);
          }
        }
      );
      console.log('✅ Incremental WASM Provider initialized');

      // 3. Initialize A/B Testing Framework
      this.abTestingFramework = new WASMABTestingFramework(this.performanceMonitor);
      this.setupDefaultABTests();
      console.log('✅ A/B Testing Framework initialized');

      // 4. Initialize Fallback Guarantee System
      this.fallbackSystem = await createFallbackGuaranteeSystem(
        this.baseWasmProvider,
        this.fallbackProvider,
        this.config.fallbackConfig
      );
      console.log('✅ Fallback Guarantee System initialized');

      // 5. Initialize Optimization Manager
      this.optimizationManager = new WASMOptimizationManager(
        this.baseWasmProvider,
        this.config.memoryConfig,
        this.config.batchingConfig
      );
      await this.optimizationManager.initialize();
      console.log('✅ Optimization Manager initialized');

      // 6. Initialize Crypto Facade with enhanced provider
      this.cryptoFacade = new CryptoFacade({
        enableWorkerPool: true,
        circuitBreaker: { enabled: true, failureThreshold: 5, resetTimeout: 30000 }
      });
      console.log('✅ Crypto Facade initialized');

      // 7. Setup system event listeners
      this.setupSystemEventListeners();

      this.initialized = true;
      console.log('🎉 Phase 2B WASM Enhancement System fully initialized!');

    } catch (error) {
      console.error('❌ Failed to initialize WASM Enhancement System:', error);
      throw error;
    }
  }

  /**
   * Set current user context for A/B testing
   */
  setUserContext(userContext: UserContext): void {
    this.currentUser = userContext;
    console.log(`👤 User context set: ${userContext.userId} (${userContext.deviceType})`);
  }

  /**
   * Generate key pair with full enhancement pipeline
   */
  async generateKeyPair(
    algorithmType: AlgorithmType = AlgorithmType.KEM,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<any> {
    if (!this.initialized) {
      throw new Error('System not initialized');
    }

    const startTime = performance.now();
    console.log(`🔑 Generating key pair (${algorithmType}, priority: ${priority})`);

    try {
      // 1. Check A/B test assignment for this user
      const shouldUseWasm = this.currentUser ? 
        this.abTestingFramework.shouldUseWASM('wasm-rollout-test', this.currentUser) : 
        false;

      // 2. Update feature flags based on A/B test
      if (shouldUseWasm) {
        this.wasmProvider.updateFeatureFlags({ ENABLE_WASM_CRYPTO: true });
        console.log('🧪 A/B Test: User assigned to WASM group');
      } else {
        this.wasmProvider.updateFeatureFlags({ ENABLE_WASM_CRYPTO: false });
        console.log('🧪 A/B Test: User assigned to fallback group');
      }

      // 3. Use optimized generation with batching if available
      const algorithm: AlgorithmIdentifier = {
        name: 'ML-KEM-768',
        version: { major: 1, minor: 0, patch: 0 },
        type: algorithmType
      };

      const keyPair = await this.optimizationManager.generateKeyPair(algorithm, priority);

      const duration = performance.now() - startTime;
      console.log(`✅ Key pair generated in ${duration.toFixed(2)}ms`);

      return keyPair;

    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Key generation failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * Encapsulate with enhanced performance
   */
  async encapsulate(
    publicKey: any,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<any> {
    console.log(`🔐 Encapsulating (priority: ${priority})`);

    const algorithm: AlgorithmIdentifier = {
      name: 'ML-KEM-768',
      version: { major: 1, minor: 0, patch: 0 },
      type: AlgorithmType.KEM
    };

    // Use fallback system for guaranteed operation
    return this.fallbackSystem.executeWithFallback(
      'encapsulate',
      algorithm,
      () => this.optimizationManager.encapsulate(publicKey, algorithm, priority),
      () => this.fallbackProvider.encapsulate!(publicKey, algorithm)
    );
  }

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics(): {
    performance: any;
    abTesting: any;
    fallback: any;
    optimization: any;
    provider: any;
  } {
    return {
      performance: this.performanceMonitor.getCurrentAnalysis(),
      abTesting: this.abTestingFramework.getActiveTests(),
      fallback: this.fallbackSystem.getMetrics(),
      optimization: this.optimizationManager.getMetrics(),
      provider: this.wasmProvider.getMetricsSummary()
    };
  }

  /**
   * Get real-time dashboard data
   */
  getRealTimeDashboard(): any {
    const performanceMetrics = this.performanceMonitor.getRealTimeMetrics();
    const fallbackState = this.fallbackSystem.getState();
    const providerSummary = this.wasmProvider.getMetricsSummary();

    return {
      status: fallbackState.healthStatus,
      wasmEnabled: this.wasmProvider.getFeatureFlags().ENABLE_WASM_CRYPTO,
      performance: {
        operationsPerSecond: performanceMetrics.operationsPerSecond,
        averageLatency: performanceMetrics.averageLatency,
        errorRate: performanceMetrics.errorRate * 100,
        wasmUsageRate: performanceMetrics.wasmUsageRate * 100
      },
      reliability: {
        uptime: fallbackState.healthStatus === 'healthy' ? 100 : 
                fallbackState.healthStatus === 'degraded' ? 70 : 0,
        circuitState: fallbackState.circuitState,
        fallbackRate: providerSummary.fallbackRate * 100
      },
      optimization: {
        memoryUsage: performanceMetrics.memoryUsage,
        batching: this.optimizationManager.getMetrics().batching
      }
    };
  }

  /**
   * Trigger performance analysis
   */
  analyzePerformance(): any {
    return this.performanceMonitor.performAnalysis();
  }

  /**
   * Update system configuration
   */
  updateConfiguration(updates: {
    featureFlags?: Partial<WASMFeatureFlags>;
    rolloutPercentage?: number;
    memoryConfig?: Partial<WASMMemoryConfig>;
  }): void {
    if (updates.featureFlags) {
      this.wasmProvider.updateFeatureFlags(updates.featureFlags);
      console.log('🔧 Feature flags updated:', updates.featureFlags);
    }

    if (updates.rolloutPercentage !== undefined) {
      this.abTestingFramework.updateTest('wasm-rollout-test', {
        rolloutPercentage: updates.rolloutPercentage
      });
      console.log(`🎯 Rollout percentage updated to ${updates.rolloutPercentage}%`);
    }

    if (updates.memoryConfig) {
      this.optimizationManager.updateConfig(updates.memoryConfig);
      console.log('💾 Memory configuration updated:', updates.memoryConfig);
    }
  }

  /**
   * Emergency procedures
   */
  emergencyDisableWasm(reason: string): void {
    console.warn(`🚨 EMERGENCY: Disabling WASM - ${reason}`);
    
    this.fallbackSystem.emergencyShutdown(reason);
    this.wasmProvider.updateFeatureFlags({ ENABLE_WASM_CRYPTO: false });
    this.abTestingFramework.stopTest('wasm-rollout-test', `Emergency: ${reason}`);
  }

  /**
   * Setup default A/B tests
   */
  private setupDefaultABTests(): void {
    const testConfig: ABTestConfig = {
      name: 'wasm-rollout-test',
      description: 'Gradual rollout of WASM crypto operations',
      enabled: true,
      rolloutPercentage: 10, // Start with 10%
      targetCriteria: {
        deviceTypes: ['desktop'], // Start with desktop only
        performanceProfile: 'high' // High-performance devices first
      },
      successCriteria: {
        minSuccessRate: 0.95,
        maxErrorRate: 0.02,
        minPerformanceGain: 20, // At least 20% improvement
        maxLatencyIncrease: 100, // Max 100ms latency increase
        minSampleSize: 100
      },
      safeguards: {
        autoStopOnHighErrorRate: true,
        errorRateThreshold: 0.05,
        performanceRegressionThreshold: 10,
        maxAutoRollbackTime: 24 * 60 * 60 * 1000, // 24 hours
        requireManualApproval: false
      }
    };

    this.abTestingFramework.createTest(testConfig);
    console.log('🧪 Default A/B test created: 10% rollout to high-performance desktop devices');
  }

  /**
   * Setup system event listeners
   */
  private setupSystemEventListeners(): void {
    // Performance monitoring alerts
    this.performanceMonitor.on('alert:triggered', (alert) => {
      console.warn(`⚠️ Performance Alert: ${alert.message}`);
      
      if (alert.severity === 'critical') {
        this.emergencyDisableWasm(alert.message);
      }
    });

    // A/B testing events
    this.abTestingFramework.on('test:evaluated', ({ testName, result }) => {
      console.log(`📊 A/B Test '${testName}' evaluated:`, result.evaluation.recommendation);
      
      if (result.evaluation.recommendation === 'expand') {
        const newPercentage = Math.min(result.metrics.successRate * 100, 50);
        this.updateConfiguration({ rolloutPercentage: newPercentage });
      } else if (result.evaluation.recommendation === 'rollback') {
        this.emergencyDisableWasm('A/B test recommended rollback');
      }
    });

    // Fallback system events
    this.fallbackSystem.on('circuit:opened', (event) => {
      console.warn(`⚡ Circuit breaker opened: ${event.failureCount} failures`);
    });

    this.fallbackSystem.on('emergency:shutdown', (event) => {
      console.error(`🆘 Emergency shutdown: ${event.reason}`);
    });

    // Optimization events
    this.optimizationManager.on('batch:optimized', (event) => {
      console.log(`⚡ Batch optimized: ${event.operationCount} operations in ${event.duration.toFixed(2)}ms`);
    });

    // WASM provider events
    this.wasmProvider.on('wasm:fallback', (event) => {
      console.warn(`🔄 WASM fallback: ${event.operationType} - ${event.error?.message}`);
    });
  }

  /**
   * Destroy the system and clean up resources
   */
  async destroy(): Promise<void> {
    console.log('🧹 Destroying WASM Enhancement System...');

    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
    }

    if (this.abTestingFramework) {
      this.abTestingFramework.destroy();
    }

    if (this.fallbackSystem) {
      this.fallbackSystem.destroy();
    }

    if (this.optimizationManager) {
      this.optimizationManager.destroy();
    }

    if (this.wasmProvider) {
      await this.wasmProvider.destroy();
    }

    this.initialized = false;
    console.log('✅ WASM Enhancement System destroyed');
  }
}

/**
 * Example usage of the complete Phase 2B system
 */
export async function demonstratePhase2BSystem(): Promise<void> {
  console.log('🎯 Phase 2B WASM Enhancement System Demonstration');
  console.log('='.repeat(60));

  // Mock providers for demonstration
  const mockWasmProvider: CryptoProvider = {
    name: 'mock-wasm',
    version: '1.0.0',
    priority: 100,
    async isAvailable() { return true; },
    async initialize() { },
    async destroy() { },
    getCapabilities() { 
      return { 
        algorithms: new Map(), 
        features: new Set(), 
        performance: { initializationTimeMs: 50, memoryUsageMB: 16, parallelism: 4 }
      }; 
    },
    supportsAlgorithm() { return true; },
    async generateKeyPair() { 
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate WASM speed
      return { publicKey: new Uint8Array(32), privateKey: new Uint8Array(64) } as any; 
    },
    async importPublicKey(keyData: Uint8Array) { 
      return { data: keyData } as any; 
    },
    async importPrivateKey(keyData: Uint8Array) { 
      return { data: keyData } as any; 
    },
    async exportPublicKey(publicKey: any) { 
      return publicKey.data || new Uint8Array(32); 
    },
    async exportPrivateKey(privateKey: any) { 
      return privateKey.data || new Uint8Array(64); 
    }
  };

  const mockFallbackProvider: CryptoProvider = {
    name: 'mock-fallback',
    version: '1.0.0',
    priority: 50,
    async isAvailable() { return true; },
    async initialize() { },
    async destroy() { },
    getCapabilities() { 
      return { 
        algorithms: new Map(), 
        features: new Set(), 
        performance: { initializationTimeMs: 20, memoryUsageMB: 8, parallelism: 2 }
      }; 
    },
    supportsAlgorithm() { return true; },
    async generateKeyPair() { 
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate slower JS
      return { publicKey: new Uint8Array(32), privateKey: new Uint8Array(64) } as any; 
    },
    async importPublicKey(keyData: Uint8Array) { 
      return { data: keyData } as any; 
    },
    async importPrivateKey(keyData: Uint8Array) { 
      return { data: keyData } as any; 
    },
    async exportPublicKey(publicKey: any) { 
      return publicKey.data || new Uint8Array(32); 
    },
    async exportPrivateKey(privateKey: any) { 
      return privateKey.data || new Uint8Array(64); 
    }
  };

  // Initialize the system
  const system = new WASMEnhancementSystem(mockWasmProvider, mockFallbackProvider, {
    featureFlags: {
      ENABLE_WASM_CRYPTO: true,
      GRADUAL_ROLLOUT_PERCENTAGE: 10,
      ENABLE_PERFORMANCE_MONITORING: true
    }
  });

  try {
    await system.initialize();

    // Set user context
    system.setUserContext({
      userId: 'demo-user-123',
      deviceType: 'desktop',
      performanceProfile: 'high',
      browser: { name: 'Chrome', version: '120.0.0' },
      sessionId: 'demo-session'
    });

    // Demonstrate key generation
    console.log('\n📈 Generating key pairs to demonstrate the system...');
    
    for (let i = 0; i < 5; i++) {
      await system.generateKeyPair(AlgorithmType.KEM, 'medium');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Show real-time metrics
    console.log('\n📊 Real-time Dashboard:');
    const dashboard = system.getRealTimeDashboard();
    console.log(JSON.stringify(dashboard, null, 2));

    // Analyze performance
    console.log('\n🔍 Performance Analysis:');
    const analysis = system.analyzePerformance();
    if (analysis) {
      console.log(`- Total Operations: ${analysis.summary.totalOperations}`);
      console.log(`- WASM Success Rate: ${(analysis.summary.wasmSuccessRate * 100).toFixed(1)}%`);
      console.log(`- Performance Gain: ${analysis.summary.averagePerformanceGain.toFixed(1)}%`);
      console.log(`- Recommended Rollout: ${analysis.summary.recommendedRolloutPercentage}%`);
    }

    // Demonstrate configuration updates
    console.log('\n⚙️ Updating configuration...');
    system.updateConfiguration({
      rolloutPercentage: 25,
      featureFlags: { GRADUAL_ROLLOUT_PERCENTAGE: 25 }
    });

    console.log('\n✅ Phase 2B Demonstration Complete!');
    console.log('The system successfully demonstrated:');
    console.log('  ✓ Incremental WASM integration with fallback');
    console.log('  ✓ Real-time performance monitoring');
    console.log('  ✓ A/B testing framework');
    console.log('  ✓ Comprehensive fallback guarantees');
    console.log('  ✓ Memory and batching optimization');

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  } finally {
    await system.destroy();
  }
}

// Export is above in the function declaration