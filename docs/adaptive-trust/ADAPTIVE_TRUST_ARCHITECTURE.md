# Adaptive Trust System - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │Trust Indicator│  │Mode Selector │  │ Rule Builder    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         └─────────────────┴────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                  Adaptive Trust Core                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Trust Manager (Coordinator)             │   │
│  │  ┌─────────┐  ┌─────────────┐  ┌────────────────┐ │   │
│  │  │  Rules   │  │   Context   │  │     Mode       │ │   │
│  │  │  Engine  │  │  Detector   │  │   Selector     │ │   │
│  │  └─────────┘  └─────────────┘  └────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Connection Management Layer                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │   │
│  │  │Discovery │  │Transport │  │    Upgrade      │  │   │
│  │  │Strategies│  │  Unified │  │    Manager      │  │   │
│  │  └──────────┘  └──────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │   Existing Volli Core   │
                 └─────────────────────────┘
```

## Core Components

### 1. Trust Manager
Central coordinator that orchestrates all trust decisions.

```typescript
interface ITrustManager {
  decide(): Promise<TrustDecision>;
  setMode(mode: TrustMode): Promise<void>;
  getCurrentMode(): TrustMode;
}
```

**Responsibilities:**
- Coordinate between components
- Enforce user sovereignty
- Emit trust events
- Maintain decision history

### 2. Rule Engine
Enforces user-defined rules with absolute authority.

```typescript
interface IRuleEngine {
  evaluate(context: IContext): Promise<RuleMatch | null>;
  addRule(rule: RuleInput): Promise<IRule>;
  detectConflicts(rule: IRule): Promise<RuleConflict[]>;
}
```

**Key Features:**
- Specificity-based conflict resolution
- Rule validation and testing
- Import/export functionality

### 3. Context Detector
Gathers environmental signals for intelligent decisions.

```typescript
interface IContextDetector {
  detect(): Promise<IContext>;
  detectNetwork(): Promise<NetworkContext>;
  detectSensitivity(signals: ContentSignals): Promise<SensitivityResult>;
}
```

**Detection Capabilities:**
- Network trust classification
- Device state monitoring
- Behavioral pattern analysis
- Content sensitivity hints

### 4. Connection Manager
Unified interface for all connection strategies.

```typescript
interface IConnectionManager {
  connect(peerId: string): Promise<Connection>;
  upgrade(connection: Connection, mode: TrustMode): Promise<Connection>;
}
```

**Unified Approach:**
- All strategies return same Connection interface
- Strategy-specific details in metadata
- Ephemeral state (like DHT routing) stays in memory

## Data Architecture

### Database Schema (Unified)
All connection types share the same tables:

```typescript
// Single schema for all connection strategies
trust_decisions: {
  peer_id, mode, strategy, metadata: {
    // DHT: { node_id, hop_count }
    // Federated: { server_url, latency }
    // Relay: { relay_peer, path }
  }
}
```

### State Management
```typescript
interface GlobalTrustState {
  trust: { currentMode, currentDecision, history };
  rules: { items, conflicts, cache };
  context: { current, history, networkCache };
  connections: { active, pending, strategies };
}
```

## Key Design Patterns

### 1. User Sovereignty Pattern
```typescript
async decide(context: IContext): Promise<TrustDecision> {
  // User rules ALWAYS win
  const ruleMatch = await this.ruleEngine.evaluate(context);
  if (ruleMatch?.mandatory) {
    return this.createDecision(ruleMatch, 'user-rule');
  }
  
  // Adaptive suggestions are advisory only
  if (this.config.allowAdaptive) {
    return await this.suggestMode(context);
  }
  
  return this.getDefaultDecision();
}
```

### 2. Progressive Enhancement Pattern
```typescript
// Check feature availability
if (core.trust?.isAvailable()) {
  // Use enhanced trust features
  return await core.trust.connect(peerId);
} else {
  // Fall back to legacy
  return await core.messaging.connect(peerId);
}
```

### 3. Privacy-First Pattern
```typescript
// No persistent profiles
class SessionOnlyLearning {
  private patterns = new CountMinSketch(); // Probabilistic
  
  learn(interaction: Interaction): void {
    // Update sketch, not exact data
    this.patterns.increment(hash(interaction));
  }
  
  destroy(): void {
    // Clear all data on session end
    crypto.getRandomValues(this.patterns.buffer);
  }
}
```

## Integration Architecture

### Extension Points
1. **VolliCore**: Optional trust property
2. **Network Store**: Trust-aware connection methods
3. **Message Store**: Sensitivity detection hooks
4. **UI Layer**: Progressive trust indicators

### Feature Flags
```typescript
const config = {
  features: {
    adaptiveTrust: false,        // Start disabled
    trustUI: false,              // UI components
    sensitivityDetection: false, // Content analysis
    learningEnabled: false       // Adaptive features
  }
};
```

## Performance Architecture

### Optimization Strategies
1. **Lazy Loading**: Components load on demand
2. **Caching**: Context cached for 60 seconds
3. **Sampling**: Statistical monitoring (1-5%)
4. **Debouncing**: Context detection throttled

### Resource Budgets
```typescript
const PERFORMANCE_BUDGETS = {
  decision: { time: 100, unit: 'ms' },
  memory: { heap: 200, unit: 'MB' },
  battery: { daily: 5, unit: 'percent' },
  cpu: { average: 5, unit: 'percent' }
};
```

## Security Architecture

### Trust Boundaries
1. **User Rules**: Highest trust, never violated
2. **Local Processing**: All decisions on-device
3. **Encrypted Storage**: Sensitive data at rest
4. **Ephemeral Learning**: No persistent profiles

### Threat Model
- **Downgrade Attacks**: Prevented by mandatory rules
- **Privacy Leaks**: Mitigated by local processing
- **Profile Building**: Prevented by session-only data

## Next Steps

1. Review [API Reference](./ADAPTIVE_TRUST_API_REFERENCE.md) for interfaces
2. Follow [Implementation Guide](./ADAPTIVE_TRUST_IMPLEMENTATION_GUIDE.md)
3. Use [TDD Guide](./ADAPTIVE_TRUST_TDD_GUIDE.md) for development