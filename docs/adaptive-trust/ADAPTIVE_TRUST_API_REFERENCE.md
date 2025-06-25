# Adaptive Trust System - API Reference

## Core Interfaces

### Trust Manager
```typescript
interface ITrustManager {
  // Core operations
  initialize(config: TrustConfig): Promise<void>;
  decide(options?: DecisionOptions): Promise<TrustDecision>;
  setMode(mode: TrustMode, options?: ModeOptions): Promise<void>;
  
  // State access
  getCurrentMode(): TrustMode;
  getCurrentDecision(): TrustDecision | null;
  
  // Events
  on(event: 'mode-changed', handler: (e: ModeChangedEvent) => void): void;
  on(event: 'decision-made', handler: (e: TrustDecision) => void): void;
}
```

### Rule Engine
```typescript
interface IRuleEngine {
  // Rule management
  addRule(rule: RuleInput): Promise<IRule>;
  updateRule(id: string, updates: Partial<RuleInput>): Promise<IRule>;
  deleteRule(id: string): Promise<void>;
  getRules(filter?: RuleFilter): Promise<IRule[]>;
  
  // Rule evaluation
  evaluate(context: IContext): Promise<RuleMatch | null>;
  detectConflicts(rule: IRule): Promise<RuleConflict[]>;
}
```

### Context Detector
```typescript
interface IContextDetector {
  // Context detection
  detect(options?: DetectionOptions): Promise<IContext>;
  
  // Specific detections
  detectNetwork(): Promise<NetworkContext>;
  detectDevice(): Promise<DeviceContext>;
  detectSensitivity(signals: ContentSignals): Promise<SensitivityResult>;
  
  // Subscriptions
  subscribe(handler: (context: IContext) => void): Unsubscribe;
}
```

### Connection Manager
```typescript
interface IConnectionManager {
  // Connection operations
  connect(peerId: string): Promise<Connection>;
  upgrade(connection: Connection, mode: TrustMode): Promise<Connection>;
  getStrategies(mode: TrustMode): ConnectionStrategy[];
  
  // Strategy management
  registerStrategy(strategy: IConnectionStrategy): void;
  getConnections(): Map<string, Connection>;
}
```

## Data Types

### Core Types
```typescript
enum TrustMode {
  CONVENIENCE = 'convenience',
  BALANCED = 'balanced',
  PRIVATE = 'private',
  AIRGAP = 'airgap'
}

type DecisionSource = 'user-rule' | 'user-choice' | 'adaptive' | 'default';
type NetworkTrustLevel = 'trusted' | 'public' | 'hostile' | 'unknown';
```

### Trust Decision
```typescript
interface TrustDecision {
  mode: TrustMode;
  source: DecisionSource;
  confidence: number;           // 0-1
  reasoning: string[];
  timestamp: Date;
  context: IContext;
  ruleId?: string;             // If triggered by rule
}
```

### Rule Structure
```typescript
interface IRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
  mandatory: boolean;          // Cannot be overridden
}

interface RuleCondition {
  type: 'network' | 'contact' | 'time' | 'always';
  // Type-specific properties
  [key: string]: any;
}

interface RuleAction {
  mode: TrustMode;
  notify?: boolean;
  reason?: string;
}
```

### Context Structure
```typescript
interface IContext {
  network: NetworkContext;
  device: DeviceContext;
  behavior: BehaviorContext;
  temporal: TemporalContext;
}

interface NetworkContext {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  trust: NetworkTrustLevel;
  quality: 'excellent' | 'good' | 'poor';
  isVPN: boolean;
  isTor: boolean;
}

interface DeviceContext {
  type: 'mobile' | 'desktop' | 'tablet';
  battery: {
    level: number;      // 0-1
    charging: boolean;
  };
  performance: {
    cpu: number;        // 0-1
    memory: number;     // 0-1
  };
}
```

### Connection Types
```typescript
interface Connection {
  id: string;
  peerId: string;
  strategy: string;
  state: ConnectionState;
  metadata: ConnectionMetadata;
  
  // Methods
  send(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  
  // Events
  on(event: 'data' | 'error' | 'close', handler: Function): void;
}

interface ConnectionStrategy {
  name: string;
  priority: number;
  
  isAvailable(context: IContext): Promise<boolean>;
  connect(peerId: string): Promise<Connection>;
}
```

## UI Component APIs

### Trust Indicator
```typescript
interface TrustIndicatorProps {
  mode: TrustMode;
  decision?: TrustDecision;
  onModeChange?: (mode: TrustMode) => void;
  verbosity?: 'minimal' | 'detailed';
}
```

### Rule Builder
```typescript
interface RuleBuilderProps {
  existingRules?: IRule[];
  onRuleCreate: (rule: IRule) => void;
  onConflictDetected?: (conflicts: RuleConflict[]) => void;
}
```

## Error Types
```typescript
class TrustError extends Error {
  constructor(message: string, code: string, details?: any);
}

class ValidationError extends TrustError {
  constructor(message: string, errors: ValidationIssue[]);
}

class ConflictError extends TrustError {
  constructor(message: string, conflicts: RuleConflict[]);
}
```

## Event System
```typescript
// Event types
type TrustEvent = 
  | ModeChangedEvent
  | DecisionMadeEvent  
  | RuleTriggeredEvent
  | ContextChangedEvent;

// Example event
interface ModeChangedEvent {
  type: 'mode-changed';
  payload: {
    oldMode: TrustMode;
    newMode: TrustMode;
    source: DecisionSource;
    timestamp: Date;
  };
}
```

## Usage Examples

### Basic Usage
```typescript
// Initialize
const trustManager = new TrustManager(config);
await trustManager.initialize();

// Make decision
const decision = await trustManager.decide();
console.log(`Using ${decision.mode} mode`);

// Add rule
await trustManager.rules.addRule({
  name: 'Public WiFi Protection',
  condition: { type: 'network', networkTrust: 'public' },
  action: { mode: TrustMode.PRIVATE }
});
```

### Event Handling
```typescript
trustManager.on('mode-changed', (event) => {
  console.log(`Mode changed: ${event.payload.oldMode} → ${event.payload.newMode}`);
});
```

### Connection Management
```typescript
const connection = await connectionManager.connect('peer-123');
console.log(`Connected via ${connection.strategy}`);
```

## Next: [Implementation Guide](./ADAPTIVE_TRUST_IMPLEMENTATION_GUIDE.md)