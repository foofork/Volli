# Adaptive Trust System - TDD Implementation Guide

## Overview

This guide explains how to implement the Adaptive Trust System using SPARC's Test-Driven Development (TDD) methodology. Every feature must follow the Red-Green-Refactor cycle.

## Team Coordination

**Before starting ANY component:**
1. **Claim your work** to prevent conflicts (see [Implementation Guide](./ADAPTIVE_TRUST_IMPLEMENTATION_GUIDE.md#team-coordination-protocol))
2. Create feature branch: `feature/adaptive-trust-<component>`
3. Mark status: "🚧 IN PROGRESS - @username" in docs

## SPARC TDD Methodology

### The Cycle
1. **🔴 RED**: Write failing tests first
2. **🟢 GREEN**: Implement minimal code to pass tests
3. **🔵 REFACTOR**: Optimize and clean up code
4. **🔁 REPEAT**: Continue until feature is complete

## TDD Commands for Adaptive Trust

### Running Tests
```bash
# Run all tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- tests/unit/core/TrustManager.test.ts

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### SPARC Commands
```bash
# Start TDD cycle for a feature
npx claude-flow sparc tdd "implement trust manager decide method"

# Get TDD guidance
npx claude-flow sparc run tdd "write tests for rule engine"
```

## Component Implementation Pattern

### Step 1: Write Interface Tests (RED) 🔴

Start by testing the public interface:

```typescript
// tests/unit/core/TrustManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TrustManager } from '../../../src/core/TrustManager';
import type { ITrustManager, TrustConfig } from '../../../src/interfaces';

describe('TrustManager', () => {
  let manager: ITrustManager;
  let config: TrustConfig;
  
  beforeEach(() => {
    config = {
      defaultMode: TrustMode.BALANCED,
      allowAdaptive: true,
      requireConfirmation: false
    };
    manager = new TrustManager(config);
  });
  
  describe('initialization', () => {
    it('should initialize with provided config', async () => {
      await expect(manager.initialize(config)).resolves.not.toThrow();
    });
    
    it('should start with default mode', () => {
      expect(manager.getCurrentMode()).toBe(TrustMode.BALANCED);
    });
  });
  
  describe('decide()', () => {
    it('should return a trust decision', async () => {
      const decision = await manager.decide();
      
      expect(decision).toMatchObject({
        mode: expect.any(String),
        source: expect.any(String),
        confidence: expect.any(Number),
        reasoning: expect.any(Array),
        timestamp: expect.any(Date)
      });
    });
    
    it('should respect user rules over adaptive suggestions', async () => {
      // Add a mandatory rule
      await manager.rules.addRule({
        name: 'Force Private',
        condition: { type: 'always' },
        action: { mode: TrustMode.PRIVATE },
        mandatory: true
      });
      
      const decision = await manager.decide();
      expect(decision.mode).toBe(TrustMode.PRIVATE);
      expect(decision.source).toBe('user-rule');
    });
  });
});
```

### Step 2: Implement Minimal Code (GREEN) 🟢

Write just enough code to make tests pass:

```typescript
// src/core/TrustManager.ts
import type { ITrustManager, TrustConfig, TrustDecision } from '../interfaces';

export class TrustManager implements ITrustManager {
  private config: TrustConfig;
  private currentMode: TrustMode;
  
  constructor(config: TrustConfig) {
    this.config = config;
    this.currentMode = config.defaultMode;
  }
  
  async initialize(config: TrustConfig): Promise<void> {
    this.config = config;
    // Minimal implementation
  }
  
  getCurrentMode(): TrustMode {
    return this.currentMode;
  }
  
  async decide(): Promise<TrustDecision> {
    // Minimal implementation to pass tests
    return {
      mode: this.currentMode,
      source: 'default',
      confidence: 1.0,
      reasoning: ['Using default mode'],
      timestamp: new Date()
    };
  }
}
```

### Step 3: Add Edge Case Tests (RED) 🔴

```typescript
describe('edge cases', () => {
  it('should handle missing context gracefully', async () => {
    const decision = await manager.decideForContext(null);
    expect(decision).toBeDefined();
    expect(decision.source).toBe('default');
  });
  
  it('should timeout long-running decisions', async () => {
    const promise = manager.decide({ timeout: 100 });
    await expect(promise).resolves.toBeDefined();
  });
});
```

### Step 4: Handle Edge Cases (GREEN) 🟢

```typescript
async decideForContext(context: IContext | null): Promise<TrustDecision> {
  if (!context) {
    return this.getDefaultDecision();
  }
  // ... rest of implementation
}
```

### Step 5: Refactor (REFACTOR) 🔵

```typescript
export class TrustManager implements ITrustManager {
  // Refactored with better organization
  private readonly config: TrustConfig;
  private readonly ruleEngine: IRuleEngine;
  private readonly contextDetector: IContextDetector;
  private readonly logger: Logger;
  
  constructor(dependencies: TrustManagerDependencies) {
    this.validateDependencies(dependencies);
    this.config = dependencies.config;
    this.ruleEngine = dependencies.ruleEngine;
    this.contextDetector = dependencies.contextDetector;
    this.logger = dependencies.logger || new ConsoleLogger();
  }
  
  // Extract methods for clarity
  private async evaluateRules(context: IContext): Promise<RuleMatch | null> {
    try {
      return await this.ruleEngine.evaluate(context);
    } catch (error) {
      this.logger.error('Rule evaluation failed', error);
      return null;
    }
  }
}
```

## Integration Testing Pattern

### Step 1: Write Integration Tests (RED) 🔴

```typescript
// tests/integration/trust-flow.test.ts
describe('Trust System Integration', () => {
  let system: TrustSystem;
  
  beforeEach(async () => {
    system = await createTestTrustSystem();
  });
  
  it('should make trust decisions based on network context', async () => {
    // Simulate public WiFi
    await system.context.setNetwork({
      type: 'wifi',
      trust: 'public'
    });
    
    const decision = await system.decide();
    expect(decision.mode).not.toBe(TrustMode.CONVENIENCE);
  });
});
```

### Step 2: Implement Integration (GREEN) 🟢

```typescript
// src/core/TrustSystem.ts
export class TrustSystem {
  async decide(): Promise<TrustDecision> {
    const context = await this.contextDetector.detect();
    return this.trustManager.decideForContext(context);
  }
}
```

## Performance Testing

### Write Performance Tests

```typescript
// tests/performance/trust-performance.test.ts
describe('Performance Budgets', () => {
  it('should make decisions in under 100ms', async () => {
    const start = performance.now();
    await trustManager.decide();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
  
  it('should use less than 5MB memory', async () => {
    const before = process.memoryUsage().heapUsed;
    
    // Perform operations
    for (let i = 0; i < 100; i++) {
      await trustManager.decide();
    }
    
    const after = process.memoryUsage().heapUsed;
    const delta = after - before;
    
    expect(delta).toBeLessThan(5 * 1024 * 1024); // 5MB
  });
});
```

## Common TDD Patterns

### Mock External Dependencies

```typescript
// tests/unit/mocks/context-detector.mock.ts
import { vi } from 'vitest';
import type { IContextDetector } from '../../../src/interfaces';

export function createMockContextDetector(): IContextDetector {
  return {
    detect: vi.fn().mockResolvedValue({
      network: { type: 'wifi', trust: 'trusted' },
      device: { type: 'mobile', battery: { level: 0.8 } }
    }),
    detectNetwork: vi.fn(),
    detectDevice: vi.fn(),
    subscribe: vi.fn()
  };
}
```

### Test Data Builders

```typescript
// tests/builders/rule.builder.ts
export class RuleBuilder {
  private rule: Partial<IRule> = {
    name: 'Test Rule',
    condition: { type: 'always' },
    action: { mode: TrustMode.BALANCED }
  };
  
  withName(name: string): this {
    this.rule.name = name;
    return this;
  }
  
  withNetworkCondition(trust: NetworkTrustLevel): this {
    this.rule.condition = { type: 'network', networkTrust: trust };
    return this;
  }
  
  build(): IRule {
    return {
      id: crypto.randomUUID(),
      enabled: true,
      priority: 0,
      ...this.rule
    } as IRule;
  }
}

// Usage
const rule = new RuleBuilder()
  .withName('Public WiFi Rule')
  .withNetworkCondition('public')
  .build();
```

## Testing Best Practices

### 1. Test Structure
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code under test
- **Assert**: Verify the results

### 2. Test Naming
```typescript
// Good: Descriptive and specific
it('should return private mode when network is public and no user rules exist')

// Bad: Vague
it('should work correctly')
```

### 3. Test Independence
Each test should:
- Set up its own data
- Clean up after itself
- Not depend on test order

### 4. Test Coverage Goals
- Unit tests: > 80% coverage
- Integration tests: Critical paths
- Performance tests: All public methods

## Continuous Testing

### Watch Mode Development
```bash
# Terminal 1: Run tests in watch mode
npm run test:watch

# Terminal 2: Run build in watch mode
npm run build:watch

# Terminal 3: Run type checking in watch mode
npm run typecheck:watch
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit && npm run typecheck"
    }
  }
}
```

## TDD Checklist

Before moving to the next component:
- [ ] All tests are passing
- [ ] Coverage is > 80%
- [ ] No TypeScript errors
- [ ] Performance budgets met
- [ ] Edge cases tested
- [ ] Integration tests written
- [ ] Code is refactored
- [ ] Documentation updated

## Common Pitfalls

1. **Writing implementation before tests**
   - Always write the test first, watch it fail

2. **Testing implementation details**
   - Test behavior, not implementation

3. **Not refactoring**
   - Green doesn't mean done, always refactor

4. **Skipping integration tests**
   - Unit tests aren't enough for confidence

5. **Ignoring performance tests**
   - Performance is a feature, test it

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TDD by Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- SPARC TDD Mode: `npx claude-flow sparc run tdd "<feature>"`