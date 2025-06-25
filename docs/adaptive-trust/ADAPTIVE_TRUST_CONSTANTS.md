# Adaptive Trust System - Constants & Configuration

## Trust Modes

| Mode | Value | Icon | Description |
|------|-------|------|-------------|
| CONVENIENCE | `'convenience'` | ☕ | Fast connections, minimal privacy |
| BALANCED | `'balanced'` | 🛡️ | Good privacy/performance balance |
| PRIVATE | `'private'` | 🏰 | Maximum privacy, slower connections |
| AIRGAP | `'airgap'` | 🔒 | Local only, no internet |

## Performance Budgets

```typescript
const PERFORMANCE_BUDGETS = {
  battery: {
    daily: 5,              // % max daily drain
    hourly_active: 8,      // % per hour when active
    hourly_idle: 0.5       // % per hour when idle
  },
  cpu: {
    average: 5,            // % average usage
    spike: 25,             // % maximum spike
    decision_time: 100     // ms max for decision
  },
  memory: {
    baseline: 100,         // MB baseline usage
    peak: 200,             // MB maximum usage
    cache: 50              // MB for caches
  },
  network: {
    daily: 50,             // MB per day
    discovery: 10,         // MB for peer discovery
    sync: 20               // MB for data sync
  }
};
```

## Timeouts & Intervals

```typescript
const TIMEOUTS = {
  decision: 5000,          // 5s max decision time
  connection: 30000,       // 30s connection timeout
  context_cache: 60000,    // 60s context cache TTL
  rule_cache: 300000       // 5min rule cache TTL
};

const INTERVALS = {
  context_refresh: 60000,  // Check context every minute
  cleanup: 300000,         // Clean expired data every 5min
  performance_check: 1000  // Check performance every second
};
```

## Cache Limits

```typescript
const CACHE_LIMITS = {
  context: 10,             // Context history items
  decisions: 50,           // Decision history items
  network_profiles: 100,   // Known networks
  rules: 1000              // Maximum rules
};
```

## Default Configuration

```typescript
const DEFAULT_CONFIG: TrustConfig = {
  // Core settings
  defaultMode: 'balanced',
  allowAdaptive: false,     // Opt-in
  requireConfirmation: true,
  
  // Performance profile
  performanceProfile: 'balanced',
  
  // Privacy settings
  enableLearning: false,
  enableSensitivityDetection: false,
  
  // UI settings
  showTrustIndicator: 'on-change',
  verbosity: 'minimal'
};
```

## Error Codes

```typescript
const ERROR_CODES = {
  // Rule errors
  RULE_INVALID: 'RULE_001',
  RULE_CONFLICT: 'RULE_002',
  RULE_NOT_FOUND: 'RULE_003',
  RULE_LIMIT_EXCEEDED: 'RULE_004',
  
  // Context errors
  CONTEXT_DETECTION_FAILED: 'CTX_001',
  CONTEXT_TIMEOUT: 'CTX_002',
  
  // Connection errors
  CONNECTION_FAILED: 'CONN_001',
  CONNECTION_TIMEOUT: 'CONN_002',
  STRATEGY_UNAVAILABLE: 'CONN_003',
  
  // System errors
  NOT_INITIALIZED: 'SYS_001',
  FEATURE_DISABLED: 'SYS_002',
  PERFORMANCE_BUDGET_EXCEEDED: 'SYS_003'
};
```

## Feature Flags

```typescript
const FEATURE_FLAGS = {
  adaptiveTrust: false,
  trustUI: false,
  sensitivityDetection: false,
  dhtDiscovery: false,
  friendRelay: false,
  torRouting: false
};
```

## Strategy Priorities

```typescript
const STRATEGY_PRIORITIES = {
  'cached': 10,
  'mdns': 9,
  'federated': 8,
  'dht': 7,
  'relay': 6,
  'tor': 5,
  'qr': 4
};
```

## Rollout Phases

```typescript
const ROLLOUT_PHASES = {
  ALPHA: {
    percentage: 0,
    features: ['adaptiveTrust'],
    userGroups: ['internal']
  },
  BETA: {
    percentage: 10,
    features: ['adaptiveTrust', 'trustUI'],
    userGroups: ['beta_testers']
  },
  GA: {
    percentage: 100,
    features: ['all'],
    userGroups: ['all']
  }
};
```