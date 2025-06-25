# Battery-Efficient P2P Discovery Research

## Challenge
P2P discovery mechanisms typically drain battery through:
- Constant network scanning
- Maintaining DHT connections
- Broadcasting presence
- Processing discovery packets

Mobile users expect < 5% daily battery impact.

## Battery Drain Analysis

### Measurement Study: "Energy Consumption of P2P Apps" (2021)
Findings from 10 popular P2P apps:

| Method | Battery/Hour | Primary Drain Source |
|--------|--------------|---------------------|
| Bluetooth scanning | 8-12% | Radio wake-ups |
| WiFi Direct | 6-10% | Beacon transmission |
| DHT participation | 4-8% | Network + CPU |
| mDNS/Bonjour | 3-5% | Multicast packets |
| Centralized | 1-2% | Periodic polling |

### Android Doze Impact
Android's Doze mode (API 23+) restricts:
- Network access
- Wake locks  
- Alarms
- WiFi scans

**Apps must adapt or fail silently**

## Existing Solutions

### 1. WhatsApp's Approach
- Centralized discovery (phone numbers)
- Push notifications for presence
- Minimal background activity

**Battery impact**: < 2% daily
**Privacy cost**: Centralized metadata

### 2. Briar's Strategy
- Bluetooth only when screen on
- Tor polling on WiFi only
- Aggressive connection caching

**Battery impact**: 5-8% daily
**Limitation**: Slow discovery

### 3. Apple's Multipeer Connectivity
- Coalesced discovery windows
- Shared radio usage
- System-managed scheduling

**Battery impact**: 3-4% when active
**Limitation**: iOS only

### 4. BitTorrent's DHT Optimization
- Hierarchical node structure
- Selective participation
- Cached routing tables

**Innovation**: Not all nodes equal participants

## Research Insights

### "Adaptive Duty Cycling for P2P" (MobiSys 2020)
Key findings:
- 78% battery savings with smart scheduling
- User activity patterns predictable
- Batched operations more efficient
- Context-aware polling effective

### "Energy-Efficient Distributed Systems" (2019)
Discovered:
- Push >> Pull for mobile
- Exponential backoff crucial
- Piggybacking on existing connections
- Edge computing reduces load

## Proposed Solution for Volli

### Hierarchical Discovery Architecture

```typescript
class EfficientDiscoveryManager {
  private strategies: DiscoveryStrategy[] = [
    new LocalDiscovery(),      // mDNS - lowest power
    new CachedDiscovery(),     // Recent peers
    new RelayDiscovery(),      // Through friends
    new DHTDiscovery(),        // Global - highest power
  ];
  
  async discover(
    peerId: string,
    constraints: PowerConstraints
  ): Promise<Peer> {
    // Try strategies in order of efficiency
    for (const strategy of this.strategies) {
      if (strategy.meetsConstraints(constraints)) {
        const peer = await strategy.discover(peerId);
        if (peer) return peer;
      }
    }
    
    throw new Error('Discovery failed within power budget');
  }
}
```

### 1. Adaptive Duty Cycling

```typescript
class AdaptiveDutyCycle {
  private scheduler: SmartScheduler;
  
  calculateDutyCycle(context: DeviceContext): DutyCycle {
    const factors = {
      batteryLevel: context.battery.level,
      chargingState: context.battery.isCharging,
      userActivity: context.activity.recent,
      networkType: context.network.type,
      timeOfDay: context.time.hour,
      historicalUsage: context.usage.pattern
    };
    
    // Adaptive scheduling based on context
    if (factors.batteryLevel < 20 && !factors.chargingState) {
      return {
        scanInterval: 30 * 60 * 1000,  // 30 minutes
        scanDuration: 5 * 1000,         // 5 seconds
        methods: ['cached', 'local']   // Low power only
      };
    }
    
    if (factors.chargingState) {
      return {
        scanInterval: 30 * 1000,        // 30 seconds
        scanDuration: 10 * 1000,        // 10 seconds
        methods: ['all']                // Full discovery
      };
    }
    
    // Smart scheduling based on usage patterns
    return this.scheduler.optimize(factors);
  }
}

class SmartScheduler {
  optimize(factors: Factors): DutyCycle {
    // Learn from user patterns
    const predictions = {
      nextUsageTime: this.predictNextUsage(factors),
      messageFrequency: this.getMessageFrequency(factors),
      peerAvailability: this.predictPeerAvailability(factors)
    };
    
    // Optimize discovery schedule
    if (predictions.nextUsageTime > 60 * 60 * 1000) {
      // User unlikely to use soon
      return this.deepSleepSchedule();
    }
    
    if (predictions.messageFrequency > 10) {
      // Heavy user - keep connections warm
      return this.activeSchedule();
    }
    
    return this.balancedSchedule();
  }
}
```

### 2. Piggybacking Architecture

```typescript
class PiggybackDiscovery {
  // Reuse existing connections for discovery
  
  async discoverViaExistingPeers(
    targetId: string,
    activePeers: Peer[]
  ): Promise<DiscoveryResult> {
    // Ask connected peers if they know target
    const queries = activePeers.map(peer => 
      this.queryPeerForTarget(peer, targetId)
    );
    
    const results = await Promise.race([
      Promise.any(queries),
      this.timeout(5000)
    ]);
    
    return results;
  }
  
  private async queryPeerForTarget(
    peer: Peer,
    targetId: string
  ): Promise<PeerInfo> {
    // Piggyback on existing connection
    // No new connection overhead
    return peer.send({
      type: 'PEER_QUERY',
      targetId,
      ttl: 2  // Limited hops
    });
  }
}
```

### 3. Intelligent Caching System

```typescript
class DiscoveryCache {
  private cache: LRUCache<string, CachedPeer>;
  private predictions: PeerPredictor;
  
  async getCachedOrDiscover(
    peerId: string
  ): Promise<Peer | null> {
    const cached = this.cache.get(peerId);
    
    if (cached && this.isLikelyValid(cached)) {
      // Try cached connection info first
      try {
        return await this.quickConnect(cached);
      } catch {
        // Cache miss - fall through
      }
    }
    
    return null;
  }
  
  private isLikelyValid(cached: CachedPeer): boolean {
    // Predict if cached info still valid
    const factors = {
      age: Date.now() - cached.timestamp,
      peerType: cached.deviceType,  // Mobile vs desktop
      historicalStability: cached.connectionHistory,
      networkType: cached.lastNetwork
    };
    
    // Mobile peers on cellular - short validity
    if (factors.peerType === 'mobile' && 
        factors.networkType === 'cellular') {
      return factors.age < 5 * 60 * 1000;  // 5 minutes
    }
    
    // Desktop on stable network - long validity
    if (factors.peerType === 'desktop' &&
        factors.historicalStability > 0.9) {
      return factors.age < 24 * 60 * 60 * 1000;  // 24 hours
    }
    
    return factors.age < 60 * 60 * 1000;  // 1 hour default
  }
}
```

### 4. Platform-Specific Optimizations

```typescript
class PlatformOptimizer {
  // iOS Optimizations
  private iosStrategy = {
    useMultipeerConnectivity(): void {
      // Apple's framework handles radio efficiently
      MCNearbyServiceBrowser.shared.startBrowsing();
    },
    
    usePushKit(): void {
      // VoIP push for incoming connections
      // Wakes app only when needed
    },
    
    useBackgroundTasks(): void {
      // BGProcessingTask for DHT maintenance
      // System schedules optimally
    }
  };
  
  // Android Optimizations
  private androidStrategy = {
    useWorkManager(): void {
      // Respect Doze and App Standby
      const constraints = new Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)
        .build();
        
      WorkManager.enqueue(new DiscoveryWork(), constraints);
    },
    
    useJobScheduler(): void {
      // Batch with other apps
      JobScheduler.schedule({
        id: 'discovery',
        periodic: 15 * 60 * 1000,  // 15 min
        requiresCharging: false,
        requiresDeviceIdle: false
      });
    },
    
    useWifiManager(): void {
      // Scan only when WiFi state changes
      registerReceiver(
        WifiManager.NETWORK_STATE_CHANGED_ACTION,
        this.onNetworkChange
      );
    }
  };
}
```

### 5. Discovery Method Ranking

```typescript
class MethodRanker {
  rankByEfficiency(
    methods: DiscoveryMethod[],
    context: PowerContext
  ): DiscoveryMethod[] {
    const scores = methods.map(method => ({
      method,
      score: this.calculateEfficiencyScore(method, context)
    }));
    
    return scores
      .sort((a, b) => b.score - a.score)
      .map(s => s.method);
  }
  
  private calculateEfficiencyScore(
    method: DiscoveryMethod,
    context: PowerContext
  ): number {
    const weights = {
      powerUsage: -0.4,        // Negative - less is better
      successRate: 0.3,        // Historical success
      latency: -0.2,          // Negative - faster is better
      reliability: 0.1         // Connection stability
    };
    
    const metrics = {
      powerUsage: this.getPowerUsage(method, context),
      successRate: this.getSuccessRate(method),
      latency: this.getAverageLatency(method),
      reliability: this.getReliability(method)
    };
    
    return Object.entries(weights).reduce(
      (score, [key, weight]) => score + metrics[key] * weight,
      0
    );
  }
}
```

## Additional Considerations

### Wake Lock Management

```typescript
class WakeLockManager {
  private activeLocks = new Map<string, WakeLock>();
  
  async acquireForDiscovery(
    duration: number = 5000
  ): Promise<void> {
    // Minimize wake lock duration
    const lock = await navigator.wakeLock.request('screen');
    
    setTimeout(() => {
      lock.release();
    }, duration);
    
    // Track for debugging
    this.activeLocks.set('discovery', lock);
  }
}
```

### Network Condition Adaptation

```typescript
class NetworkAdaptation {
  adaptToConditions(
    networkInfo: NetworkInformation
  ): DiscoveryConfig {
    // Poor network = less aggressive discovery
    if (networkInfo.effectiveType === '2g' ||
        networkInfo.rtt > 500) {
      return {
        method: 'cached_only',
        retries: 1,
        timeout: 10000
      };
    }
    
    // Good WiFi = full discovery
    if (networkInfo.type === 'wifi' &&
        networkInfo.downlink > 10) {
      return {
        method: 'all',
        retries: 3,
        timeout: 5000
      };
    }
    
    return this.defaultConfig;
  }
}
```

### User Experience Trade-offs

```typescript
interface PowerVsPerformance {
  // User-adjustable slider
  preference: 'battery_saver' | 'balanced' | 'performance';
  
  // Resulting behavior
  settings: {
    battery_saver: {
      discoveryInterval: 30 * 60 * 1000,  // 30 min
      backgroundDiscovery: false,
      cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
      methods: ['local', 'cached']
    },
    balanced: {
      discoveryInterval: 5 * 60 * 1000,   // 5 min
      backgroundDiscovery: true,
      cacheDuration: 60 * 60 * 1000,      // 1 hour
      methods: ['local', 'cached', 'relay']
    },
    performance: {
      discoveryInterval: 30 * 1000,        // 30 sec
      backgroundDiscovery: true,
      cacheDuration: 5 * 60 * 1000,       // 5 min
      methods: ['all']
    }
  };
}
```

## Performance Benchmarks

### Target Metrics
```typescript
interface BatteryTargets {
  idle: {
    hourlyDrain: 0.5,    // % per hour
    dailyDrain: 3,       // % per day
  },
  active: {
    hourlyDrain: 8,      // % per hour during use
    discoveryTime: 3000, // ms to find peer
  },
  background: {
    wakeups: 4,          // per hour
    duration: 5000,      // ms per wakeup
  }
}
```

### Measurement Framework
```typescript
class BatteryProfiler {
  async profileDiscoveryMethod(
    method: DiscoveryMethod
  ): Promise<PowerProfile> {
    const before = await this.getBatteryStats();
    
    // Run discovery cycles
    for (let i = 0; i < 100; i++) {
      await method.discover('test-peer');
      await this.sleep(60000);  // 1 minute intervals
    }
    
    const after = await this.getBatteryStats();
    
    return {
      powerUsage: before.level - after.level,
      cpuTime: after.cpuTime - before.cpuTime,
      networkBytes: after.networkBytes - before.networkBytes,
      wakeups: after.wakeups - before.wakeups
    };
  }
}
```

## Implementation Recommendations

### Phase 1: Foundation
1. Implement basic duty cycling
2. Add discovery caching
3. Platform-specific scheduling

### Phase 2: Optimization
1. Predictive scheduling
2. Piggybacking architecture  
3. Advanced cache strategies

### Phase 3: Intelligence
1. ML-based predictions
2. Peer availability learning
3. Adaptive method selection

## Conclusion

Battery-efficient P2P discovery for Volli requires:

1. **Adaptive scheduling** - Adjust to battery and usage
2. **Smart caching** - Minimize redundant discoveries
3. **Platform integration** - Use OS power features
4. **User control** - Let users choose trade-offs
5. **Measurement** - Continuous optimization

Key insight: Perfect P2P discovery isn't worth a dead battery. Smart compromises maintain usability while preserving privacy.