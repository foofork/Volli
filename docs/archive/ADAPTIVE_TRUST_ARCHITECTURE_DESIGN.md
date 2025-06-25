# Adaptive Trust System - Detailed Architecture Design

## Overview

This document provides the detailed architectural design for Volli's Adaptive Trust System, translating research findings into concrete component specifications, interfaces, and integration points.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Volli Application                           │
├─────────────────────────────────────────────────────────────────────┤
│                      Adaptive Trust System                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐   │
│  │ Trust Manager  │  │ Rule Engine    │  │ Context Detector  │   │
│  │                │◄─┤                │◄─┤                   │   │
│  └───────┬────────┘  └───────┬────────┘  └───────┬───────────┘   │
│          │                   │                    │                 │
│  ┌───────▼────────┐  ┌──────▼─────────┐  ┌─────▼────────────┐   │
│  │ Mode Selector  │  │ Rule Storage   │  │ Signal Analyzer  │   │
│  │                │  │                │  │                  │   │
│  └───────┬────────┘  └────────────────┘  └──────────────────┘   │
│          │                                                         │
│  ┌───────▼────────────────────────────────────────────────────┐   │
│  │              Connection Management Layer                    │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │   │
│  │  │ Discovery   │  │ Transport    │  │ Upgrade        │   │   │
│  │  │ Strategies  │  │ Orchestrator │  │ Manager        │   │   │
│  │  └─────────────┘  └──────────────┘  └────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │   Existing Volli Core  │
                    │  - Messaging           │
                    │  - Encryption          │
                    │  - Storage             │
                    └────────────────────────┘
```

## Core Components

### 1. Trust Manager

**Purpose**: Central coordinator for all trust-related decisions

```typescript
interface ITrustManager {
  // Initialize with user preferences
  initialize(config: TrustConfig): Promise<void>;
  
  // Get current trust decision for a context
  getTrustDecision(context: IContext): Promise<TrustDecision>;
  
  // Handle mode changes
  setMode(mode: TrustMode, options?: ModeOptions): Promise<void>;
  
  // Event emitters
  on(event: 'mode-changed', handler: (mode: TrustMode) => void): void;
  on(event: 'decision-made', handler: (decision: TrustDecision) => void): void;
}

class TrustManager implements ITrustManager {
  private ruleEngine: IRuleEngine;
  private contextDetector: IContextDetector;
  private modeSelector: IModeSelector;
  private currentMode: TrustMode;
  private eventBus: EventEmitter;
  
  constructor(dependencies: TrustManagerDeps) {
    this.ruleEngine = dependencies.ruleEngine;
    this.contextDetector = dependencies.contextDetector;
    this.modeSelector = dependencies.modeSelector;
    this.eventBus = new EventEmitter();
  }
  
  async getTrustDecision(context: IContext): Promise<TrustDecision> {
    // 1. Check user rules first (sovereignty)
    const ruleDecision = await this.ruleEngine.evaluate(context);
    if (ruleDecision?.mandatory) {
      return this.createDecision(ruleDecision, 'user-rule');
    }
    
    // 2. Get adaptive suggestion if allowed
    if (this.config.allowAdaptive) {
      const suggestion = await this.modeSelector.suggest(context);
      
      // 3. Apply user confirmation if required
      if (this.config.requireConfirmation) {
        const confirmed = await this.promptUser(suggestion);
        if (!confirmed) return this.createDecision(this.currentMode, 'user-choice');
      }
      
      return this.createDecision(suggestion, 'adaptive');
    }
    
    // 4. Use current mode
    return this.createDecision(this.currentMode, 'default');
  }
}
```

### 2. Rule Engine

**Purpose**: Manages user-defined rules with conflict resolution

```typescript
interface IRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

interface IRuleEngine {
  // Rule management
  addRule(rule: Omit<IRule, 'id' | 'createdAt' | 'modifiedAt'>): Promise<IRule>;
  updateRule(id: string, updates: Partial<IRule>): Promise<IRule>;
  deleteRule(id: string): Promise<void>;
  getRules(): Promise<IRule[]>;
  
  // Rule evaluation
  evaluate(context: IContext): Promise<RuleMatch | null>;
  
  // Conflict detection
  detectConflicts(rule: IRule): Promise<RuleConflict[]>;
  resolveConflicts(conflicts: RuleConflict[]): Promise<Resolution>;
}

class RuleEngine implements IRuleEngine {
  private storage: IRuleStorage;
  private conflictResolver: IConflictResolver;
  private cache: RuleCache;
  
  async evaluate(context: IContext): Promise<RuleMatch | null> {
    // Get applicable rules from cache or storage
    const rules = await this.getApplicableRules(context);
    
    if (rules.length === 0) return null;
    
    if (rules.length === 1) {
      return { rule: rules[0], confidence: 1.0 };
    }
    
    // Resolve conflicts using specificity
    const resolved = await this.conflictResolver.resolve(rules, context);
    return resolved;
  }
  
  private async getApplicableRules(context: IContext): Promise<IRule[]> {
    const cacheKey = this.getCacheKey(context);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const allRules = await this.storage.getRules();
    const applicable = allRules.filter(rule => 
      this.evaluateCondition(rule.condition, context)
    );
    
    this.cache.set(cacheKey, applicable);
    return applicable;
  }
}
```

### 3. Context Detector

**Purpose**: Gathers environmental and behavioral signals

```typescript
interface IContext {
  network: NetworkContext;
  device: DeviceContext;
  behavior: BehaviorContext;
  temporal: TemporalContext;
  conversation: ConversationContext;
}

interface IContextDetector {
  // Get current context
  detect(): Promise<IContext>;
  
  // Subscribe to context changes
  subscribe(handler: (context: IContext) => void): Unsubscribe;
  
  // Specific detectors
  detectNetworkTrust(): Promise<NetworkTrustLevel>;
  detectContentSensitivity(signals: ContentSignals): Promise<SensitivityScore>;
}

class ContextDetector implements IContextDetector {
  private networkAnalyzer: INetworkAnalyzer;
  private deviceMonitor: IDeviceMonitor;
  private behaviorTracker: IBehaviorTracker;
  private cache: ContextCache;
  
  async detect(): Promise<IContext> {
    // Check cache first (60 second validity)
    const cached = this.cache.get();
    if (cached && !cached.isExpired()) {
      return cached.value;
    }
    
    // Gather all signals in parallel
    const [network, device, behavior, temporal] = await Promise.all([
      this.detectNetwork(),
      this.detectDevice(),
      this.detectBehavior(),
      this.detectTemporal()
    ]);
    
    const context: IContext = {
      network,
      device,
      behavior,
      temporal,
      conversation: this.getCurrentConversation()
    };
    
    this.cache.set(context);
    return context;
  }
  
  private async detectNetwork(): Promise<NetworkContext> {
    const info = await this.networkAnalyzer.analyze();
    
    return {
      type: info.type,
      trust: info.trustLevel,
      quality: info.quality,
      isVPN: info.vpnDetected,
      isTor: info.torDetected,
      fingerprint: info.fingerprint
    };
  }
}
```

### 4. Mode Selector

**Purpose**: Provides intelligent mode suggestions

```typescript
interface IModeSelector {
  // Suggest a mode based on context
  suggest(context: IContext): Promise<ModeSuggestion>;
  
  // Learn from user choices (privacy-preserving)
  learn(context: IContext, userChoice: TrustMode): void;
  
  // Get available modes
  getModes(): TrustMode[];
}

class AdaptiveModeSelector implements IModeSelector {
  private learner: IPrivacyLearner;
  private modes: Map<TrustMode, ModeConfig>;
  
  async suggest(context: IContext): Promise<ModeSuggestion> {
    // Calculate scores for each mode
    const scores = await this.calculateModeScores(context);
    
    // Select highest scoring mode
    const recommended = this.selectBestMode(scores);
    
    // Generate explanation
    const reasoning = this.explainChoice(recommended, context);
    
    return {
      mode: recommended,
      confidence: scores.get(recommended),
      reasoning,
      alternatives: this.getAlternatives(scores, recommended)
    };
  }
  
  private async calculateModeScores(
    context: IContext
  ): Promise<Map<TrustMode, number>> {
    const scores = new Map<TrustMode, number>();
    
    for (const [mode, config] of this.modes) {
      const score = await this.scoreMode(mode, config, context);
      scores.set(mode, score);
    }
    
    return scores;
  }
  
  private async scoreMode(
    mode: TrustMode,
    config: ModeConfig,
    context: IContext
  ): Promise<number> {
    let score = 0;
    
    // Network trust alignment
    if (context.network.trust === 'public' && mode === TrustMode.PRIVATE) {
      score += 0.3;
    }
    
    // Battery considerations
    if (context.device.battery.level < 20 && mode === TrustMode.CONVENIENCE) {
      score += 0.2;
    }
    
    // Content sensitivity
    if (context.behavior.sensitivityHint > 0.7 && mode === TrustMode.PRIVATE) {
      score += 0.4;
    }
    
    // Historical patterns (from learner)
    const historicalScore = await this.learner.getPreference(context, mode);
    score += historicalScore * 0.3;
    
    return Math.min(1.0, score);
  }
}
```

### 5. Connection Management Integration

**Purpose**: Integrates trust decisions with connection establishment

```typescript
interface IAdaptiveConnectionManager {
  // Connect with trust-aware strategy selection
  connect(peerId: string, trustDecision: TrustDecision): Promise<Connection>;
  
  // Upgrade existing connection
  upgradeConnection(connection: Connection, newMode: TrustMode): Promise<Connection>;
  
  // Get connection strategies for mode
  getStrategiesForMode(mode: TrustMode): ConnectionStrategy[];
}

class AdaptiveConnectionManager implements IAdaptiveConnectionManager {
  private strategies: Map<string, IConnectionStrategy>;
  private upgrader: IConnectionUpgrader;
  
  async connect(
    peerId: string, 
    trustDecision: TrustDecision
  ): Promise<Connection> {
    // Get strategies based on trust mode
    const strategies = this.getStrategiesForMode(trustDecision.mode);
    
    // Try strategies in order
    for (const strategy of strategies) {
      try {
        const connection = await strategy.connect(peerId);
        
        // Tag connection with trust metadata
        connection.metadata.trustMode = trustDecision.mode;
        connection.metadata.trustSource = trustDecision.source;
        
        // Schedule background upgrade if beneficial
        if (this.canUpgrade(connection, trustDecision)) {
          this.upgrader.scheduleUpgrade(connection);
        }
        
        return connection;
      } catch (err) {
        console.log(`Strategy ${strategy.name} failed, trying next`);
      }
    }
    
    throw new Error('All connection strategies failed');
  }
  
  getStrategiesForMode(mode: TrustMode): ConnectionStrategy[] {
    const strategyMap = {
      [TrustMode.CONVENIENCE]: ['federated', 'cached', 'mdns'],
      [TrustMode.BALANCED]: ['cached', 'mdns', 'dht', 'federated'],
      [TrustMode.PRIVATE]: ['cached', 'dht', 'friend-relay'],
      [TrustMode.AIRGAP]: ['qr-code', 'local-only']
    };
    
    return strategyMap[mode].map(name => this.strategies.get(name));
  }
}
```

## Data Models

### Trust Configuration

```typescript
interface TrustConfig {
  // User preferences
  defaultMode: TrustMode;
  allowAdaptive: boolean;
  requireConfirmation: boolean;
  
  // Performance settings
  performanceProfile: 'battery-saver' | 'balanced' | 'performance';
  
  // Privacy settings
  enableLearning: boolean;
  enableSensitivityDetection: boolean;
  
  // UI settings
  showTrustIndicator: 'always' | 'on-change' | 'never';
  verbosity: 'minimal' | 'normal' | 'detailed';
}
```

### Trust Decision

```typescript
interface TrustDecision {
  mode: TrustMode;
  source: 'user-rule' | 'user-choice' | 'adaptive' | 'default';
  confidence: number;
  reasoning?: string[];
  
  // Audit trail
  context: IContext;
  timestamp: Date;
  ruleId?: string;
  
  // Connection hints
  strategies: ConnectionStrategy[];
  upgradeAvailable: boolean;
}
```

### Rule Condition

```typescript
type RuleCondition = 
  | NetworkCondition
  | ContactCondition
  | TimeCondition
  | LocationCondition
  | CompoundCondition;

interface NetworkCondition {
  type: 'network';
  networkType?: 'wifi' | 'cellular' | 'ethernet';
  networkTrust?: 'trusted' | 'public' | 'unknown';
  ssid?: string;
}

interface ContactCondition {
  type: 'contact';
  contactId?: string;
  contactGroup?: string;
  contactTag?: string[];
}

interface CompoundCondition {
  type: 'and' | 'or' | 'not';
  conditions: RuleCondition[];
}
```

## State Management

### Trust State Store

```typescript
interface TrustState {
  // Current state
  currentMode: TrustMode;
  currentDecision: TrustDecision | null;
  
  // Rules
  rules: IRule[];
  ruleConflicts: RuleConflict[];
  
  // Context
  lastContext: IContext | null;
  contextHistory: CircularBuffer<IContext>;
  
  // UI state
  indicatorVisible: boolean;
  modeSelectorOpen: boolean;
  educationDismissed: string[];
}

class TrustStateManager {
  private state: TrustState;
  private subscribers: Set<StateSubscriber>;
  
  getState(): Readonly<TrustState> {
    return Object.freeze({ ...this.state });
  }
  
  updateState(updates: Partial<TrustState>): void {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    this.notifySubscribers(prevState, this.state);
  }
  
  subscribe(subscriber: StateSubscriber): Unsubscribe {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }
}
```

## Database Schema

### Rules Table

```sql
CREATE TABLE trust_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition JSON NOT NULL,
  action JSON NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rules_enabled ON trust_rules(enabled);
CREATE INDEX idx_rules_priority ON trust_rules(priority DESC);
```

### Trust History Table

```sql
CREATE TABLE trust_history (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  mode TEXT NOT NULL,
  source TEXT NOT NULL,
  context JSON NOT NULL,
  rule_id TEXT REFERENCES trust_rules(id),
  peer_id TEXT
);

CREATE INDEX idx_history_timestamp ON trust_history(timestamp DESC);
CREATE INDEX idx_history_peer ON trust_history(peer_id);
```

### Network Trust Cache

```sql
CREATE TABLE network_trust (
  fingerprint TEXT PRIMARY KEY,
  ssid TEXT,
  trust_level TEXT,
  last_seen TIMESTAMP,
  user_classified BOOLEAN DEFAULT false
);

CREATE INDEX idx_network_last_seen ON network_trust(last_seen DESC);
```

## Integration Points

### With Existing Volli Components

```typescript
// Integration with existing connection manager
class VolliConnectionManager {
  private adaptiveTrust: IAdaptiveTrustSystem;
  
  async connectToPeer(peerId: string): Promise<void> {
    // Get trust decision
    const context = await this.adaptiveTrust.getContext();
    const decision = await this.adaptiveTrust.decide(context);
    
    // Use adaptive connection
    const connection = await this.adaptiveConnect(peerId, decision);
    
    // Update UI with trust state
    this.updateTrustUI(decision);
  }
}

// Integration with message composer
class MessageComposer {
  private sensitivityDetector: ISensitivityDetector;
  
  async onComposingMessage(draft: MessageDraft): Promise<void> {
    // Detect sensitivity
    const sensitivity = await this.sensitivityDetector.analyze({
      behavior: this.captureTypingBehavior(),
      metadata: this.getMessageMetadata(draft)
    });
    
    // Suggest mode upgrade if needed
    if (sensitivity.score > 0.7) {
      this.suggestModeUpgrade(TrustMode.PRIVATE);
    }
  }
}
```

### With UI Components

```typescript
// Trust indicator integration
interface TrustIndicatorProps {
  decision: TrustDecision;
  onModeChange: (mode: TrustMode) => void;
  verbosity: 'minimal' | 'detailed';
}

// Rule builder integration  
interface RuleBuilderProps {
  existingRules: IRule[];
  onRuleCreate: (rule: IRule) => void;
  onConflictDetected: (conflicts: RuleConflict[]) => void;
}
```

## Performance Optimizations

### Lazy Loading

```typescript
class TrustSystemLoader {
  private loaded = {
    core: false,
    ruleEngine: false,
    learner: false,
    advanced: false
  };
  
  async loadCore(): Promise<ITrustManager> {
    if (!this.loaded.core) {
      const { TrustManager } = await import('./trust-manager');
      this.loaded.core = true;
    }
    return new TrustManager();
  }
  
  async loadRuleEngine(): Promise<IRuleEngine> {
    if (!this.loaded.ruleEngine) {
      const { RuleEngine } = await import('./rule-engine');
      this.loaded.ruleEngine = true;
    }
    return new RuleEngine();
  }
}
```

### Caching Strategy

```typescript
class TrustCache {
  private contextCache = new TTLCache<string, IContext>(60000); // 60s TTL
  private decisionCache = new LRUCache<string, TrustDecision>(100);
  private ruleCache = new TTLCache<string, IRule[]>(300000); // 5min TTL
  
  getCachedDecision(context: IContext): TrustDecision | null {
    const key = this.getContextKey(context);
    return this.decisionCache.get(key);
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('TrustManager', () => {
  it('should respect user rules over adaptive suggestions', async () => {
    const manager = new TrustManager({ /* deps */ });
    const context = createTestContext({ network: 'public-wifi' });
    
    // Add mandatory rule
    await manager.addRule({
      condition: { type: 'network', networkTrust: 'public' },
      action: { mode: TrustMode.PRIVATE, mandatory: true }
    });
    
    const decision = await manager.getTrustDecision(context);
    
    expect(decision.mode).toBe(TrustMode.PRIVATE);
    expect(decision.source).toBe('user-rule');
  });
});
```

### Integration Tests

```typescript
describe('Adaptive Connection Flow', () => {
  it('should establish connection using mode-appropriate strategies', async () => {
    const system = await createTestSystem();
    
    // Set mode to balanced
    await system.setMode(TrustMode.BALANCED);
    
    // Connect to peer
    const connection = await system.connect('peer-123');
    
    // Verify strategies tried in correct order
    expect(connection.strategy).toBeOneOf(['cached', 'mdns', 'dht']);
  });
});
```

## Security Considerations

1. **Rule Injection**: Validate all rule conditions to prevent code injection
2. **Privacy Leaks**: Ensure context detection doesn't expose sensitive data
3. **Downgrade Attacks**: Prevent forced downgrades to less secure modes
4. **Cache Poisoning**: Validate cached trust decisions
5. **Learning Privacy**: Ensure learning data can't identify users

## Next Steps

1. Review architecture with team
2. Create API documentation
3. Build prototype of core components
4. Performance testing framework
5. Security threat modeling