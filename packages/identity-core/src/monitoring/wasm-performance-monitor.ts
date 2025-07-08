/**
 * WASM Performance Monitoring System for Phase 2B
 * Comprehensive metrics collection and analysis for WASM crypto operations
 */

import { EventEmitter } from 'eventemitter3';
import { WASMOperationMetrics } from '../providers/incremental-wasm-provider';

export interface PerformanceThresholds {
  slowOperationMs: number;
  failureRateThreshold: number; // 0-1 (percentage as decimal)
  memoryUsageThresholdMB: number;
  fallbackRateThreshold: number; // 0-1
}

export interface SystemMetrics {
  cpu: {
    usage: number; // 0-100
    cores: number;
  };
  memory: {
    usedMB: number;
    totalMB: number;
    wasmHeapMB: number;
  };
  network: {
    latencyMs: number;
    throughputMbps: number;
  };
}

export interface PerformanceAnalysis {
  summary: {
    totalOperations: number;
    wasmSuccessRate: number;
    fallbackRate: number;
    averagePerformanceGain: number; // WASM vs fallback speed improvement
    recommendedRolloutPercentage: number;
  };
  trends: {
    performanceOverTime: { timestamp: number; avgDuration: number }[];
    errorRateOverTime: { timestamp: number; errorRate: number }[];
    memoryUsageOverTime: { timestamp: number; memoryMB: number }[];
  };
  recommendations: PerformanceRecommendation[];
  alerts: PerformanceAlert[];
}

export interface PerformanceRecommendation {
  type: 'rollout' | 'rollback' | 'optimization' | 'configuration';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestedAction: string;
  impact: string;
}

export interface PerformanceAlert {
  type: 'performance' | 'error' | 'memory' | 'fallback';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metrics: any;
}

export interface WASMPerformanceConfig {
  thresholds: PerformanceThresholds;
  analysisWindowMs: number; // Time window for analysis
  metricsRetentionMs: number; // How long to keep metrics
  enableRealTimeMonitoring: boolean;
  enableAutoOptimization: boolean;
}

/**
 * Comprehensive WASM Performance Monitor
 * 
 * Features:
 * - Real-time performance tracking
 * - Intelligent analysis and recommendations
 * - Automatic optimization suggestions
 * - Memory usage monitoring
 * - System resource tracking
 */
export class WASMPerformanceMonitor extends EventEmitter {
  private config: WASMPerformanceConfig;
  private metrics: WASMOperationMetrics[] = [];
  private systemMetrics: (SystemMetrics & { timestamp: number })[] = [];
  private alerts: PerformanceAlert[] = [];
  private lastAnalysis?: PerformanceAnalysis;
  private monitoringInterval?: number;
  private cleanupInterval?: number;

  constructor(config: Partial<WASMPerformanceConfig> = {}) {
    super();
    
    this.config = {
      thresholds: {
        slowOperationMs: 1000,
        failureRateThreshold: 0.05, // 5%
        memoryUsageThresholdMB: 100,
        fallbackRateThreshold: 0.3 // 30%
      },
      analysisWindowMs: 300000, // 5 minutes
      metricsRetentionMs: 3600000, // 1 hour
      enableRealTimeMonitoring: true,
      enableAutoOptimization: false,
      ...config
    };

    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }

    this.startCleanupTask();
  }

  /**
   * Record a WASM operation metric
   */
  recordMetric(metric: WASMOperationMetrics): void {
    this.metrics.push(metric);
    
    // Check for immediate alerts
    this.checkForAlerts(metric);
    
    // Emit metric for real-time processing
    this.emit('metric:recorded', metric);
    
    // Trigger analysis if we have enough data
    if (this.shouldTriggerAnalysis()) {
      this.performAnalysis();
    }
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(metrics: SystemMetrics): void {
    const metricsWithTimestamp = {
      ...metrics,
      timestamp: Date.now()
    };
    
    this.systemMetrics.push(metricsWithTimestamp);
    this.emit('systemMetrics:recorded', metrics);
  }

  /**
   * Perform comprehensive performance analysis
   */
  performAnalysis(): PerformanceAnalysis {
    const now = Date.now();
    const windowStart = now - this.config.analysisWindowMs;
    
    // Filter metrics to analysis window
    const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
    const recentSystemMetrics = this.systemMetrics.filter(
      m => m.timestamp >= windowStart
    );

    if (recentMetrics.length === 0) {
      return this.createEmptyAnalysis();
    }

    const analysis = this.buildAnalysis(recentMetrics, recentSystemMetrics);
    this.lastAnalysis = analysis;
    
    this.emit('analysis:completed', analysis);
    
    // Generate recommendations and alerts
    this.processRecommendations(analysis);
    
    return analysis;
  }

  /**
   * Get current performance analysis
   */
  getCurrentAnalysis(): PerformanceAnalysis | undefined {
    return this.lastAnalysis;
  }

  /**
   * Get real-time metrics summary
   */
  getRealTimeMetrics(): {
    operationsPerSecond: number;
    averageLatency: number;
    errorRate: number;
    wasmUsageRate: number;
    memoryUsage: number;
  } {
    const recentWindow = 60000; // Last minute
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < recentWindow);
    
    if (recentMetrics.length === 0) {
      return {
        operationsPerSecond: 0,
        averageLatency: 0,
        errorRate: 0,
        wasmUsageRate: 0,
        memoryUsage: 0
      };
    }

    const wasmOperations = recentMetrics.filter(m => m.usedWasm);
    const errorOperations = recentMetrics.filter(m => !m.success);
    
    const averageLatency = this.calculateAverageLatency(recentMetrics);
    const recentSystemMetric = this.systemMetrics[this.systemMetrics.length - 1];

    return {
      operationsPerSecond: recentMetrics.length / (recentWindow / 1000),
      averageLatency,
      errorRate: errorOperations.length / recentMetrics.length,
      wasmUsageRate: wasmOperations.length / recentMetrics.length,
      memoryUsage: recentSystemMetric?.memory.wasmHeapMB || 0
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): PerformanceRecommendation[] {
    const analysis = this.lastAnalysis;
    if (!analysis) {
      return [];
    }

    return analysis.recommendations;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    const alertWindow = 300000; // 5 minutes
    const now = Date.now();
    
    return this.alerts.filter(alert => now - alert.timestamp < alertWindow);
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.emit('alerts:cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WASMPerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config:updated', this.config);
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Every 5 seconds
  }

  /**
   * Start cleanup task for old metrics
   */
  private startCleanupTask(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000); // Every minute
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        cpu: await this.getCPUMetrics(),
        memory: await this.getMemoryMetrics(),
        network: await this.getNetworkMetrics()
      };
      
      this.recordSystemMetrics(metrics);
    } catch (error) {
      console.warn('Failed to collect system metrics:', error);
    }
  }

  /**
   * Get CPU metrics
   */
  private async getCPUMetrics(): Promise<{ usage: number; cores: number }> {
    return {
      usage: 0, // Browser doesn't expose CPU usage directly
      cores: navigator.hardwareConcurrency || 4
    };
  }

  /**
   * Get memory metrics
   */
  private async getMemoryMetrics(): Promise<{ usedMB: number; totalMB: number; wasmHeapMB: number }> {
    const memory = (performance as any).memory;
    
    return {
      usedMB: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
      totalMB: memory ? memory.totalJSHeapSize / (1024 * 1024) : 0,
      wasmHeapMB: 0 // Would need WASM module integration to get precise heap size
    };
  }

  /**
   * Get network metrics
   */
  private async getNetworkMetrics(): Promise<{ latencyMs: number; throughputMbps: number }> {
    // Simple ping test for latency
    const startTime = performance.now();
    try {
      await fetch('/ping', { method: 'HEAD' });
      const latency = performance.now() - startTime;
      return {
        latencyMs: latency,
        throughputMbps: 0 // Would need dedicated bandwidth test
      };
    } catch {
      return {
        latencyMs: 0,
        throughputMbps: 0
      };
    }
  }

  /**
   * Check for immediate alerts
   */
  private checkForAlerts(metric: WASMOperationMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Check for slow operations
    const duration = metric.wasmDuration || metric.fallbackDuration || 0;
    if (duration > this.config.thresholds.slowOperationMs) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Slow ${metric.operationType} operation: ${duration.toFixed(2)}ms`,
        timestamp: Date.now(),
        metrics: metric
      });
    }

    // Check for failures
    if (!metric.success) {
      alerts.push({
        type: 'error',
        severity: 'error',
        message: `${metric.operationType} operation failed: ${metric.fallbackReason || 'Unknown error'}`,
        timestamp: Date.now(),
        metrics: metric
      });
    }

    // Check for WASM fallback
    if (!metric.usedWasm && metric.fallbackReason) {
      alerts.push({
        type: 'fallback',
        severity: 'warning',
        message: `WASM fallback for ${metric.operationType}: ${metric.fallbackReason}`,
        timestamp: Date.now(),
        metrics: metric
      });
    }

    // Add alerts and emit
    alerts.forEach(alert => {
      this.alerts.push(alert);
      this.emit('alert:triggered', alert);
    });
  }

  /**
   * Build comprehensive analysis
   */
  private buildAnalysis(
    metrics: WASMOperationMetrics[], 
    systemMetrics: (SystemMetrics & { timestamp: number })[]
  ): PerformanceAnalysis {
    const wasmMetrics = metrics.filter(m => m.usedWasm && m.success);
    const fallbackMetrics = metrics.filter(m => !m.usedWasm && m.success);
    const errorMetrics = metrics.filter(m => !m.success);

    // Calculate performance gain
    const avgWasmDuration = this.calculateAverageLatency(wasmMetrics, 'wasmDuration');
    const avgFallbackDuration = this.calculateAverageLatency(fallbackMetrics, 'fallbackDuration');
    const performanceGain = avgFallbackDuration > 0 ? 
      ((avgFallbackDuration - avgWasmDuration) / avgFallbackDuration) * 100 : 0;

    // Calculate rates
    const wasmSuccessRate = wasmMetrics.length / Math.max(metrics.length, 1);
    const fallbackRate = fallbackMetrics.length / Math.max(metrics.length, 1);
    const errorRate = errorMetrics.length / Math.max(metrics.length, 1);

    // Generate trends
    const trends = this.generateTrends(metrics, systemMetrics);

    // Calculate recommended rollout percentage
    const recommendedRollout = this.calculateRecommendedRollout(
      wasmSuccessRate, fallbackRate, performanceGain, errorRate
    );

    return {
      summary: {
        totalOperations: metrics.length,
        wasmSuccessRate,
        fallbackRate,
        averagePerformanceGain: performanceGain,
        recommendedRolloutPercentage: recommendedRollout
      },
      trends,
      recommendations: this.generateRecommendations(
        wasmSuccessRate, fallbackRate, performanceGain, errorRate
      ),
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Generate performance trends
   */
  private generateTrends(
    metrics: WASMOperationMetrics[],
    systemMetrics: (SystemMetrics & { timestamp: number })[]
  ): PerformanceAnalysis['trends'] {
    const buckets = 10; // Divide time window into 10 buckets
    const windowSize = this.config.analysisWindowMs / buckets;
    const now = Date.now();

    const performanceOverTime: { timestamp: number; avgDuration: number }[] = [];
    const errorRateOverTime: { timestamp: number; errorRate: number }[] = [];
    const memoryUsageOverTime: { timestamp: number; memoryMB: number }[] = [];

    for (let i = 0; i < buckets; i++) {
      const bucketStart = now - this.config.analysisWindowMs + (i * windowSize);
      const bucketEnd = bucketStart + windowSize;
      
      const bucketMetrics = metrics.filter(m => 
        m.timestamp >= bucketStart && m.timestamp < bucketEnd
      );
      
      const bucketSystemMetrics = systemMetrics.filter(m =>
        m.timestamp >= bucketStart && m.timestamp < bucketEnd
      );

      // Performance trend
      const avgDuration = this.calculateAverageLatency(bucketMetrics);
      performanceOverTime.push({
        timestamp: bucketStart,
        avgDuration
      });

      // Error rate trend
      const errorCount = bucketMetrics.filter(m => !m.success).length;
      const errorRate = bucketMetrics.length > 0 ? errorCount / bucketMetrics.length : 0;
      errorRateOverTime.push({
        timestamp: bucketStart,
        errorRate
      });

      // Memory usage trend
      const avgMemory = bucketSystemMetrics.length > 0 ?
        bucketSystemMetrics.reduce((sum, m) => sum + m.memory.usedMB, 0) / bucketSystemMetrics.length :
        0;
      memoryUsageOverTime.push({
        timestamp: bucketStart,
        memoryMB: avgMemory
      });
    }

    return {
      performanceOverTime,
      errorRateOverTime,
      memoryUsageOverTime
    };
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(
    wasmSuccessRate: number,
    fallbackRate: number,
    performanceGain: number,
    errorRate: number
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // WASM performance recommendations
    if (performanceGain > 50 && wasmSuccessRate > 0.9) {
      recommendations.push({
        type: 'rollout',
        severity: 'high',
        message: 'WASM showing excellent performance gains with high success rate',
        suggestedAction: 'Increase gradual rollout percentage to 50%',
        impact: `Expected ${performanceGain.toFixed(1)}% performance improvement`
      });
    } else if (performanceGain < 10 || wasmSuccessRate < 0.8) {
      recommendations.push({
        type: 'rollback',
        severity: 'medium',
        message: 'WASM performance gains are minimal or success rate is low',
        suggestedAction: 'Reduce rollout percentage or investigate WASM issues',
        impact: 'Prevent performance degradation and user experience issues'
      });
    }

    // Error rate recommendations
    if (errorRate > this.config.thresholds.failureRateThreshold) {
      recommendations.push({
        type: 'optimization',
        severity: 'high',
        message: `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold`,
        suggestedAction: 'Investigate error patterns and improve error handling',
        impact: 'Reduce user-facing failures and improve reliability'
      });
    }

    // Fallback rate recommendations
    if (fallbackRate > this.config.thresholds.fallbackRateThreshold) {
      recommendations.push({
        type: 'optimization',
        severity: 'medium',
        message: `High fallback rate (${(fallbackRate * 100).toFixed(1)}%) detected`,
        suggestedAction: 'Optimize WASM operations or increase timeout thresholds',
        impact: 'Improve WASM utilization and reduce fallback overhead'
      });
    }

    return recommendations;
  }

  /**
   * Calculate recommended rollout percentage
   */
  private calculateRecommendedRollout(
    wasmSuccessRate: number,
    fallbackRate: number,
    performanceGain: number,
    errorRate: number
  ): number {
    let baseRollout = 10; // Conservative start

    // Increase rollout based on success metrics
    if (wasmSuccessRate > 0.95 && performanceGain > 30) {
      baseRollout = 50;
    } else if (wasmSuccessRate > 0.9 && performanceGain > 20) {
      baseRollout = 30;
    } else if (wasmSuccessRate > 0.85 && performanceGain > 10) {
      baseRollout = 20;
    }

    // Reduce rollout based on problems
    if (errorRate > 0.05) baseRollout *= 0.5;
    if (fallbackRate > 0.3) baseRollout *= 0.7;

    return Math.max(Math.min(Math.round(baseRollout), 100), 0);
  }

  /**
   * Calculate average latency from metrics
   */
  private calculateAverageLatency(
    metrics: WASMOperationMetrics[], 
    field: 'wasmDuration' | 'fallbackDuration' = 'wasmDuration'
  ): number {
    if (metrics.length === 0) return 0;
    
    const durations = metrics
      .map(m => field === 'wasmDuration' ? m.wasmDuration : m.fallbackDuration)
      .filter((d): d is number => d !== undefined);
    
    if (durations.length === 0) return 0;
    
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }

  /**
   * Check if analysis should be triggered
   */
  private shouldTriggerAnalysis(): boolean {
    const recentMetricsCount = this.metrics.filter(
      m => Date.now() - m.timestamp < this.config.analysisWindowMs
    ).length;
    
    const timeSinceLastAnalysis = this.lastAnalysis ? 
      Date.now() - (this.lastAnalysis as any).timestamp || 0 : 
      Number.MAX_SAFE_INTEGER;
      
    return recentMetricsCount >= 50 || // Enough operations
           timeSinceLastAnalysis > 60000; // 1 minute since last analysis
  }

  /**
   * Create empty analysis
   */
  private createEmptyAnalysis(): PerformanceAnalysis {
    return {
      summary: {
        totalOperations: 0,
        wasmSuccessRate: 0,
        fallbackRate: 0,
        averagePerformanceGain: 0,
        recommendedRolloutPercentage: 10
      },
      trends: {
        performanceOverTime: [],
        errorRateOverTime: [],
        memoryUsageOverTime: []
      },
      recommendations: [],
      alerts: []
    };
  }

  /**
   * Process recommendations and trigger actions
   */
  private processRecommendations(analysis: PerformanceAnalysis): void {
    if (!this.config.enableAutoOptimization) return;

    for (const recommendation of analysis.recommendations) {
      if (recommendation.type === 'rollout' && recommendation.severity === 'high') {
        this.emit('autoOptimization:rolloutIncrease', {
          suggestedPercentage: analysis.summary.recommendedRolloutPercentage
        });
      } else if (recommendation.type === 'rollback') {
        this.emit('autoOptimization:rollbackRequired', {
          reason: recommendation.message
        });
      }
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.config.metricsRetentionMs;
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp >= cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
  }

  /**
   * Destroy monitor and clean up resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.removeAllListeners();
    this.metrics = [];
    this.systemMetrics = [];
    this.alerts = [];
  }
}