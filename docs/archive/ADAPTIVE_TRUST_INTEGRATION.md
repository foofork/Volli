# Adaptive Trust System - Integration with Volli Architecture

## Overview

This document defines how the Adaptive Trust System integrates with the existing Volli architecture, ensuring seamless enhancement without disrupting current functionality.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Volli Application                        │
├─────────────────────────────────────────────────────────────────┤
│                    SvelteKit Web App                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Routes    │  │   Stores    │  │   UI Components     │   │
│  │             │  │             │  │ + TrustIndicator    │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘   │
├─────────┴─────────────────┴────────────────────┴────────────────┤
│                        Core Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ VolliCore   │  │  Network    │  │ Adaptive Trust      │   │
│  │ (Extended)  │◄─┤   Store     │◄─┤    System          │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
├──────────────────────────────────────────────────────────────────┤
│                     Storage Layer (Dexie)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Existing Tables + Trust Tables (rules, decisions, etc)  │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Package Structure Integration

```bash
# New package in monorepo
packages/adaptive-trust/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Public API exports
│   ├── core/
│   │   ├── TrustManager.ts
│   │   ├── TrustModes.ts
│   │   └── types.ts
│   ├── rules/
│   │   ├── RuleEngine.ts
│   │   ├── ConflictResolver.ts
│   │   └── RuleStorage.ts
│   ├── context/
│   │   ├── ContextDetector.ts
│   │   ├── NetworkAnalyzer.ts
│   │   └── SensitivityDetector.ts
│   ├── discovery/
│   │   ├── DiscoveryManager.ts
│   │   ├── strategies/
│   │   └── ConnectionUpgrader.ts
│   ├── stores/
│   │   ├── trustStore.ts     # Svelte store
│   │   └── ruleStore.ts      # Svelte store
│   └── ui/
│       ├── TrustIndicator.svelte
│       ├── RuleBuilder.svelte
│       └── ModeSelector.svelte
```

### 2. VolliCore Extension

```typescript
// packages/integration/src/core/volli-core.ts

import { TrustSystem } from '@volli/adaptive-trust';

export class VolliCore {
  // Existing properties
  private _identity: IdentityCore;
  private _messaging: MessageCore;
  private _vault: VaultCore;
  private _db: CoreDatabase;
  
  // New optional trust system
  private _trust?: TrustSystem;
  
  constructor(config: VolliConfig) {
    // Existing initialization...
    
    // Initialize trust system if enabled
    if (config.features?.adaptiveTrust) {
      this._trust = new TrustSystem({
        db: this._db,
        core: this,
        config: config.trustConfig
      });
    }
  }
  
  // Getter for trust system (lazy initialization)
  get trust(): TrustSystem | undefined {
    return this._trust;
  }
  
  // Enhanced connection method
  async connectToPeer(peerId: string, options?: ConnectionOptions): Promise<void> {
    if (this._trust?.isEnabled()) {
      // Use trust-aware connection
      return this._trust.connect(peerId, options);
    } else {
      // Use existing connection logic
      return this._messaging.connectToPeer(peerId, options);
    }
  }
}
```

### 3. Network Store Integration

```typescript
// packages/integration/src/network/trust-network-store.ts

import { networkStore } from './network-store';
import { trustStore } from '@volli/adaptive-trust/stores';

// Extend existing network store
export const trustNetworkStore = {
  ...networkStore,
  
  // Override connect method
  async connect(peerId: string): Promise<void> {
    // Get trust decision
    const decision = await trustStore.getDecision(peerId);
    
    // Select connection strategy based on trust mode
    const strategies = this.getStrategiesForMode(decision.mode);
    
    // Try strategies in order
    for (const strategy of strategies) {
      try {
        await this.connectWithStrategy(peerId, strategy);
        
        // Update trust metadata
        trustStore.recordConnection(peerId, {
          strategy,
          mode: decision.mode,
          timestamp: Date.now()
        });
        
        return;
      } catch (err) {
        console.log(`Strategy ${strategy} failed, trying next`);
      }
    }
    
    throw new Error('All connection strategies failed');
  },
  
  // New trust-aware methods
  getStrategiesForMode(mode: TrustMode): string[] {
    const strategyMap = {
      convenience: ['federated', 'cached', 'mdns'],
      balanced: ['cached', 'mdns', 'dht', 'federated'],
      private: ['cached', 'dht', 'friend-relay'],
      airgap: ['qr-code', 'local-only']
    };
    
    return strategyMap[mode] || strategyMap.balanced;
  }
};
```

### 4. Message Store Integration

```typescript
// packages/messaging/src/stores/trust-message-store.ts

import { messageStore } from './message-store';
import { sensitivityDetector } from '@volli/adaptive-trust';

// Enhance message store with sensitivity detection
export const trustMessageStore = {
  ...messageStore,
  
  // Monitor message composition
  async onComposing(draft: MessageDraft): Promise<void> {
    // Existing composition logic...
    
    if (sensitivityDetector.isEnabled()) {
      const signals = {
        typingSpeed: this.getTypingSpeed(),
        pauseFrequency: this.getPauseFrequency(),
        messageLength: draft.content.length,
        hasAttachment: draft.attachments.length > 0
      };
      
      const sensitivity = await sensitivityDetector.analyze(signals);
      
      if (sensitivity.score > 0.7 && !this.isPrivateMode()) {
        this.suggestModeUpgrade('private', sensitivity.reason);
      }
    }
  },
  
  // Enhanced send with trust metadata
  async sendMessage(content: string): Promise<void> {
    const message = await this.createMessage(content);
    
    // Add trust metadata
    if (trustStore.isEnabled()) {
      message.metadata.trustMode = trustStore.getCurrentMode();
      message.metadata.trustDecision = await trustStore.getDecision();
    }
    
    return this.send(message);
  }
};
```

### 5. Database Schema Integration

```typescript
// packages/integration/src/db/trust-schema.ts

// Extend existing database schema
export function extendDatabaseWithTrust(db: Dexie) {
  // Add trust tables without modifying existing ones
  db.version(db.verno + 1).stores({
    // Keep all existing tables...
    ...db.tables.reduce((acc, table) => {
      acc[table.name] = table.schema.primKey.src;
      return acc;
    }, {}),
    
    // Add new trust tables
    trustRules: '++id, name, priority, enabled, [condition.type+condition.value]',
    trustDecisions: '++id, peerId, mode, timestamp, [peerId+timestamp]',
    networkProfiles: 'fingerprint, ssid, trust, lastSeen, userClassified',
    trustHistory: '++id, timestamp, event, [peerId+timestamp]',
    sensitivityPatterns: '++id, pattern, score, sessionOnly'
  });
}

// Migration for existing users
export async function migrateTrustData(db: Dexie) {
  // Set default trust preferences
  await db.config.put({
    key: 'trust.enabled',
    value: false // Opt-in for existing users
  });
  
  await db.config.put({
    key: 'trust.defaultMode',
    value: 'balanced'
  });
}
```

### 6. UI Component Integration

#### Trust Indicator Integration

```svelte
<!-- apps/web/src/routes/app/+layout.svelte -->
<script>
  import { page } from '$app/stores';
  import { trustStore } from '$lib/stores/trust';
  import { TrustIndicator } from '@volli/adaptive-trust/ui';
  
  // Only show on conversation pages
  $: showTrustIndicator = $trustStore.enabled && 
                          $page.route.id?.includes('conversation');
</script>

<div class="app-layout">
  <header class="app-header">
    <!-- Existing header content -->
    
    {#if showTrustIndicator}
      <div class="trust-indicator-wrapper">
        <TrustIndicator 
          mode={$trustStore.currentMode}
          decision={$trustStore.currentDecision}
          on:modeChange={handleModeChange}
        />
      </div>
    {/if}
  </header>
  
  <!-- Rest of layout -->
</div>

<style>
  .trust-indicator-wrapper {
    margin-left: auto;
    display: flex;
    align-items: center;
  }
</style>
```

#### Settings Integration

```svelte
<!-- apps/web/src/routes/app/settings/+page.svelte -->
<script>
  import { TrustSettings } from '@volli/adaptive-trust/ui';
  import { trustStore } from '$lib/stores/trust';
</script>

<div class="settings-page">
  <!-- Existing settings sections -->
  
  <section class="settings-section">
    <h2>Privacy & Trust</h2>
    
    <label class="setting-toggle">
      <input 
        type="checkbox" 
        bind:checked={$trustStore.enabled}
      />
      <span>Enable Adaptive Trust System</span>
      <small>Automatically adjust security based on context</small>
    </label>
    
    {#if $trustStore.enabled}
      <TrustSettings />
    {/if}
  </section>
</div>
```

### 7. Store Integration

```typescript
// apps/web/src/lib/stores/trust.ts

import { writable, derived } from 'svelte/store';
import { core } from './core';
import type { TrustState } from '@volli/adaptive-trust';

// Create trust store that syncs with core
function createTrustStore() {
  const { subscribe, set, update } = writable<TrustState>({
    enabled: false,
    currentMode: 'balanced',
    currentDecision: null,
    rules: [],
    indicatorVisible: true
  });
  
  // Sync with core trust system
  core.subscribe(($core) => {
    if ($core?.trust) {
      $core.trust.on('state-changed', (state) => {
        set(state);
      });
    }
  });
  
  return {
    subscribe,
    
    async enable() {
      const $core = get(core);
      if ($core?.trust) {
        await $core.trust.enable();
        update(s => ({ ...s, enabled: true }));
      }
    },
    
    async setMode(mode: TrustMode) {
      const $core = get(core);
      if ($core?.trust) {
        await $core.trust.setMode(mode);
      }
    },
    
    async addRule(rule: RuleInput) {
      const $core = get(core);
      if ($core?.trust) {
        return $core.trust.rules.add(rule);
      }
    }
  };
}

export const trustStore = createTrustStore();
```

### 8. Connection Flow Integration

```typescript
// packages/integration/src/flows/trust-connection-flow.ts

export class TrustAwareConnectionFlow {
  // Integrate with existing connection flow
  async establishConnection(peerId: string): Promise<void> {
    // 1. Check if trust is enabled
    if (!this.core.trust?.isEnabled()) {
      return this.legacyConnect(peerId);
    }
    
    // 2. Get trust decision
    const context = await this.core.trust.context.detect();
    const decision = await this.core.trust.decide(context);
    
    // 3. Show UI feedback
    this.ui.showConnecting(peerId, decision.mode);
    
    // 4. Try connection strategies
    const connection = await this.core.trust.connections.connect(
      peerId,
      decision
    );
    
    // 5. Update UI with result
    this.ui.showConnected(peerId, connection);
    
    // 6. Schedule background upgrade if available
    if (decision.upgradeAvailable) {
      this.core.trust.connections.scheduleUpgrade(
        connection,
        decision.suggestedMode
      );
    }
  }
}
```

## Migration Strategy

### Phase 1: Silent Deployment (Week 1-2)
```typescript
// Deploy with feature flag disabled
const config = {
  features: {
    adaptiveTrust: false // Disabled by default
  }
};
```

### Phase 2: Beta Testing (Week 3-4)
```typescript
// Enable for beta users
if (user.isBetaTester) {
  config.features.adaptiveTrust = true;
  config.trustConfig = {
    defaultMode: 'balanced',
    allowAdaptive: true,
    requireConfirmation: true // Extra safety for beta
  };
}
```

### Phase 3: Gradual Rollout (Week 5-8)
```typescript
// Progressive rollout
const rolloutPercentage = 0.25; // 25% of users
if (Math.random() < rolloutPercentage) {
  config.features.adaptiveTrust = true;
}
```

### Phase 4: General Availability (Week 9+)
```typescript
// Default enabled for new users
const defaultConfig = {
  features: {
    adaptiveTrust: true
  },
  trustConfig: {
    defaultMode: 'balanced',
    allowAdaptive: true,
    requireConfirmation: false
  }
};
```

## Backward Compatibility

### Feature Detection Pattern
```typescript
// Always check if trust system is available
export async function connectWithCompatibility(peerId: string) {
  if (core.trust?.isAvailable()) {
    try {
      return await core.trust.connect(peerId);
    } catch (err) {
      console.warn('Trust connect failed, falling back', err);
    }
  }
  
  // Fallback to legacy
  return await core.messaging.connectToPeer(peerId);
}
```

### Progressive Enhancement
```svelte
<!-- Components gracefully handle missing trust system -->
{#if $trustStore.available}
  <EnhancedConnectionUI />
{:else}
  <StandardConnectionUI />
{/if}
```

## Testing Integration

### Integration Test Suite
```typescript
describe('Trust System Integration', () => {
  it('should work with trust system disabled', async () => {
    const core = new VolliCore({ features: { adaptiveTrust: false } });
    await core.connectToPeer('peer-123');
    expect(core.trust).toBeUndefined();
  });
  
  it('should enhance connections when enabled', async () => {
    const core = new VolliCore({ features: { adaptiveTrust: true } });
    await core.connectToPeer('peer-123');
    expect(core.trust.getCurrentMode()).toBeDefined();
  });
  
  it('should fall back gracefully on trust system errors', async () => {
    const core = new VolliCore({ features: { adaptiveTrust: true } });
    core.trust.simulateError();
    
    // Should still connect using legacy path
    await expect(core.connectToPeer('peer-123')).resolves.toBeDefined();
  });
});
```

## Performance Monitoring

```typescript
// Monitor trust system impact
class TrustPerformanceMonitor {
  measureImpact() {
    return {
      // Connection establishment time
      connectionTime: {
        withTrust: this.measureWithTrust(),
        withoutTrust: this.measureWithoutTrust(),
        overhead: this.calculateOverhead()
      },
      
      // Memory usage
      memoryImpact: {
        baseline: this.getBaselineMemory(),
        withTrust: this.getTrustMemory(),
        delta: this.getMemoryDelta()
      },
      
      // Battery impact
      batteryImpact: {
        contextDetection: this.measureContextDetection(),
        ruleEvaluation: this.measureRuleEvaluation(),
        total: this.getTotalBatteryImpact()
      }
    };
  }
}
```

## Rollback Plan

If issues arise, the trust system can be disabled without code changes:

```typescript
// Remote configuration
await core.config.set('features.adaptiveTrust', false);

// Or emergency kill switch
window.DISABLE_TRUST_SYSTEM = true;

// System automatically falls back to legacy behavior
```

## Success Metrics

1. **No regression in existing functionality**
2. **Connection time overhead < 100ms**
3. **Memory usage increase < 5MB**
4. **Zero crashes from trust system**
5. **User adoption > 60% when offered**
6. **Performance complaints < 1%**

## Conclusion

This integration plan ensures the Adaptive Trust System enhances Volli without disrupting existing functionality. The phased approach allows for careful validation and easy rollback if needed.