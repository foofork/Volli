# Adaptive Trust System - API Contracts & Interfaces

## Overview

This document defines the complete API contracts and interfaces for the Adaptive Trust System, ensuring clear boundaries between components and predictable behavior.

## Core Type Definitions

```typescript
// packages/adaptive-trust/src/types/core.ts

/**
 * Trust modes available in the system
 */
export enum TrustMode {
  CONVENIENCE = 'convenience',
  BALANCED = 'balanced',
  PRIVATE = 'private',
  AIRGAP = 'airgap'
}

/**
 * Source of a trust decision
 */
export type DecisionSource = 
  | 'user-rule'      // User-defined rule triggered
  | 'user-choice'    // User manually selected
  | 'adaptive'       // System suggestion accepted
  | 'default';       // Fallback to default mode

/**
 * Network trust levels
 */
export type NetworkTrustLevel = 
  | 'trusted'        // Home/work networks
  | 'public'         // Public WiFi, cellular
  | 'hostile'        // Known bad networks
  | 'unknown';       // Unclassified

/**
 * Result of a trust decision
 */
export interface TrustDecision {
  mode: TrustMode;
  source: DecisionSource;
  confidence: number;          // 0-1 confidence score
  reasoning: string[];         // Human-readable explanation
  timestamp: Date;
  expiresAt?: Date;           // When to re-evaluate
  ruleId?: string;            // If triggered by rule
  context: IContext;          // Context snapshot
}
```

## Component Interfaces

### 1. Trust Manager API

```typescript
// packages/adaptive-trust/src/interfaces/trust-manager.ts

export interface ITrustManager {
  /**
   * Initialize the trust system
   * @param config - User configuration
   * @throws {Error} If initialization fails
   */
  initialize(config: TrustConfig): Promise<void>;
  
  /**
   * Get trust decision for current context
   * @param options - Optional decision parameters
   * @returns Trust decision with reasoning
   */
  decide(options?: DecisionOptions): Promise<TrustDecision>;
  
  /**
   * Get trust decision for specific context
   * @param context - Specific context to evaluate
   * @returns Trust decision with reasoning
   */
  decideForContext(context: IContext): Promise<TrustDecision>;
  
  /**
   * Set trust mode explicitly
   * @param mode - Target trust mode
   * @param options - Mode change options
   * @emits mode-changed
   */
  setMode(mode: TrustMode, options?: ModeChangeOptions): Promise<void>;
  
  /**
   * Get current trust mode
   * @returns Current active mode
   */
  getCurrentMode(): TrustMode;
  
  /**
   * Get current trust decision
   * @returns Current decision or null
   */
  getCurrentDecision(): TrustDecision | null;
  
  /**
   * Subscribe to trust events
   */
  on(event: 'mode-changed', handler: ModeChangedHandler): void;
  on(event: 'decision-made', handler: DecisionMadeHandler): void;
  on(event: 'rule-triggered', handler: RuleTriggeredHandler): void;
  
  /**
   * Unsubscribe from events
   */
  off(event: string, handler: Function): void;
  
  /**
   * Destroy and cleanup
   */
  destroy(): Promise<void>;
}

// Supporting types
export interface DecisionOptions {
  skipCache?: boolean;
  timeout?: number;
  peerId?: string;
}

export interface ModeChangeOptions {
  reason?: string;
  duration?: number;        // Temporary mode change
  notifyUser?: boolean;
}

export type ModeChangedHandler = (event: {
  oldMode: TrustMode;
  newMode: TrustMode;
  source: DecisionSource;
  reason?: string;
}) => void;

export type DecisionMadeHandler = (decision: TrustDecision) => void;

export type RuleTriggeredHandler = (event: {
  rule: IRule;
  context: IContext;
  action: RuleAction;
}) => void;
```

### 2. Rule Engine API

```typescript
// packages/adaptive-trust/src/interfaces/rule-engine.ts

export interface IRuleEngine {
  /**
   * Add a new rule
   * @param rule - Rule definition without ID
   * @returns Created rule with ID
   * @throws {ValidationError} If rule is invalid
   * @throws {ConflictError} If unresolvable conflicts
   */
  addRule(rule: RuleInput): Promise<IRule>;
  
  /**
   * Update existing rule
   * @param id - Rule ID
   * @param updates - Partial rule updates
   * @returns Updated rule
   * @throws {NotFoundError} If rule doesn't exist
   */
  updateRule(id: string, updates: Partial<RuleInput>): Promise<IRule>;
  
  /**
   * Delete a rule
   * @param id - Rule ID
   * @throws {NotFoundError} If rule doesn't exist
   */
  deleteRule(id: string): Promise<void>;
  
  /**
   * Get all rules
   * @param filter - Optional filter
   * @returns List of rules
   */
  getRules(filter?: RuleFilter): Promise<IRule[]>;
  
  /**
   * Get a specific rule
   * @param id - Rule ID
   * @returns Rule or null
   */
  getRule(id: string): Promise<IRule | null>;
  
  /**
   * Evaluate rules for context
   * @param context - Current context
   * @returns Matching rule or null
   */
  evaluate(context: IContext): Promise<RuleMatch | null>;
  
  /**
   * Test rules without applying
   * @param context - Test context
   * @returns All matching rules
   */
  test(context: IContext): Promise<RuleTestResult[]>;
  
  /**
   * Detect conflicts with existing rules
   * @param rule - Rule to check
   * @returns List of conflicts
   */
  detectConflicts(rule: RuleInput | IRule): Promise<RuleConflict[]>;
  
  /**
   * Validate rule syntax
   * @param rule - Rule to validate
   * @returns Validation result
   */
  validate(rule: RuleInput): ValidationResult;
  
  /**
   * Import rules from export
   * @param data - Exported rules data
   * @param options - Import options
   * @returns Import result
   */
  import(data: RuleExport, options?: ImportOptions): Promise<ImportResult>;
  
  /**
   * Export rules
   * @param filter - Optional filter
   * @returns Exportable rules data
   */
  export(filter?: RuleFilter): Promise<RuleExport>;
}

// Supporting types
export interface IRule {
  id: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
  mandatory: boolean;       // Cannot be overridden
  tags: string[];
  createdAt: Date;
  modifiedAt: Date;
}

export interface RuleInput {
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  priority?: number;
  enabled?: boolean;
  mandatory?: boolean;
  tags?: string[];
}

export interface RuleMatch {
  rule: IRule;
  confidence: number;
  specificity: number;
}

export interface RuleConflict {
  rule1: IRule;
  rule2: IRule;
  type: 'action' | 'overlap' | 'contradiction';
  overlap: RuleCondition;
  severity: 'low' | 'medium' | 'high';
  suggestion?: ConflictResolution;
}
```

### 3. Context Detector API

```typescript
// packages/adaptive-trust/src/interfaces/context-detector.ts

export interface IContextDetector {
  /**
   * Detect current context
   * @param options - Detection options
   * @returns Current context
   */
  detect(options?: DetectionOptions): Promise<IContext>;
  
  /**
   * Get specific context aspect
   */
  detectNetwork(): Promise<NetworkContext>;
  detectDevice(): Promise<DeviceContext>;
  detectBehavior(): Promise<BehaviorContext>;
  detectTemporal(): Promise<TemporalContext>;
  
  /**
   * Detect content sensitivity
   * @param signals - Content signals
   * @returns Sensitivity score and reasoning
   */
  detectSensitivity(signals: ContentSignals): Promise<SensitivityResult>;
  
  /**
   * Subscribe to context changes
   * @param handler - Change handler
   * @returns Unsubscribe function
   */
  subscribe(handler: ContextChangeHandler): Unsubscribe;
  
  /**
   * Force context refresh
   */
  refresh(): Promise<void>;
}

// Context structure
export interface IContext {
  id: string;                    // Unique context ID
  timestamp: Date;
  network: NetworkContext;
  device: DeviceContext;
  behavior: BehaviorContext;
  temporal: TemporalContext;
  conversation?: ConversationContext;
  location?: LocationContext;
}

export interface NetworkContext {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  trust: NetworkTrustLevel;
  quality: 'excellent' | 'good' | 'poor';
  ssid?: string;
  fingerprint?: string;
  isVPN: boolean;
  isTor: boolean;
  isCaptivePortal: boolean;
}

export interface DeviceContext {
  type: 'mobile' | 'desktop' | 'tablet';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';
  battery: {
    level: number;           // 0-1
    charging: boolean;
    saver: boolean;
  };
  performance: {
    cpu: number;            // 0-1 load
    memory: number;         // 0-1 usage
    throttled: boolean;
  };
}

export interface BehaviorContext {
  recentActivity: ActivitySummary;
  sensitivityHint: number;      // 0-1
  interactionPattern: 'active' | 'passive' | 'sporadic';
  anomalyScore: number;         // 0-1
}
```

### 4. Connection Management API

```typescript
// packages/adaptive-trust/src/interfaces/connection-manager.ts

export interface IAdaptiveConnectionManager {
  /**
   * Connect to peer with trust awareness
   * @param peerId - Target peer ID
   * @param options - Connection options
   * @returns Established connection
   */
  connect(peerId: string, options?: ConnectionOptions): Promise<IConnection>;
  
  /**
   * Upgrade existing connection
   * @param connection - Current connection
   * @param targetMode - Target trust mode
   * @returns Upgraded connection
   */
  upgrade(connection: IConnection, targetMode: TrustMode): Promise<IConnection>;
  
  /**
   * Get optimal strategies for mode
   * @param mode - Trust mode
   * @returns Ordered list of strategies
   */
  getStrategies(mode: TrustMode): ConnectionStrategy[];
  
  /**
   * Register custom strategy
   * @param strategy - Strategy implementation
   */
  registerStrategy(strategy: IConnectionStrategy): void;
  
  /**
   * Get active connections
   * @returns Map of peer ID to connection
   */
  getConnections(): Map<string, IConnection>;
}

export interface IConnection {
  id: string;
  peerId: string;
  state: ConnectionState;
  strategy: string;
  metadata: ConnectionMetadata;
  metrics: ConnectionMetrics;
  
  send(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  
  on(event: 'data', handler: (data: Uint8Array) => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: 'close', handler: () => void): void;
}

export interface ConnectionMetadata {
  trustMode: TrustMode;
  trustSource: DecisionSource;
  establishedAt: Date;
  upgraded: boolean;
  upgradeAvailable: boolean;
}

export interface IConnectionStrategy {
  name: string;
  priority: number;
  
  /**
   * Check if strategy is available
   */
  isAvailable(context: IContext): Promise<boolean>;
  
  /**
   * Estimate connection time
   */
  estimateLatency(peerId: string): Promise<number>;
  
  /**
   * Attempt connection
   */
  connect(peerId: string, options?: any): Promise<IConnection>;
}
```

### 5. UI Component APIs

```typescript
// packages/adaptive-trust/src/interfaces/ui-components.ts

/**
 * Trust Indicator Component API
 */
export interface TrustIndicatorAPI {
  /**
   * Update indicator state
   */
  update(state: TrustIndicatorState): void;
  
  /**
   * Show/hide indicator
   */
  setVisible(visible: boolean): void;
  
  /**
   * Set verbosity level
   */
  setVerbosity(level: 'minimal' | 'normal' | 'detailed'): void;
  
  /**
   * Trigger animation
   */
  animate(type: 'pulse' | 'transition' | 'alert'): void;
}

export interface TrustIndicatorState {
  mode: TrustMode;
  source: DecisionSource;
  locked: boolean;              // User rule active
  upgradeAvailable: boolean;
  alert?: TrustAlert;
}

/**
 * Rule Builder Component API
 */
export interface RuleBuilderAPI {
  /**
   * Open rule builder
   */
  open(options?: RuleBuilderOptions): Promise<IRule | null>;
  
  /**
   * Edit existing rule
   */
  edit(rule: IRule): Promise<IRule | null>;
  
  /**
   * Set available templates
   */
  setTemplates(templates: RuleTemplate[]): void;
  
  /**
   * Validate rule in real-time
   */
  validate(rule: Partial<RuleInput>): ValidationResult;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  rule: Partial<RuleInput>;
  examples: string[];
}

/**
 * Mode Selector Component API  
 */
export interface ModeSelectorAPI {
  /**
   * Open mode selector
   */
  open(options?: ModeSelectorOptions): Promise<TrustMode | null>;
  
  /**
   * Update available modes
   */
  setModes(modes: ModeOption[]): void;
  
  /**
   * Highlight recommended mode
   */
  setRecommended(mode: TrustMode, reason?: string): void;
}

export interface ModeOption {
  mode: TrustMode;
  name: string;
  description: string;
  icon: string;
  color: string;
  disabled?: boolean;
  disabledReason?: string;
}
```

## Event System

```typescript
// packages/adaptive-trust/src/interfaces/events.ts

/**
 * Global event bus for trust system
 */
export interface ITrustEventBus {
  emit<T extends TrustEvent>(event: T): void;
  on<T extends TrustEvent>(type: T['type'], handler: (event: T) => void): void;
  off<T extends TrustEvent>(type: T['type'], handler: (event: T) => void): void;
  once<T extends TrustEvent>(type: T['type'], handler: (event: T) => void): void;
}

// Event types
export type TrustEvent = 
  | ModeChangedEvent
  | DecisionMadeEvent
  | RuleTriggeredEvent
  | ConflictDetectedEvent
  | ContextChangedEvent
  | ConnectionUpgradedEvent
  | SensitivityDetectedEvent;

export interface ModeChangedEvent {
  type: 'mode-changed';
  payload: {
    oldMode: TrustMode;
    newMode: TrustMode;
    source: DecisionSource;
    reason?: string;
    timestamp: Date;
  };
}

export interface DecisionMadeEvent {
  type: 'decision-made';
  payload: {
    decision: TrustDecision;
    applied: boolean;
  };
}

export interface RuleTriggeredEvent {
  type: 'rule-triggered';
  payload: {
    rule: IRule;
    context: IContext;
    result: 'applied' | 'skipped' | 'overridden';
  };
}
```

## Error Handling

```typescript
// packages/adaptive-trust/src/interfaces/errors.ts

export class TrustError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TrustError';
  }
}

export class ValidationError extends TrustError {
  constructor(message: string, public errors: ValidationIssue[]) {
    super(message, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

export class ConflictError extends TrustError {
  constructor(message: string, public conflicts: RuleConflict[]) {
    super(message, 'CONFLICT_ERROR', { conflicts });
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends TrustError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}

export interface ValidationIssue {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}
```

## Plugin System

```typescript
// packages/adaptive-trust/src/interfaces/plugins.ts

/**
 * Plugin interface for extending trust system
 */
export interface ITrustPlugin {
  name: string;
  version: string;
  
  /**
   * Initialize plugin
   */
  initialize(system: ITrustSystem): Promise<void>;
  
  /**
   * Cleanup plugin
   */
  destroy(): Promise<void>;
}

/**
 * Context detector plugin
 */
export interface IContextDetectorPlugin extends ITrustPlugin {
  /**
   * Contribute to context detection
   */
  detectContext(current: Partial<IContext>): Promise<Partial<IContext>>;
}

/**
 * Strategy plugin for connections
 */
export interface IStrategyPlugin extends ITrustPlugin {
  /**
   * Provide connection strategy
   */
  getStrategy(): IConnectionStrategy;
}

/**
 * Rule condition plugin
 */
export interface IConditionPlugin extends ITrustPlugin {
  /**
   * Register custom condition type
   */
  conditionType: string;
  
  /**
   * Evaluate custom condition
   */
  evaluate(condition: any, context: IContext): Promise<boolean>;
  
  /**
   * Validate custom condition
   */
  validate(condition: any): ValidationResult;
}
```

## Testing Utilities

```typescript
// packages/adaptive-trust/src/interfaces/testing.ts

/**
 * Test utilities for trust system
 */
export interface ITrustTestUtils {
  /**
   * Create mock context
   */
  createContext(overrides?: Partial<IContext>): IContext;
  
  /**
   * Create mock rule
   */
  createRule(overrides?: Partial<IRule>): IRule;
  
  /**
   * Create test harness
   */
  createTestHarness(config?: TestConfig): TestHarness;
}

export interface TestHarness {
  trustManager: ITrustManager;
  ruleEngine: IRuleEngine;
  contextDetector: IContextDetector;
  
  /**
   * Simulate context change
   */
  setContext(context: Partial<IContext>): Promise<void>;
  
  /**
   * Simulate user action
   */
  simulateUserAction(action: UserAction): Promise<void>;
  
  /**
   * Get event history
   */
  getEvents(): TrustEvent[];
  
  /**
   * Reset to initial state
   */
  reset(): Promise<void>;
}
```

## Usage Examples

```typescript
// Initialize trust system
const trustManager = new TrustManager({
  defaultMode: TrustMode.BALANCED,
  allowAdaptive: true,
  requireConfirmation: false
});

// Add a rule
const rule = await trustManager.ruleEngine.addRule({
  name: 'Public WiFi Privacy',
  condition: {
    type: 'network',
    networkTrust: 'public'
  },
  action: {
    mode: TrustMode.PRIVATE,
    notify: true
  },
  mandatory: true
});

// Get trust decision
const decision = await trustManager.decide();
console.log(`Using ${decision.mode} mode because: ${decision.reasoning[0]}`);

// Subscribe to changes
trustManager.on('mode-changed', (event) => {
  console.log(`Mode changed to ${event.newMode}`);
});
```

## Versioning & Compatibility

All interfaces follow semantic versioning:
- Major version: Breaking changes
- Minor version: New features (backward compatible)
- Patch version: Bug fixes

```typescript
export const API_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  toString() {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
};