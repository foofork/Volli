# Adaptive Trust Implementation - Agent Instructions

## Agent 1: Core Types & Database
**Branch**: `feature/adaptive-trust-core`

### Instructions:
```
1. Create package: packages/adaptive-trust
2. Define all TypeScript interfaces from API Reference
3. Implement Dexie database schema:
   - trust_decisions table
   - user_rules table  
   - context_cache table
4. Create constants file from CONSTANTS.md
5. Export all types and database instance
```

### Deliverables:
- `src/types/index.ts` - All interfaces
- `src/database/schema.ts` - Dexie schema
- `src/constants.ts` - All constants
- Unit tests with 100% coverage

---

## Agent 2: Rule Engine
**Branch**: `feature/adaptive-trust-rules`
**Wait for**: Agent 1 types

### Instructions:
```
1. Implement IRuleEngine interface
2. Create rule evaluation logic:
   - Mandatory rules first (priority order)
   - User rules second
   - System suggestions last
3. Add rule validation and conflict detection
4. Implement rule CRUD operations
5. Cache rules with 5min TTL
```

### Deliverables:
- `src/rules/RuleEngine.ts`
- `src/rules/RuleValidator.ts`
- `src/rules/ConflictDetector.ts`
- TDD tests (Red→Green→Refactor)

---

## Agent 3: Context Detector
**Branch**: `feature/adaptive-trust-context`
**Wait for**: Agent 1 types

### Instructions:
```
1. Implement IContextDetector interface
2. Create detectors:
   - NetworkContext (WiFi/cellular/VPN detection)
   - DeviceContext (battery/performance monitoring)
   - BehaviorContext (interaction patterns - ephemeral only!)
3. Implement 60-second caching
4. Add debouncing (100ms)
5. Performance: < 50ms detection time
```

### Deliverables:
- `src/context/ContextDetector.ts`
- `src/context/NetworkDetector.ts`
- `src/context/DeviceDetector.ts`
- Performance benchmarks in tests

---

## Agent 4: Trust Manager
**Branch**: `feature/adaptive-trust-manager`
**Wait for**: Agents 1, 2, 3

### Instructions:
```
1. Implement ITrustManager interface
2. Orchestrate decision flow:
   - Get context (cached)
   - Evaluate rules
   - Make decision
   - Emit events
3. Implement decision history (session-only)
4. Add performance monitoring (1% sampling)
5. Decision time budget: < 100ms
```

### Deliverables:
- `src/core/TrustManager.ts`
- `src/core/DecisionHistory.ts`
- `src/core/PerformanceMonitor.ts`
- Integration tests

---

## Agent 5: Connection Strategies
**Branch**: `feature/adaptive-trust-connections`
**Wait for**: Agents 1, 4

### Instructions:
```
1. Implement connection strategies:
   - CachedStrategy (local connections)
   - MDNSStrategy (local network)
   - FederatedStrategy (signal servers)
   - DHTStrategy (distributed)
   - RelayStrategy (friend relay)
2. Use unified ConnectionRecord schema
3. Implement connection pooling
4. Add retry logic with exponential backoff
```

### Deliverables:
- `src/strategies/[Strategy].ts` for each
- `src/connection/ConnectionPool.ts`
- `src/connection/RetryManager.ts`
- Network simulation tests

---

## Agent 6: UI Components
**Branch**: `feature/adaptive-trust-ui`
**Wait for**: Agent 1 types

### Instructions:
```
1. Create Svelte components:
   - TrustIndicator.svelte (mode display/selector)
   - RuleBuilder.svelte (create/edit rules)
   - TrustHistory.svelte (decision log)
2. Use existing ui-kit styles
3. Implement trust mode icons: ☕🛡️🏰🔒
4. Add animations for mode changes
5. Respect verbosity settings
```

### Deliverables:
- `src/components/*.svelte`
- `src/stores/trustStore.ts`
- Storybook stories
- Visual regression tests

---

## Agent 7: Integration & Feature Flags
**Branch**: `feature/adaptive-trust-integration`
**Wait for**: All agents

### Instructions:
```
1. Extend VolliCore with optional trust property
2. Add to network store for trust-aware connections
3. Implement feature flags:
   - adaptiveTrust: false (default)
   - trustUI: false
   - sensitivityDetection: false
4. Create migration for existing users
5. Add telemetry hooks (local-only)
```

### Deliverables:
- Update `packages/core/src/VolliCore.ts`
- Update `apps/web/src/stores/network.ts`
- `src/integration/FeatureFlags.ts`
- End-to-end tests

---

## Agent 8: Performance & Security Testing
**Branch**: `feature/adaptive-trust-testing`
**Parallel with all agents**

### Instructions:
```
1. Create performance benchmark suite:
   - Decision time < 100ms
   - Memory usage < 200MB
   - Battery drain < 5%
2. Create security test suite:
   - Input validation
   - Resource exhaustion
   - Downgrade prevention
3. Set up continuous monitoring
4. Document all findings
```

### Deliverables:
- `tests/performance/*.bench.ts`
- `tests/security/*.test.ts`
- Performance dashboard
- Security audit report

---

## Coordination Points

### Daily Sync Topics:
1. Blocked on dependencies?
2. API contract changes?
3. Performance concerns?
4. Security issues found?

### Merge Order:
1. Core Types & Database
2. Rule Engine + Context Detector (parallel)
3. Trust Manager
4. Connection Strategies + UI (parallel)
5. Integration
6. Testing throughout

### Success Metrics:
- All tests passing
- Performance budgets met
- Security checklist complete
- Feature flags working
- Zero impact when disabled