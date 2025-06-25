# Adaptive Trust - Simple Agent Tasks

## Agent 1: Types & Database
```
Create packages/adaptive-trust with TypeScript types from API_REFERENCE.md and Dexie schema for trust_decisions, user_rules, context_cache tables
```

## Agent 2: Rule Engine  
```
Build rule evaluation that checks mandatory→user→system rules in priority order with conflict detection
```

## Agent 3: Context Detector
```
Detect network type/trust, device battery/performance, and behavior patterns (session-only) with 60s caching
```

## Agent 4: Trust Manager
```
Orchestrate context→rules→decision flow in <100ms, emit events, track history (session-only)
```

## Agent 5: Connection Manager
```
Implement cached/mdns/federated/dht/relay strategies using unified schema with pooling and retry
```

## Agent 6: UI Components
```
Create TrustIndicator.svelte (☕🛡️🏰🔒), RuleBuilder.svelte, and trust store using existing ui-kit
```

## Agent 7: Integration
```
Add optional trust to VolliCore, extend network store, implement feature flags (default: off)
```

## Agent 8: Testing
```
Verify <100ms decisions, <200MB memory, <5% battery, and all security requirements from SECURITY_CHECKLIST.md
```