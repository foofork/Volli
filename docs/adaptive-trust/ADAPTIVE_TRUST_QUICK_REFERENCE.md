# Adaptive Trust System - Quick Reference Card

## For Implementation Teams

### Starting a New Component? Check These:

1. **Your task in**: [Implementation Workflow](./ADAPTIVE_TRUST_IMPLEMENTATION_WORKFLOW.md)
2. **Your interfaces in**: [API Contracts](./ADAPTIVE_TRUST_API_CONTRACTS.md)
3. **Your architecture in**: [Architecture Design](./ADAPTIVE_TRUST_ARCHITECTURE_DESIGN.md)

### Component Quick Links

#### Trust Manager
- Interface: [API Contracts - Trust Manager](./ADAPTIVE_TRUST_API_CONTRACTS.md#1-trust-manager-api)
- Design: [Architecture - Trust Manager](./ADAPTIVE_TRUST_ARCHITECTURE_DESIGN.md#1-trust-manager)
- State: [Data Flow - State Management](./ADAPTIVE_TRUST_DATA_FLOW.md#state-management-architecture)

#### Rule Engine
- Interface: [API Contracts - Rule Engine](./ADAPTIVE_TRUST_API_CONTRACTS.md#2-rule-engine-api)
- Design: [Architecture - Rule Engine](./ADAPTIVE_TRUST_ARCHITECTURE_DESIGN.md#2-rule-engine)
- Research: [Rule Conflict Resolution](./research/RULE_CONFLICT_RESOLUTION.md)

#### Context Detector
- Interface: [API Contracts - Context Detector](./ADAPTIVE_TRUST_API_CONTRACTS.md#3-context-detector-api)
- Design: [Architecture - Context Detector](./ADAPTIVE_TRUST_ARCHITECTURE_DESIGN.md#3-context-detector)
- Research: [Network Trust](./research/NETWORK_TRUST_CLASSIFICATION.md) | [Sensitivity](./research/CONTENT_SENSITIVITY_DETECTION.md)

#### Connection Manager
- Strategy: [Connection Strategy](./ADAPTIVE_TRUST_CONNECTION_STRATEGY.md)
- Research: [Battery Efficiency](./research/BATTERY_EFFICIENT_P2P_DISCOVERY.md)
- Integration: [Architecture - Connection Management](./ADAPTIVE_TRUST_ARCHITECTURE_DESIGN.md#5-connection-management-integration)

#### UI Components
- Interfaces: [API Contracts - UI Components](./ADAPTIVE_TRUST_API_CONTRACTS.md#5-ui-component-apis)
- Research: [Trust Visualization](./research/TRUST_VISUALIZATION_UI_PATTERNS.md)
- Integration: [Integration Guide - UI](./ADAPTIVE_TRUST_INTEGRATION.md#6-ui-component-integration)

#### Database
- Schema: [Database Schema](./ADAPTIVE_TRUST_DATABASE_SCHEMA.md)
- Connection Strategy: [Unified Schema Approach](./ADAPTIVE_TRUST_CONNECTION_STRATEGY.md#database-design)

### Key Design Principles

1. **User Sovereignty**: User rules ALWAYS win
2. **Performance Budgets**: < 5% battery, < 5% CPU, < 200MB memory
3. **Unified Schema**: All connection types use same tables
4. **Privacy First**: No persistent profiles, local processing only
5. **Progressive Enhancement**: Don't break existing functionality

### Common Patterns

#### Error Handling
```typescript
throw new TrustError('message', 'ERROR_CODE', { details });
```

#### State Updates
```typescript
trustStore.update(state => ({
  ...state,
  trust: { ...state.trust, currentMode: mode }
}));
```

#### Event Emission
```typescript
this.eventBus.emit({
  type: 'mode-changed',
  payload: { newMode, oldMode, source }
});
```

#### Performance Monitoring
```typescript
await performanceMonitor.measure('operation', async () => {
  // Your code here
});
```

### Testing Requirements (SPARC TDD)

**🔴 RED → 🟢 GREEN → 🔵 REFACTOR**

- Write tests FIRST (Red phase)
- Unit tests: > 80% coverage
- Integration tests: Required
- Performance tests: Must meet budgets
- Type safety: No `any` types

```bash
# TDD workflow
npm run test:watch    # Keep running
npm run test:coverage # Check coverage
npx claude-flow sparc tdd "feature name" # Get TDD help
```

### File Structure

```
packages/adaptive-trust/
├── src/
│   ├── index.ts          # Public exports
│   ├── types/            # Type definitions
│   ├── core/             # Trust Manager, Mode Selector
│   ├── rules/            # Rule Engine, Conflict Resolver
│   ├── context/          # Context Detector, Analyzers
│   ├── discovery/        # Connection Manager, Strategies
│   ├── stores/           # Svelte stores
│   ├── ui/               # Svelte components
│   ├── db/               # Database, repositories
│   └── utils/            # Helpers, monitoring
└── tests/
    ├── unit/             # Component tests
    └── integration/      # System tests
```

### Git Workflow

1. Create feature branch: `feature/trust-<component>`
2. Commit message format: `feat(trust): implement <component>`
3. PR title: `[Trust System] Add <component>`
4. Required reviews: 1
5. Required checks: Tests, Types, Lint

### Getting Help

- Architecture questions → Review design docs
- Interface questions → Check API contracts
- Implementation details → See research docs
- Integration issues → Check integration guide
- Performance concerns → Review monitoring research

### Performance Checklist

Before committing:
- [ ] Measure CPU usage (< 5% average)
- [ ] Check memory allocation (< 5MB per operation)
- [ ] Verify no blocking operations
- [ ] Test battery impact
- [ ] Profile with DevTools

### Remember

- User rules are LAW
- Performance budgets are STRICT
- Privacy is NON-NEGOTIABLE
- Tests are REQUIRED
- Documentation is MANDATORY