# Implementation Guide: Adaptive Signaling for Volli

## Quick Start Integration

### Step 1: Add Context Detection Package

```bash
# Create new package for adaptive signaling
cd packages/
mkdir adaptive-signaling
cd adaptive-signaling
npm init -y
```

### Step 2: Core Context Detection Implementation

```typescript
// packages/adaptive-signaling/src/context-detector.ts
import { NetworkInfo } from '@volli/integration';
import { DeviceCapabilities } from '@volli/device';

export class ContextDetector {
  private cache = new Map<string, ContextSignals>();
  
  async detectContext(): Promise<ContextSignals> {
    const [network, device, environment] = await Promise.all([
      this.detectNetworkContext(),
      this.detectDeviceContext(),
      this.detectEnvironmentContext()
    ]);
    
    return {
      ...network,
      ...device,
      ...environment,
      timestamp: Date.now()
    };
  }
  
  private async detectNetworkContext(): Promise<NetworkContext> {
    // Use existing network detection + enhancements
    const connection = navigator.connection || {};
    
    // Detect network trust level
    const trustLevel = await this.analyzeNetworkTrust();
    
    return {
      type: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      trustLevel,
      isVPN: await this.detectVPN(),
      isTor: await this.detectTor(),
      isCellular: connection.type === 'cellular'
    };
  }
  
  private async analyzeNetworkTrust(): Promise<NetworkTrust> {
    // Check if on known home/work networks
    const ssid = await this.getNetworkSSID();
    const savedNetworks = await this.store.get('trustedNetworks');
    
    if (savedNetworks?.includes(ssid)) {
      return 'trusted';
    }
    
    // Check for common public WiFi patterns
    const publicPatterns = [
      /starbucks/i, /airport/i, /hotel/i, 
      /guest/i, /public/i, /free/i
    ];
    
    if (publicPatterns.some(p => p.test(ssid))) {
      return 'public';
    }
    
    return 'unknown';
  }
}
```

### Step 3: Integrate with Existing Connection Manager

```typescript
// packages/integration/src/network/adaptive-connection-manager.ts
import { ConnectionManager } from './connection-manager';
import { ContextDetector } from '@volli/adaptive-signaling';

export class AdaptiveConnectionManager extends ConnectionManager {
  private contextDetector = new ContextDetector();
  private trustMode: TrustMode = TrustMode.BALANCED;
  
  async connect(peerId: string, options?: ConnectionOptions): Promise<Peer> {
    // Detect current context
    const context = await this.contextDetector.detectContext();
    
    // Select optimal strategies
    const strategies = this.selectStrategies(context, options);
    
    // Try strategies with smart ordering
    for (const strategy of strategies) {
      try {
        const peer = await this.tryStrategy(strategy, peerId);
        
        // Background upgrade if needed
        this.scheduleUpgradeCheck(peer, context);
        
        return peer;
      } catch (err) {
        console.log(`Strategy ${strategy} failed, trying next...`);
      }
    }
    
    throw new Error('All connection strategies failed');
  }
  
  private selectStrategies(
    context: ContextSignals,
    options?: ConnectionOptions
  ): SignalingStrategy[] {
    // User preference overrides
    if (options?.forceMode) {
      return this.getStrategiesForMode(options.forceMode);
    }
    
    // Intelligent selection based on context
    if (context.networkTrust === 'trusted' && !context.isCellular) {
      // Home network: prioritize speed
      return [
        'mdns',      // Fastest for local
        'dht',       // Good for global
        'federated'  // Fallback
      ];
    }
    
    if (context.networkTrust === 'public' || context.isCellular) {
      // Public network: balance speed and privacy
      return [
        'federated', // Fast initial connection
        'dht',       // Upgrade path
        'relay'      // Through friends
      ];
    }
    
    if (context.isVPN || context.isTor) {
      // Privacy-conscious user: respect their choice
      return [
        'dht',       // Decentralized first
        'relay',     // Through friends
        'direct'     // QR/link exchange
      ];
    }
    
    // Default balanced approach
    return ['federated', 'dht', 'mdns'];
  }
}
```

### Step 4: Minimal UI Integration

```svelte
<!-- apps/web/src/components/TrustIndicator.svelte -->
<script lang="ts">
  import { trustStore } from '$lib/stores/trust';
  import { fade } from 'svelte/transition';
  
  $: mode = $trustStore.currentMode;
  $: indicator = getTrustIndicator(mode);
  
  function getTrustIndicator(mode: TrustMode) {
    const indicators = {
      [TrustMode.CONVENIENCE]: {
        icon: '☕',
        color: 'green',
        label: 'Quick Connect'
      },
      [TrustMode.BALANCED]: {
        icon: '🛡️',
        color: 'blue',
        label: 'Balanced'
      },
      [TrustMode.PRIVATE]: {
        icon: '🏰',
        color: 'purple',
        label: 'Private'
      },
      [TrustMode.AIRGAP]: {
        icon: '🔒',
        color: 'red',
        label: 'Maximum Security'
      }
    };
    
    return indicators[mode];
  }
</script>

<button
  class="trust-indicator"
  on:click={() => trustStore.showDetails()}
  transition:fade
>
  <span class="icon" style="color: {indicator.color}">
    {indicator.icon}
  </span>
  {#if $trustStore.showLabel}
    <span class="label">{indicator.label}</span>
  {/if}
</button>

<style>
  .trust-indicator {
    background: transparent;
    border: none;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    opacity: 0.8;
    transition: opacity 0.2s;
  }
  
  .trust-indicator:hover {
    opacity: 1;
  }
  
  .icon {
    font-size: 1.2rem;
  }
  
  .label {
    font-size: 0.75rem;
    opacity: 0.7;
  }
</style>
```

### Step 5: Smart Mode Selection Logic

```typescript
// packages/adaptive-signaling/src/mode-selector.ts
export class ModeSelector {
  async recommendMode(
    context: ContextSignals,
    userProfile: UserProfile
  ): Promise<ModeRecommendation> {
    const factors = this.calculateFactors(context);
    
    // Privacy need assessment
    const privacyNeed = this.assessPrivacyNeed({
      networkRisk: factors.networkRisk,
      geoRisk: factors.geoRisk,
      userPreference: userProfile.privacyPreference,
      contentSensitivity: context.contentSensitivity
    });
    
    // Performance requirement
    const performanceNeed = this.assessPerformanceNeed({
      messageVolume: userProfile.avgMessageVolume,
      mediaSharing: userProfile.sharesMedia,
      batteryLevel: context.batteryLevel,
      networkQuality: context.connectionQuality
    });
    
    // Balance the needs
    const recommendedMode = this.balanceNeeds(
      privacyNeed,
      performanceNeed,
      userProfile.explicitPreferences
    );
    
    return {
      mode: recommendedMode,
      confidence: this.calculateConfidence(factors),
      reasoning: this.explainRecommendation(factors),
      alternatives: this.getAlternatives(recommendedMode)
    };
  }
  
  private balanceNeeds(
    privacy: number,  // 0-1
    performance: number,  // 0-1
    preferences: UserPreferences
  ): TrustMode {
    // User override
    if (preferences.alwaysPrivate) return TrustMode.PRIVATE;
    if (preferences.alwaysConvenient) return TrustMode.CONVENIENCE;
    
    // Intelligent balancing
    const score = privacy * 0.6 + (1 - performance) * 0.4;
    
    if (score > 0.8) return TrustMode.PRIVATE;
    if (score > 0.5) return TrustMode.BALANCED;
    return TrustMode.CONVENIENCE;
  }
}
```

### Step 6: Background Connection Upgrader

```typescript
// packages/adaptive-signaling/src/connection-upgrader.ts
export class ConnectionUpgrader {
  private upgradeQueue = new PriorityQueue<UpgradeTask>();
  
  scheduleUpgrade(
    connection: Connection,
    targetMode: TrustMode,
    priority: Priority = Priority.LOW
  ) {
    const task: UpgradeTask = {
      connection,
      targetMode,
      priority,
      attempts: 0,
      scheduledAt: Date.now()
    };
    
    this.upgradeQueue.enqueue(task, priority);
    this.processQueue();
  }
  
  private async processQueue() {
    while (!this.upgradeQueue.isEmpty()) {
      const task = this.upgradeQueue.dequeue();
      
      // Skip if connection is gone
      if (!task.connection.isActive()) continue;
      
      // Skip if user is actively using connection
      if (task.connection.hasRecentActivity(30000)) {
        // Reschedule for later
        task.priority = Priority.LOWER;
        this.upgradeQueue.enqueue(task, task.priority);
        continue;
      }
      
      // Attempt upgrade
      try {
        await this.performUpgrade(task);
      } catch (err) {
        if (task.attempts < 3) {
          task.attempts++;
          this.upgradeQueue.enqueue(task, Priority.LOWEST);
        }
      }
    }
  }
  
  private async performUpgrade(task: UpgradeTask) {
    // Create new connection with target mode
    const newConn = await this.connectionManager.connectWithMode(
      task.connection.peerId,
      task.targetMode
    );
    
    // Seamless migration
    await this.migrateConnection(task.connection, newConn);
    
    // Notify UI
    this.events.emit('connection-upgraded', {
      peerId: task.connection.peerId,
      oldMode: task.connection.mode,
      newMode: task.targetMode
    });
  }
}
```

### Step 7: User Education & Onboarding

```typescript
// packages/adaptive-signaling/src/education.ts
export class TrustEducation {
  async showContextualTip(
    mode: TrustMode,
    trigger: TriggerEvent
  ): Promise<void> {
    const tip = this.getTipForContext(mode, trigger);
    
    if (!tip || await this.hasSeenTip(tip.id)) {
      return;
    }
    
    // Non-intrusive notification
    this.ui.showTooltip({
      content: tip.message,
      position: 'bottom-right',
      duration: 5000,
      action: tip.action,
      dismissible: true
    });
    
    await this.markTipSeen(tip.id);
  }
  
  private getTipForContext(
    mode: TrustMode,
    trigger: TriggerEvent
  ): Tip | null {
    const tips = {
      firstPublicWifi: {
        id: 'public-wifi-warning',
        message: 'On public WiFi - using secure connection',
        action: { label: 'Learn more', url: '/security/public-wifi' }
      },
      
      upgradedConnection: {
        id: 'connection-upgraded',
        message: 'Connection upgraded for better privacy',
        action: { label: 'See details', handler: 'showConnectionPath' }
      },
      
      highSensitivityDetected: {
        id: 'sensitive-content',
        message: 'Switched to private mode for this conversation',
        action: { label: 'Settings', url: '/settings/privacy' }
      }
    };
    
    return tips[trigger] || null;
  }
}
```

## Integration Checklist

- [ ] Add context detection to connection flow
- [ ] Implement trust indicator UI component  
- [ ] Add mode switching logic
- [ ] Create background upgrader
- [ ] Add user education tooltips
- [ ] Test mode transitions
- [ ] Add analytics for mode usage
- [ ] Create A/B testing framework

## Performance Considerations

1. **Context Detection Caching**: Cache context for 60 seconds
2. **Lazy Loading**: Only load advanced features when needed
3. **Battery Optimization**: Reduce checks when battery < 20%
4. **Network Awareness**: Back off when connection is poor

## Privacy Considerations

1. **Local Processing**: All context detection happens on-device
2. **No Tracking**: Mode selections are not sent to servers
3. **User Control**: Easy overrides for all automatic decisions
4. **Transparent**: Show what factors influenced decisions

## Next Steps

1. Implement basic context detection
2. Add to existing connection manager
3. Create minimal UI indicator
4. Test with different network conditions
5. Gather user feedback
6. Iterate on intelligence algorithms