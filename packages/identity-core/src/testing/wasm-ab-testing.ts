/**
 * A/B Testing Framework for WASM Gradual Rollout
 * Enables safe, controlled testing of WASM crypto operations
 */

import { EventEmitter } from 'eventemitter3';
import { WASMOperationMetrics } from '../providers/incremental-wasm-provider';
import { PerformanceAnalysis, WASMPerformanceMonitor } from '../monitoring/wasm-performance-monitor';

export interface ABTestConfig {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetCriteria?: UserCriteria;
  duration?: number; // Test duration in ms
  successCriteria: SuccessCriteria;
  safeguards: Safeguards;
}

export interface UserCriteria {
  includeUserIds?: string[];
  excludeUserIds?: string[];
  includeCountries?: string[];
  excludeCountries?: string[];
  browserVersions?: { [browser: string]: string }; // min versions
  deviceTypes?: ('desktop' | 'mobile' | 'tablet')[];
  performanceProfile?: 'high' | 'medium' | 'low';
}

export interface SuccessCriteria {
  minSuccessRate: number; // 0-1
  maxErrorRate: number; // 0-1
  minPerformanceGain: number; // percentage
  maxLatencyIncrease: number; // ms
  minSampleSize: number; // minimum operations to evaluate
}

export interface Safeguards {
  autoStopOnHighErrorRate: boolean;
  errorRateThreshold: number; // 0-1
  performanceRegressionThreshold: number; // percentage
  maxAutoRollbackTime: number; // ms
  requireManualApproval: boolean;
}

export interface ABTestResult {
  testName: string;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  startTime: number;
  endTime?: number;
  metrics: {
    totalOperations: number;
    wasmOperations: number;
    fallbackOperations: number;
    successRate: number;
    errorRate: number;
    averagePerformanceGain: number;
    averageLatency: number;
  };
  evaluation: {
    meetsCriteria: boolean;
    criteriaMet: string[];
    criteriaFailed: string[];
    recommendation: 'continue' | 'stop' | 'expand' | 'rollback';
  };
}

export interface UserContext {
  userId: string;
  country?: string;
  browser?: { name: string; version: string };
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  performanceProfile?: 'high' | 'medium' | 'low';
  sessionId: string;
}

/**
 * A/B Testing Framework for WASM Rollout
 * 
 * Features:
 * - Controlled user targeting
 * - Automatic success evaluation
 * - Safety mechanisms and auto-rollback
 * - Statistical significance testing
 * - Multi-test management
 */
export class WASMABTestingFramework extends EventEmitter {
  private tests = new Map<string, ABTestConfig>();
  private testResults = new Map<string, ABTestResult>();
  private userAssignments = new Map<string, Map<string, boolean>>(); // userId -> testName -> isInTest
  private performanceMonitor: WASMPerformanceMonitor;
  private evaluationInterval?: number;

  constructor(performanceMonitor: WASMPerformanceMonitor) {
    super();
    this.performanceMonitor = performanceMonitor;
    
    // Listen to metrics for real-time evaluation
    this.performanceMonitor.on('metric:recorded', (metric: WASMOperationMetrics) => {
      this.updateTestMetrics(metric);
    });

    // Start periodic evaluation
    this.startPeriodicEvaluation();
  }

  /**
   * Create and start a new A/B test
   */
  createTest(config: ABTestConfig): void {
    if (this.tests.has(config.name)) {
      throw new Error(`Test '${config.name}' already exists`);
    }

    // Validate configuration
    this.validateTestConfig(config);

    // Store test configuration
    this.tests.set(config.name, config);

    // Initialize test result
    this.testResults.set(config.name, {
      testName: config.name,
      status: config.enabled ? 'running' : 'stopped',
      startTime: Date.now(),
      metrics: {
        totalOperations: 0,
        wasmOperations: 0,
        fallbackOperations: 0,
        successRate: 0,
        errorRate: 0,
        averagePerformanceGain: 0,
        averageLatency: 0
      },
      evaluation: {
        meetsCriteria: false,
        criteriaMet: [],
        criteriaFailed: [],
        recommendation: 'continue'
      }
    });

    this.emit('test:created', { testName: config.name, config });
  }

  /**
   * Update test configuration
   */
  updateTest(testName: string, updates: Partial<ABTestConfig>): void {
    const config = this.tests.get(testName);
    if (!config) {
      throw new Error(`Test '${testName}' not found`);
    }

    const updatedConfig = { ...config, ...updates };
    this.validateTestConfig(updatedConfig);
    
    this.tests.set(testName, updatedConfig);
    this.emit('test:updated', { testName, config: updatedConfig });
  }

  /**
   * Determine if user should participate in WASM testing
   */
  shouldUseWASM(testName: string, userContext: UserContext): boolean {
    const config = this.tests.get(testName);
    if (!config || !config.enabled) {
      return false;
    }

    // Check if user already has assignment
    const userTests = this.userAssignments.get(userContext.userId);
    if (userTests?.has(testName)) {
      return userTests.get(testName)!;
    }

    // Check user criteria
    if (!this.matchesUserCriteria(userContext, config.targetCriteria)) {
      this.assignUserToTest(userContext.userId, testName, false);
      return false;
    }

    // Check rollout percentage with consistent hashing
    const shouldParticipate = this.deterministicRollout(
      userContext.userId, 
      testName, 
      config.rolloutPercentage
    );

    // Store assignment
    this.assignUserToTest(userContext.userId, testName, shouldParticipate);

    return shouldParticipate;
  }

  /**
   * Get test results
   */
  getTestResult(testName: string): ABTestResult | undefined {
    return this.testResults.get(testName);
  }

  /**
   * Get all active tests
   */
  getActiveTests(): { name: string; config: ABTestConfig; result: ABTestResult }[] {
    const activeTests: { name: string; config: ABTestConfig; result: ABTestResult }[] = [];
    
    for (const [name, config] of this.tests) {
      if (config.enabled) {
        const result = this.testResults.get(name);
        if (result) {
          activeTests.push({ name, config, result });
        }
      }
    }
    
    return activeTests;
  }

  /**
   * Stop a test
   */
  stopTest(testName: string, reason: string = 'Manual stop'): void {
    const result = this.testResults.get(testName);
    if (!result) {
      throw new Error(`Test '${testName}' not found`);
    }

    result.status = 'stopped';
    result.endTime = Date.now();

    const config = this.tests.get(testName)!;
    config.enabled = false;

    this.emit('test:stopped', { testName, reason, result });
  }

  /**
   * Evaluate test performance and make recommendations
   */
  evaluateTest(testName: string): ABTestResult | undefined {
    const result = this.testResults.get(testName);
    const config = this.tests.get(testName);
    
    if (!result || !config) {
      return undefined;
    }

    // Update metrics from performance monitor
    this.updateTestMetricsFromMonitor(testName);

    // Evaluate success criteria
    const evaluation = this.evaluateSuccessCriteria(result, config);
    result.evaluation = evaluation;

    // Check safeguards
    this.checkSafeguards(testName, result, config);

    this.emit('test:evaluated', { testName, result });
    return result;
  }

  /**
   * Check if user matches targeting criteria
   */
  private matchesUserCriteria(userContext: UserContext, criteria?: UserCriteria): boolean {
    if (!criteria) return true;

    // Include/exclude user IDs
    if (criteria.includeUserIds && !criteria.includeUserIds.includes(userContext.userId)) {
      return false;
    }
    if (criteria.excludeUserIds && criteria.excludeUserIds.includes(userContext.userId)) {
      return false;
    }

    // Country targeting
    if (criteria.includeCountries && userContext.country) {
      if (!criteria.includeCountries.includes(userContext.country)) {
        return false;
      }
    }
    if (criteria.excludeCountries && userContext.country) {
      if (criteria.excludeCountries.includes(userContext.country)) {
        return false;
      }
    }

    // Browser version requirements
    if (criteria.browserVersions && userContext.browser) {
      const minVersion = criteria.browserVersions[userContext.browser.name];
      if (minVersion && !this.versionMeetsRequirement(userContext.browser.version, minVersion)) {
        return false;
      }
    }

    // Device type targeting
    if (criteria.deviceTypes && userContext.deviceType) {
      if (!criteria.deviceTypes.includes(userContext.deviceType)) {
        return false;
      }
    }

    // Performance profile targeting
    if (criteria.performanceProfile && userContext.performanceProfile) {
      if (criteria.performanceProfile !== userContext.performanceProfile) {
        return false;
      }
    }

    return true;
  }

  /**
   * Deterministic rollout based on user ID and test name
   */
  private deterministicRollout(userId: string, testName: string, percentage: number): boolean {
    // Create consistent hash from userId + testName
    const hash = this.simpleHash(userId + testName);
    const bucket = hash % 100;
    return bucket < percentage;
  }

  /**
   * Simple hash function for consistent user bucketing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if version meets requirement
   */
  private versionMeetsRequirement(currentVersion: string, minVersion: string): boolean {
    const current = currentVersion.split('.').map(Number);
    const required = minVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(current.length, required.length); i++) {
      const currentPart = current[i] || 0;
      const requiredPart = required[i] || 0;
      
      if (currentPart > requiredPart) return true;
      if (currentPart < requiredPart) return false;
    }
    
    return true; // Equal versions
  }

  /**
   * Assign user to test group
   */
  private assignUserToTest(userId: string, testName: string, inTest: boolean): void {
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }
    
    this.userAssignments.get(userId)!.set(testName, inTest);
  }

  /**
   * Update test metrics from individual operation
   */
  private updateTestMetrics(metric: WASMOperationMetrics): void {
    // Find which tests this metric belongs to
    for (const [testName, result] of this.testResults) {
      if (result.status === 'running') {
        this.updateTestResult(result, metric);
      }
    }
  }

  /**
   * Update test result with new metric
   */
  private updateTestResult(result: ABTestResult, metric: WASMOperationMetrics): void {
    result.metrics.totalOperations++;
    
    if (metric.usedWasm) {
      result.metrics.wasmOperations++;
    } else {
      result.metrics.fallbackOperations++;
    }

    // Recalculate rates
    result.metrics.successRate = result.metrics.totalOperations > 0 ? 
      (result.metrics.totalOperations - this.getErrorCount(result)) / result.metrics.totalOperations : 0;
    
    result.metrics.errorRate = result.metrics.totalOperations > 0 ?
      this.getErrorCount(result) / result.metrics.totalOperations : 0;

    // Update latency (rolling average)
    const duration = metric.wasmDuration || metric.fallbackDuration || 0;
    result.metrics.averageLatency = this.updateRollingAverage(
      result.metrics.averageLatency,
      duration,
      result.metrics.totalOperations
    );
  }

  /**
   * Update test metrics from performance monitor
   */
  private updateTestMetricsFromMonitor(testName: string): void {
    const analysis = this.performanceMonitor.getCurrentAnalysis();
    if (!analysis) return;

    const result = this.testResults.get(testName);
    if (!result) return;

    // Update performance gain from monitor data
    result.metrics.averagePerformanceGain = analysis.summary.averagePerformanceGain;
  }

  /**
   * Evaluate success criteria
   */
  private evaluateSuccessCriteria(result: ABTestResult, config: ABTestConfig): ABTestResult['evaluation'] {
    const criteria = config.successCriteria;
    const criteriaMet: string[] = [];
    const criteriaFailed: string[] = [];

    // Check minimum sample size
    if (result.metrics.totalOperations >= criteria.minSampleSize) {
      criteriaMet.push('minimum sample size');
    } else {
      criteriaFailed.push(`minimum sample size (${result.metrics.totalOperations}/${criteria.minSampleSize})`);
    }

    // Check success rate
    if (result.metrics.successRate >= criteria.minSuccessRate) {
      criteriaMet.push('minimum success rate');
    } else {
      criteriaFailed.push(`minimum success rate (${(result.metrics.successRate * 100).toFixed(1)}%/${(criteria.minSuccessRate * 100).toFixed(1)}%)`);
    }

    // Check error rate
    if (result.metrics.errorRate <= criteria.maxErrorRate) {
      criteriaMet.push('maximum error rate');
    } else {
      criteriaFailed.push(`maximum error rate (${(result.metrics.errorRate * 100).toFixed(1)}%/${(criteria.maxErrorRate * 100).toFixed(1)}%)`);
    }

    // Check performance gain
    if (result.metrics.averagePerformanceGain >= criteria.minPerformanceGain) {
      criteriaMet.push('minimum performance gain');
    } else {
      criteriaFailed.push(`minimum performance gain (${result.metrics.averagePerformanceGain.toFixed(1)}%/${criteria.minPerformanceGain}%)`);
    }

    // Determine recommendation
    let recommendation: 'continue' | 'stop' | 'expand' | 'rollback' = 'continue';
    const meetsCriteria = criteriaFailed.length === 0 && criteriaMet.length > 0;

    if (meetsCriteria && result.metrics.totalOperations >= criteria.minSampleSize) {
      recommendation = 'expand';
    } else if (criteriaFailed.length > criteriaMet.length) {
      recommendation = 'rollback';
    } else if (result.metrics.errorRate > criteria.maxErrorRate * 2) {
      recommendation = 'stop';
    }

    return {
      meetsCriteria,
      criteriaMet,
      criteriaFailed,
      recommendation
    };
  }

  /**
   * Check safeguards and auto-stop if needed
   */
  private checkSafeguards(testName: string, result: ABTestResult, config: ABTestConfig): void {
    const safeguards = config.safeguards;

    // Auto-stop on high error rate
    if (safeguards.autoStopOnHighErrorRate && 
        result.metrics.errorRate > safeguards.errorRateThreshold) {
      this.stopTest(testName, `Auto-stopped: error rate ${(result.metrics.errorRate * 100).toFixed(1)}% exceeds threshold`);
      return;
    }

    // Auto-stop on performance regression
    if (result.metrics.averagePerformanceGain < -safeguards.performanceRegressionThreshold) {
      this.stopTest(testName, `Auto-stopped: performance regression ${result.metrics.averagePerformanceGain.toFixed(1)}%`);
      return;
    }

    // Auto-stop on max time
    if (safeguards.maxAutoRollbackTime && 
        Date.now() - result.startTime > safeguards.maxAutoRollbackTime) {
      this.stopTest(testName, 'Auto-stopped: maximum test duration reached');
      return;
    }
  }

  /**
   * Start periodic evaluation
   */
  private startPeriodicEvaluation(): void {
    this.evaluationInterval = window.setInterval(() => {
      for (const testName of this.tests.keys()) {
        this.evaluateTest(testName);
      }
    }, 60000); // Every minute
  }

  /**
   * Validate test configuration
   */
  private validateTestConfig(config: ABTestConfig): void {
    if (config.rolloutPercentage < 0 || config.rolloutPercentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    if (config.successCriteria.minSuccessRate < 0 || config.successCriteria.minSuccessRate > 1) {
      throw new Error('Min success rate must be between 0 and 1');
    }

    if (config.successCriteria.maxErrorRate < 0 || config.successCriteria.maxErrorRate > 1) {
      throw new Error('Max error rate must be between 0 and 1');
    }
  }

  /**
   * Get error count for test result
   */
  private getErrorCount(result: ABTestResult): number {
    return Math.round(result.metrics.totalOperations * result.metrics.errorRate);
  }

  /**
   * Update rolling average
   */
  private updateRollingAverage(currentAvg: number, newValue: number, count: number): number {
    if (count === 1) return newValue;
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  /**
   * Destroy the testing framework
   */
  destroy(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }
    
    this.removeAllListeners();
    this.tests.clear();
    this.testResults.clear();
    this.userAssignments.clear();
  }
}