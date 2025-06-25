# Lightweight Performance Monitoring: The Optimization Paradox

## The Paradox
Performance monitoring and optimization code must:
- Use < 0.1% CPU to measure CPU usage
- Use < 100KB memory to track memory usage  
- Use minimal battery to optimize battery
- Not block UI while improving UI responsiveness

**"The cure cannot be worse than the disease"**

## Principles

### 1. Sampling Over Completeness
```typescript
// ❌ BAD: Measure everything
class HeavyMonitor {
  measureEveryFunction() {
    // Adds overhead to EVERY function call
    performance.mark('start');
    // ... function execution ...
    performance.mark('end');
    performance.measure('duration', 'start', 'end');
  }
}

// ✅ GOOD: Statistical sampling
class LightMonitor {
  private sampleRate = 0.01; // 1% sampling
  
  measureMaybe(fn: Function) {
    if (Math.random() > this.sampleRate) {
      return fn(); // 99% of time: zero overhead
    }
    
    // Only measure 1% of calls
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.recordSample(duration);
    return result;
  }
}
```

### 2. Passive Observation
```typescript
// ❌ BAD: Active polling
class ActiveMonitor {
  constructor() {
    setInterval(() => {
      this.checkMemory();    // Allocates memory
      this.checkCPU();       // Uses CPU
      this.checkBattery();   // Wakes up system
    }, 1000);
  }
}

// ✅ GOOD: Event-driven
class PassiveMonitor {
  constructor() {
    // Only measure when something happens
    if ('PerformanceObserver' in window) {
      new PerformanceObserver(this.handleMetrics)
        .observe({ entryTypes: ['measure', 'navigation'] });
    }
    
    // Piggyback on existing events
    document.addEventListener('visibilitychange', 
      this.onVisibilityChange, { passive: true });
  }
}
```

### 3. Lazy Aggregation
```typescript
// ❌ BAD: Immediate processing
class EagerProcessor {
  onMetric(value: number) {
    this.values.push(value);           // Memory growth
    this.average = this.calculateAvg(); // CPU each time
    this.stdDev = this.calculateStd();  // More CPU
    this.updateUI();                    // DOM manipulation
  }
}

// ✅ GOOD: Batched processing
class LazyProcessor {
  private buffer = new RingBuffer(100); // Fixed memory
  private dirty = false;
  
  onMetric(value: number) {
    this.buffer.add(value);
    this.dirty = true;
    // That's it! No processing
  }
  
  // Process only when needed
  getStats() {
    if (!this.dirty) return this.cached;
    
    this.cached = {
      avg: this.quickAverage(),    // O(1) running average
      p95: this.buffer.percentile(95) // Only when requested
    };
    this.dirty = false;
    return this.cached;
  }
}
```

### 4. Zero-Cost Abstractions
```typescript
// Build-time optimization flags
const MONITORING = process.env.NODE_ENV !== 'production';

class OptimizedMonitor {
  measure<T>(name: string, fn: () => T): T {
    if (!MONITORING) {
      // Completely removed in production builds
      return fn();
    }
    
    // Development only
    const start = performance.now();
    const result = fn();
    this.record(name, performance.now() - start);
    return result;
  }
}

// Compiled away entirely in production
if (MONITORING) {
  monitor.measure('expensive-operation', () => {
    doExpensiveWork();
  });
} else {
  doExpensiveWork(); // Direct call, zero overhead
}
```

## Implementation Strategies

### 1. Ring Buffer for Fixed Memory
```typescript
class RingBuffer<T> {
  private buffer: T[];
  private index = 0;
  private full = false;
  
  constructor(private size: number) {
    this.buffer = new Array(size);
  }
  
  add(value: T): void {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.size;
    if (this.index === 0) this.full = true;
  }
  
  // O(1) operations only
  get length(): number {
    return this.full ? this.size : this.index;
  }
  
  // Approximate percentile without sorting
  percentile(p: number): T {
    // Reservoir sampling for approximate percentile
    const k = Math.ceil(this.length * p / 100);
    return this.quickSelect(k);
  }
}
```

### 2. Probabilistic Counters
```typescript
class ProbabilisticCounter {
  private count = 0;
  private probability = 1.0;
  
  increment(): void {
    if (Math.random() < this.probability) {
      this.count++;
      
      // Morris counter: reduce probability as count grows
      if (this.count > 100 && Math.random() < 0.5) {
        this.count = Math.floor(this.count / 2);
        this.probability /= 2;
      }
    }
  }
  
  estimate(): number {
    return this.count / this.probability;
  }
}
```

### 3. Passive Resource Monitoring
```typescript
class ResourceMonitor {
  private lastMeasure = {
    cpu: 0,
    memory: 0,
    time: Date.now()
  };
  
  // Piggyback on requestAnimationFrame
  private rafMonitor = () => {
    // Only if page visible
    if (document.hidden) return;
    
    // Sample occasionally
    if (Math.random() > 0.05) {
      requestAnimationFrame(this.rafMonitor);
      return;
    }
    
    // Lightweight measurement
    const now = Date.now();
    const delta = now - this.lastMeasure.time;
    
    if (delta > 1000) { // Once per second max
      this.sampleResources();
      this.lastMeasure.time = now;
    }
    
    requestAnimationFrame(this.rafMonitor);
  };
  
  private async sampleResources() {
    // Use existing APIs that browser already tracks
    if ('memory' in performance) {
      this.lastMeasure.memory = (performance as any).memory.usedJSHeapSize;
    }
    
    // CPU estimate from main thread blocking
    const start = performance.now();
    await new Promise(r => setTimeout(r, 0));
    const mainThreadBusy = performance.now() - start > 16;
    
    this.recordSample({ mainThreadBusy });
  }
}
```

### 4. Smart Trigger System
```typescript
class SmartTriggers {
  // Only activate monitoring when needed
  
  private triggers = {
    highMemory: {
      threshold: 200 * 1024 * 1024, // 200MB
      check: () => performance.memory?.usedJSHeapSize,
      action: () => this.startDetailedMemoryTracking()
    },
    
    slowUI: {
      threshold: 100, // 100ms interaction
      check: () => this.lastInteractionTime,
      action: () => this.startPerformanceTracing()
    },
    
    lowBattery: {
      threshold: 0.2,
      check: () => navigator.getBattery?.()?.level,
      action: () => this.enableAggressivePowerSaving()
    }
  };
  
  // Check triggers lazily
  private checkTriggers = debounce(() => {
    for (const [name, trigger] of Object.entries(this.triggers)) {
      const value = trigger.check();
      if (value > trigger.threshold) {
        trigger.action();
      }
    }
  }, 5000); // Check every 5 seconds max
}
```

### 5. User-Controlled Verbosity
```typescript
interface MonitoringLevels {
  OFF: 0,      // Zero overhead
  BASIC: 1,    // < 0.1% overhead
  DETAILED: 2, // < 1% overhead  
  DEBUG: 3     // < 5% overhead
}

class AdaptiveMonitor {
  private level = MonitoringLevels.BASIC;
  
  shouldMeasure(importance: number): boolean {
    return importance <= this.level;
  }
  
  measure(name: string, importance: number, fn: Function) {
    if (!this.shouldMeasure(importance)) {
      return fn(); // Zero overhead path
    }
    
    // Overhead proportional to monitoring level
    switch (this.level) {
      case MonitoringLevels.BASIC:
        return this.lightMeasure(name, fn);
      case MonitoringLevels.DETAILED:
        return this.detailedMeasure(name, fn);
      case MonitoringLevels.DEBUG:
        return this.fullMeasure(name, fn);
    }
  }
}
```

## Real-World Example: Monitoring P2P Discovery

```typescript
class LightweightDiscoveryMonitor {
  // Fixed memory allocation
  private stats = {
    attempts: new RingBuffer<number>(100),
    successes: new RingBuffer<boolean>(100),
    latencies: new RingBuffer<number>(50),
    methods: new Map<string, ProbabilisticCounter>()
  };
  
  // Passive monitoring
  monitorDiscovery(method: string, operation: () => Promise<Peer>) {
    // 5% sampling rate for non-critical paths
    if (method !== 'critical' && Math.random() > 0.05) {
      return operation();
    }
    
    const start = performance.now();
    
    return operation()
      .then(peer => {
        // Success - record sample
        if (Math.random() < 0.1) { // 10% of successes
          this.stats.successes.add(true);
          this.stats.latencies.add(performance.now() - start);
        }
        return peer;
      })
      .catch(err => {
        // Always record failures (rare, important)
        this.stats.successes.add(false);
        throw err;
      });
  }
  
  // Lazy aggregation
  getReport() {
    // Only calculate when requested
    return {
      successRate: this.approximateSuccessRate(),
      avgLatency: this.stats.latencies.percentile(50),
      p95Latency: this.stats.latencies.percentile(95)
    };
  }
  
  // Zero-allocation success rate
  private approximateSuccessRate(): number {
    let successes = 0;
    let total = 0;
    
    // Scan last 20 samples only
    for (let i = 0; i < Math.min(20, this.stats.successes.length); i++) {
      if (this.stats.successes.get(i)) successes++;
      total++;
    }
    
    return total > 0 ? successes / total : 0;
  }
}
```

## Testing Performance Impact

```typescript
class MonitoringOverheadTest {
  async measureOverhead() {
    const iterations = 10000;
    
    // Baseline: no monitoring
    const baselineStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.doWork();
    }
    const baselineTime = performance.now() - baselineStart;
    
    // With monitoring
    const monitor = new LightweightMonitor();
    const monitoredStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      monitor.measure('work', () => this.doWork());
    }
    const monitoredTime = performance.now() - monitoredStart;
    
    // Calculate overhead
    const overhead = ((monitoredTime - baselineTime) / baselineTime) * 100;
    
    console.assert(overhead < 0.1, `Monitoring overhead too high: ${overhead}%`);
  }
}
```

## Guidelines for Volli

1. **Default to OFF in production** - Zero overhead unless user enables
2. **Sample, don't trace** - 1-5% sampling for most metrics
3. **Fixed memory** - Ring buffers, no growing arrays
4. **Lazy computation** - Calculate only when displayed
5. **Piggyback existing work** - Don't create new timers
6. **User control** - Let power users enable detailed monitoring

## Conclusion

Lightweight monitoring is possible by:
- Being probabilistic instead of exact
- Being lazy instead of eager
- Being passive instead of active
- Being selective instead of comprehensive

The goal: **Provide 80% of the insights with 1% of the overhead.**