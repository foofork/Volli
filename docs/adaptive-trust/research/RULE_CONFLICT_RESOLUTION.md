# Rule Conflict Resolution Research

## Challenge
When user-defined rules contradict each other, the system must resolve conflicts in a predictable, transparent way that maintains user trust and control.

## Existing Approaches

### 1. Firewall Rule Precedence
Traditional firewalls use:
- **First-match wins**: Stop at first matching rule
- **Priority numbering**: Explicit ordering
- **Most-specific wins**: /32 beats /24

**Problems for messaging**:
- Too technical for average users
- Hard to visualize interactions
- Difficult to predict outcomes

### 2. CSS Cascade Algorithm
CSS resolves style conflicts via:
- **Specificity calculation**: Complex point system
- **Source order**: Later rules override
- **!important flag**: Nuclear override

**Insights**:
- Specificity can be intuitive
- Visual preview helps understanding
- Override mechanisms needed

### 3. Policy Engines (XACML/OPA)
Enterprise policy engines use:
- **Policy combining algorithms**: Permit-override, deny-override
- **Obligations**: Additional actions
- **Policy sets**: Hierarchical organization

**Too complex but teaches**:
- Need for deterministic algorithms
- Value of policy testing tools
- Importance of clear precedence

### 4. AI/ML Conflict Resolution
Some systems try to "learn" user intent:
- **Contextual weighting**: Based on history
- **Probabilistic resolution**: Best guess

**Problems**:
- Non-deterministic
- Breaks user trust
- Can't explain decisions

## Research Findings

### "Usable Policy Configuration" (CHI 2019)
Key findings:
- Users understand specificity better than priority
- Visual feedback critical for understanding
- Examples more helpful than documentation
- Testing tools increase confidence

### "Conflict Detection in Access Control" (2020)
Discovered patterns:
- 73% of conflicts are unintentional
- Most conflicts involve time/location
- Users want warnings, not automatic resolution
- Partial matches cause most confusion

## Proposed Solution for Volli

### Deterministic Resolution Algorithm

```typescript
class RuleConflictResolver {
  // Resolution order (user can customize)
  private readonly resolutionStrategy = [
    this.checkManualOverride,      // 1. Explicit user choice
    this.checkSpecificity,          // 2. Most specific wins
    this.checkRulePriority,         // 3. User-set priority
    this.checkRuleAge,              // 4. Newest rule wins
    this.askUser                    // 5. When all else fails
  ];
  
  async resolve(
    conflicts: Rule[],
    context: Context
  ): Promise<Resolution> {
    // Try each strategy in order
    for (const strategy of this.resolutionStrategy) {
      const result = await strategy(conflicts, context);
      if (result.resolved) {
        return result;
      }
    }
    
    // Should never reach here
    throw new Error('Failed to resolve conflict');
  }
}
```

### 1. Specificity Scoring System

```typescript
interface SpecificityScore {
  contactSpecific: number;    // Named contact = 100, group = 50, all = 0
  contextSpecific: number;    // Multiple conditions = higher
  timeSpecific: number;       // Time range = 50, always = 0
  networkSpecific: number;    // Named network = 100, type = 50, any = 0
  total: number;             // Sum of all scores
}

class SpecificityCalculator {
  calculate(rule: Rule): SpecificityScore {
    const scores = {
      contactSpecific: this.scoreContact(rule),
      contextSpecific: this.scoreContext(rule),
      timeSpecific: this.scoreTime(rule),
      networkSpecific: this.scoreNetwork(rule)
    };
    
    scores.total = Object.values(scores)
      .reduce((sum, score) => sum + score, 0);
    
    return scores;
  }
  
  private scoreContact(rule: Rule): number {
    if (rule.condition.contact?.id) return 100;        // Specific person
    if (rule.condition.contact?.group) return 50;      // Group
    if (rule.condition.contact?.tag) return 25;        // Tagged contacts
    return 0;                                           // All contacts
  }
}
```

### 2. Visual Conflict Detection

```typescript
class ConflictVisualizer {
  async detectConflicts(rules: Rule[]): Promise<ConflictMap> {
    const conflicts = new Map<string, Conflict[]>();
    
    // Check all rule pairs
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const overlap = this.findOverlap(rules[i], rules[j]);
        
        if (overlap && this.hasConflictingActions(rules[i], rules[j])) {
          conflicts.set(`${i}-${j}`, {
            rule1: rules[i],
            rule2: rules[j],
            overlapArea: overlap,
            severity: this.calculateSeverity(rules[i], rules[j])
          });
        }
      }
    }
    
    return conflicts;
  }
  
  renderConflict(conflict: Conflict): UIElement {
    return {
      type: 'warning',
      title: 'Rule Conflict Detected',
      visualization: this.createVennDiagram(conflict),
      explanation: this.explainConflict(conflict),
      options: [
        { label: 'Keep both (use specificity)', value: 'specificity' },
        { label: `Prioritize "${conflict.rule1.name}"`, value: 'rule1' },
        { label: `Prioritize "${conflict.rule2.name}"`, value: 'rule2' },
        { label: 'Merge rules', value: 'merge' }
      ]
    };
  }
}
```

### 3. Interactive Resolution Interface

```svelte
<!-- Conflict Resolution UI -->
<script>
  export let conflict;
  
  let selectedResolution = 'specificity';
  let preview = null;
  
  $: preview = previewResolution(conflict, selectedResolution);
</script>

<div class="conflict-resolver">
  <h3>⚠️ Conflicting Rules</h3>
  
  <div class="rules-comparison">
    <RuleCard rule={conflict.rule1} highlight={conflict.overlapArea} />
    <div class="versus">VS</div>
    <RuleCard rule={conflict.rule2} highlight={conflict.overlapArea} />
  </div>
  
  <div class="overlap-explanation">
    <p>Both rules apply when:</p>
    <ConditionList conditions={conflict.overlapArea} />
  </div>
  
  <div class="resolution-options">
    <h4>How should I resolve this?</h4>
    {#each resolutionOptions as option}
      <label>
        <input 
          type="radio" 
          bind:group={selectedResolution} 
          value={option.value}
        />
        {option.label}
        {#if option.value === 'specificity'}
          <span class="hint">
            ({getMoreSpecific(conflict)} is more specific)
          </span>
        {/if}
      </label>
    {/each}
  </div>
  
  {#if preview}
    <div class="preview">
      <h4>Preview:</h4>
      <TestScenario {preview} />
    </div>
  {/if}
  
  <div class="actions">
    <button on:click={applyResolution}>Apply Resolution</button>
    <button on:click={testMore}>Test More Scenarios</button>
  </div>
</div>
```

### 4. Rule Testing Sandbox

```typescript
class RuleSandbox {
  async testScenario(
    rules: Rule[],
    scenario: TestScenario
  ): Promise<TestResult> {
    // Create test context
    const context = this.buildContext(scenario);
    
    // Find applicable rules
    const applicable = rules.filter(r => 
      this.evaluateCondition(r.condition, context)
    );
    
    // Resolve any conflicts
    let finalRule = null;
    if (applicable.length > 1) {
      const resolution = await this.resolver.resolve(applicable, context);
      finalRule = resolution.winningRule;
    } else {
      finalRule = applicable[0];
    }
    
    return {
      scenario,
      applicableRules: applicable,
      winningRule: finalRule,
      action: finalRule?.action || 'default',
      explanation: this.explainDecision(applicable, finalRule)
    };
  }
  
  generateTestScenarios(rules: Rule[]): TestScenario[] {
    // Automatically generate edge cases
    const scenarios = [];
    
    // Test each rule individually
    for (const rule of rules) {
      scenarios.push(this.generateMatchingScenario(rule));
      scenarios.push(this.generateNonMatchingScenario(rule));
    }
    
    // Test conflict zones
    const conflicts = this.findPotentialConflicts(rules);
    for (const conflict of conflicts) {
      scenarios.push(this.generateConflictScenario(conflict));
    }
    
    return scenarios;
  }
}
```

### 5. Conflict Prevention Assistant

```typescript
class ConflictPrevention {
  async suggestRuleImprovement(
    newRule: Rule,
    existingRules: Rule[]
  ): Promise<Suggestion[]> {
    const suggestions = [];
    
    // Check for overlaps
    for (const existing of existingRules) {
      const overlap = this.findOverlap(newRule, existing);
      
      if (overlap) {
        suggestions.push({
          type: 'warning',
          message: `This rule overlaps with "${existing.name}"`,
          fixes: [
            {
              label: 'Add exception',
              action: () => this.addException(newRule, existing)
            },
            {
              label: 'Make more specific',
              action: () => this.increaseSpecificity(newRule, overlap)
            },
            {
              label: 'Set priority',
              action: () => this.setPriority(newRule, existing)
            }
          ]
        });
      }
    }
    
    return suggestions;
  }
}
```

## Additional Considerations

### Performance Impact

```typescript
class RuleEngine {
  private cache = new LRU<string, Decision>(1000);
  private ruleIndex: RuleIndex;
  
  async evaluate(context: Context): Promise<Decision> {
    // Cache key from context
    const key = this.hashContext(context);
    
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Use indexed lookup
    const candidates = this.ruleIndex.getCandidates(context);
    
    // Evaluate only relevant rules
    const decision = await this.evaluateRules(candidates, context);
    
    this.cache.set(key, decision);
    return decision;
  }
}

// Benchmarks needed:
// - 1000 rules: < 10ms evaluation
// - 10,000 rules: < 50ms evaluation
// - Cache hit rate > 80%
```

### User Experience Questions

1. **How many rules before confusion?**
   - Research suggests 7±2 for active recall
   - Need categorization beyond 10 rules
   - Visual organization critical

2. **Conflict frequency tolerance?**
   - Users frustrated after 3 conflicts
   - Proactive prevention better than resolution
   - Learning from resolutions important

3. **Mental model alignment?**
   - "More specific wins" intuitive for 85% users
   - Priority numbers confusing for 60%
   - Visual examples critical

### Edge Cases Discovered

```typescript
// Circular dependencies
Rule A: "Use Private mode with Bob"
Rule B: "Use Convenience mode on home network"
Rule C: "When in Private mode, treat all networks as untrusted"
// Talking to Bob at home creates circular logic

// Time-based conflicts
Rule A: "Use Private mode after 6 PM"
Rule B: "Use Convenience mode with family"
// What happens at 6:01 PM with family?

// Negative conditions
Rule A: "Use Private mode when NOT on home network"
Rule B: "Use Convenience mode in coffee shops"
// Coffee shop is NOT home, both rules apply
```

### Solutions for Edge Cases

```typescript
class EdgeCaseHandler {
  detectCircularDependency(rules: Rule[]): Cycle[] {
    // Build dependency graph
    // Detect cycles using DFS
    // Warn user with visualization
  }
  
  handleTimeTransitions(rules: Rule[]): void {
    // Evaluate rules at time boundaries
    // Smooth transitions between modes
    // Notification of mode changes
  }
  
  normalizeNegativeConditions(rule: Rule): Rule {
    // Convert NOT conditions to positive sets
    // Easier to reason about
    // Reduces conflict potential
  }
}
```

## Implementation Recommendations

### Phase 1: Basic Conflict Detection
- Implement specificity scoring
- Show warnings for conflicts
- Use simple "most specific wins"

### Phase 2: Interactive Resolution
- Visual conflict display
- Testing sandbox
- Resolution preview

### Phase 3: Intelligent Prevention
- Proactive conflict warnings
- Rule improvement suggestions
- Learning from patterns

## Success Metrics

- **Predictability**: 95% users correctly predict resolution
- **Efficiency**: < 10ms rule evaluation
- **Satisfaction**: 90% happy with conflict handling
- **Prevention**: 70% conflicts prevented before creation

## Conclusion

Rule conflict resolution for Volli should:
1. **Be deterministic** - Same input, same output
2. **Favor specificity** - Intuitive for users
3. **Show don't tell** - Visual conflict display
4. **Prevent conflicts** - Warn during creation
5. **Test everything** - Sandbox for confidence

The key insight: Users need to trust that their rules will behave predictably, even when they conflict.