/**
 * Comprehensive Fallback Guarantee System
 * Ensures zero service disruption during WASM crypto rollout
 */

import { EventEmitter } from 'eventemitter3';
import { CryptoProvider } from '../interfaces/crypto-provider';
import { AlgorithmIdentifier } from '../interfaces/algorithm-types';

export interface FallbackConfig {
  // Timing configurations
  wasmTimeoutMs: number;
  fallbackTimeoutMs: number;
  circuitBreakerWindowMs: number;
  circuitBreakerCooldownMs: number;
  
  // Threshold configurations
  failureThreshold: number; // Number of failures before circuit opens
  successThreshold: number; // Number of successes to close circuit
  performanceThreshold: number; // Max acceptable latency increase (%)
  
  // Retry configurations
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  
  // Health check configurations
  healthCheckIntervalMs: number;
  enableProactiveHealthChecks: boolean;
  
  // Monitoring
  enableDetailedLogging: boolean;
  enableMetricsCollection: boolean;
}

export interface FallbackState {
  wasmAvailable: boolean;
  fallbackAvailable: boolean;
  circuitState: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastHealthCheck?: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export interface FallbackMetrics {
  totalOperations: number;
  wasmOperations: number;
  fallbackOperations: number;
  failures: number;
  circuitOpenCount: number;
  averageWasmLatency: number;
  averageFallbackLatency: number;
  uptime: number; // percentage
  lastUpdate: number;
}

export interface FallbackOperation<T> {
  operationId: string;
  operationType: string;
  algorithm: AlgorithmIdentifier;
  startTime: number;
  wasmAttempted: boolean;
  fallbackAttempted: boolean;
  retryCount: number;
  result?: T;
  error?: Error;
  duration: number;
}

/**
 * Circuit Breaker for WASM operations
 */
class CircuitBreaker extends EventEmitter {
  private failureCount = 0;
  private successCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(
    private failureThreshold: number,
    private successThreshold: number,
    private windowMs: number,
    private cooldownMs: number
  ) {
    super();
  }

  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      const now = Date.now();
      if (this.nextAttemptTime && now >= this.nextAttemptTime) {
        this.state = 'half-open';
        this.emit('state:changed', { from: 'open', to: 'half-open' });
        return true;
      }
      return false;
    }

    if (this.state === 'half-open') {
      return true;
    }

    return false;
  }

  recordSuccess(): void {
    this.successCount++;
    
    if (this.state === 'half-open' && this.successCount >= this.successThreshold) {
      this.reset();
      this.state = 'closed';
      this.emit('state:changed', { from: 'half-open', to: 'closed' });
    }
    
    this.emit('success:recorded', { successCount: this.successCount });
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'closed' && this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.cooldownMs;
      this.emit('state:changed', { from: 'closed', to: 'open' });
    } else if (this.state === 'half-open') {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.cooldownMs;
      this.emit('state:changed', { from: 'half-open', to: 'open' });
    }
    
    this.emit('failure:recorded', { failureCount: this.failureCount });
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  getMetrics(): { failureCount: number; successCount: number; lastFailureTime?: number } {
    return {
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }
}

/**
 * Comprehensive Fallback Guarantee System
 * 
 * Features:
 * - Circuit breaker pattern for WASM operations
 * - Automatic fallback with configurable timeouts
 * - Health monitoring and proactive checks
 * - Retry logic with exponential backoff
 * - Detailed metrics and monitoring
 * - Zero-disruption guarantees
 */
export class FallbackGuaranteeSystem extends EventEmitter {
  private config: FallbackConfig;
  private state: FallbackState;
  private metrics: FallbackMetrics;
  private circuitBreaker: CircuitBreaker;
  private operations = new Map<string, FallbackOperation<any>>();
  private healthCheckInterval?: number;
  private metricsInterval?: number;

  constructor(
    private wasmProvider: CryptoProvider,
    private fallbackProvider: CryptoProvider,
    config: Partial<FallbackConfig> = {}
  ) {
    super();

    this.config = {
      wasmTimeoutMs: 5000,
      fallbackTimeoutMs: 10000,
      circuitBreakerWindowMs: 60000,
      circuitBreakerCooldownMs: 30000,
      failureThreshold: 5,
      successThreshold: 3,
      performanceThreshold: 200, // 200% latency increase threshold
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      healthCheckIntervalMs: 30000,
      enableProactiveHealthChecks: true,
      enableDetailedLogging: false,
      enableMetricsCollection: true,
      ...config
    };

    this.state = {
      wasmAvailable: false,
      fallbackAvailable: false,
      circuitState: 'closed',
      failureCount: 0,
      successCount: 0,
      healthStatus: 'healthy'
    };

    this.metrics = {
      totalOperations: 0,
      wasmOperations: 0,
      fallbackOperations: 0,
      failures: 0,
      circuitOpenCount: 0,
      averageWasmLatency: 0,
      averageFallbackLatency: 0,
      uptime: 100,
      lastUpdate: Date.now()
    };

    this.circuitBreaker = new CircuitBreaker(
      this.config.failureThreshold,
      this.config.successThreshold,
      this.config.circuitBreakerWindowMs,
      this.config.circuitBreakerCooldownMs
    );

    this.setupCircuitBreakerListeners();
    this.initialize();
  }

  /**
   * Initialize the fallback system
   */
  private async initialize(): Promise<void> {
    try {
      // Check provider availability
      this.state.wasmAvailable = await this.wasmProvider.isAvailable();
      this.state.fallbackAvailable = await this.fallbackProvider.isAvailable();

      // Start health monitoring
      if (this.config.enableProactiveHealthChecks) {
        this.startHealthMonitoring();
      }

      // Start metrics collection
      if (this.config.enableMetricsCollection) {
        this.startMetricsCollection();
      }

      this.updateHealthStatus();
      this.emit('system:initialized', { state: this.state });

    } catch (error) {
      this.emit('system:error', { error, phase: 'initialization' });
      throw error;
    }
  }

  /**
   * Execute operation with comprehensive fallback guarantees
   */
  async executeWithFallback<T>(
    operationType: string,
    algorithm: AlgorithmIdentifier,
    wasmOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const operation: FallbackOperation<T> = {
      operationId,
      operationType,
      algorithm,
      startTime: Date.now(),
      wasmAttempted: false,
      fallbackAttempted: false,
      retryCount: 0,
      duration: 0
    };

    this.operations.set(operationId, operation);
    this.metrics.totalOperations++;

    try {
      const result = await this.executeWithRetry(
        operation,
        wasmOperation,
        fallbackOperation
      );

      operation.result = result;
      operation.duration = Date.now() - operation.startTime;
      
      this.updateSuccessMetrics(operation);
      this.emit('operation:success', { operation });
      
      return result;

    } catch (error) {
      operation.error = error as Error;
      operation.duration = Date.now() - operation.startTime;
      
      this.updateFailureMetrics(operation);
      this.emit('operation:failure', { operation, error });
      
      throw error;
    } finally {
      this.operations.delete(operationId);
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(
    operation: FallbackOperation<T>,
    wasmOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      operation.retryCount = attempt;

      try {
        // Try WASM first if circuit allows and provider is available
        if (this.shouldTryWasm()) {
          operation.wasmAttempted = true;
          
          const result = await this.executeWithTimeout(
            wasmOperation(),
            this.config.wasmTimeoutMs
          );
          
          this.circuitBreaker.recordSuccess();
          this.metrics.wasmOperations++;
          
          return result;
        }

        // Fallback to JavaScript implementation
        if (this.state.fallbackAvailable) {
          operation.fallbackAttempted = true;
          
          const result = await this.executeWithTimeout(
            fallbackOperation(),
            this.config.fallbackTimeoutMs
          );
          
          this.metrics.fallbackOperations++;
          return result;
        }

        throw new Error('No available crypto providers');

      } catch (error) {
        lastError = error as Error;
        
        // Record WASM failure if that's what we tried
        if (operation.wasmAttempted && !operation.fallbackAttempted) {
          this.circuitBreaker.recordFailure();
          this.state.failureCount++;
          
          // Continue to fallback instead of retrying immediately
          operation.wasmAttempted = false;
          continue;
        }

        // If fallback also failed, retry after delay
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          
          // Reset attempt flags for retry
          operation.wasmAttempted = false;
          operation.fallbackAttempted = false;
        }
      }
    }

    // All attempts failed
    this.metrics.failures++;
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Determine if WASM should be attempted
   */
  private shouldTryWasm(): boolean {
    return this.state.wasmAvailable &&
           this.circuitBreaker.canExecute() &&
           this.state.healthStatus !== 'unhealthy';
  }

  /**
   * Calculate retry delay with optional exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.retryDelayMs;
    }
    
    return this.config.retryDelayMs * Math.pow(2, attempt);
  }

  /**
   * Health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = window.setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const healthCheckStart = Date.now();
    
    try {
      // Check WASM provider health
      this.state.wasmAvailable = await this.wasmProvider.isAvailable();
      
      // Check fallback provider health
      this.state.fallbackAvailable = await this.fallbackProvider.isAvailable();
      
      // Update health status
      this.updateHealthStatus();
      
      this.state.lastHealthCheck = Date.now();
      this.emit('health:checked', { 
        duration: Date.now() - healthCheckStart,
        state: this.state 
      });

    } catch (error) {
      this.state.healthStatus = 'unhealthy';
      this.emit('health:error', { error });
    }
  }

  /**
   * Update health status based on current state
   */
  private updateHealthStatus(): void {
    if (!this.state.fallbackAvailable) {
      this.state.healthStatus = 'unhealthy';
    } else if (!this.state.wasmAvailable || this.circuitBreaker.getState() === 'open') {
      this.state.healthStatus = 'degraded';
    } else {
      this.state.healthStatus = 'healthy';
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = window.setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update every 10 seconds
  }

  /**
   * Update comprehensive metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const timeSinceStart = now - this.metrics.lastUpdate;
    
    // Calculate uptime based on health status
    const uptimeWeight = this.state.healthStatus === 'healthy' ? 1 : 
                        this.state.healthStatus === 'degraded' ? 0.7 : 0;
    
    this.metrics.uptime = (this.metrics.uptime * 0.9) + (uptimeWeight * 100 * 0.1);
    
    // Update circuit breaker metrics
    this.state.circuitState = this.circuitBreaker.getState();
    if (this.state.circuitState === 'open') {
      this.metrics.circuitOpenCount++;
    }
    
    this.metrics.lastUpdate = now;
    this.emit('metrics:updated', { metrics: this.metrics });
  }

  /**
   * Update success metrics
   */
  private updateSuccessMetrics(operation: FallbackOperation<any>): void {
    this.state.successCount++;
    
    if (operation.wasmAttempted) {
      this.metrics.averageWasmLatency = this.updateRollingAverage(
        this.metrics.averageWasmLatency,
        operation.duration,
        this.metrics.wasmOperations
      );
    } else {
      this.metrics.averageFallbackLatency = this.updateRollingAverage(
        this.metrics.averageFallbackLatency,
        operation.duration,
        this.metrics.fallbackOperations
      );
    }
  }

  /**
   * Update failure metrics
   */
  private updateFailureMetrics(operation: FallbackOperation<any>): void {
    this.state.failureCount++;
    this.metrics.failures++;
    this.state.lastFailureTime = Date.now();
  }

  /**
   * Setup circuit breaker event listeners
   */
  private setupCircuitBreakerListeners(): void {
    this.circuitBreaker.on('state:changed', (event) => {
      this.state.circuitState = event.to;
      this.emit('circuit:state:changed', event);
      
      if (event.to === 'open') {
        this.emit('circuit:opened', { 
          failureCount: this.state.failureCount,
          lastFailureTime: this.state.lastFailureTime 
        });
      }
    });
  }

  /**
   * Get current system state
   */
  getState(): FallbackState {
    return { ...this.state };
  }

  /**
   * Get current metrics
   */
  getMetrics(): FallbackMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active operations
   */
  getActiveOperations(): FallbackOperation<any>[] {
    return Array.from(this.operations.values());
  }

  /**
   * Force circuit breaker state (for testing/emergency)
   */
  forceCircuitState(state: 'closed' | 'open'): void {
    if (state === 'closed') {
      this.circuitBreaker.reset();
    } else {
      // Force open by recording enough failures
      for (let i = 0; i < this.config.failureThreshold; i++) {
        this.circuitBreaker.recordFailure();
      }
    }
    
    this.emit('circuit:forced', { state });
  }

  /**
   * Emergency shutdown - disable WASM and force all operations to fallback
   */
  emergencyShutdown(reason: string): void {
    this.state.wasmAvailable = false;
    this.forceCircuitState('open');
    this.state.healthStatus = 'degraded';
    
    this.emit('emergency:shutdown', { reason, timestamp: Date.now() });
  }

  /**
   * Update rolling average
   */
  private updateRollingAverage(currentAvg: number, newValue: number, count: number): number {
    if (count === 1) return newValue;
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destroy the fallback system
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.circuitBreaker.removeAllListeners();
    this.removeAllListeners();
    this.operations.clear();
  }
}

/**
 * Factory function to create fallback guarantee system
 */
export async function createFallbackGuaranteeSystem(
  wasmProvider: CryptoProvider,
  fallbackProvider: CryptoProvider,
  config: Partial<FallbackConfig> = {}
): Promise<FallbackGuaranteeSystem> {
  const system = new FallbackGuaranteeSystem(wasmProvider, fallbackProvider, config);
  
  // Ensure both providers are initialized
  await Promise.all([
    wasmProvider.initialize(),
    fallbackProvider.initialize()
  ]);
  
  return system;
}