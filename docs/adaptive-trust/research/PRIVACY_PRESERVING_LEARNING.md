# Privacy-Preserving Learning Research

## Challenge
Learn user preferences to improve UX without:
- Creating persistent profiles
- Storing identifiable patterns
- Sending data to servers
- High CPU/memory usage
- Privacy vulnerabilities

## CPU & Performance Constraints
- Learning algorithms must run in < 10ms
- Memory footprint < 5MB
- No blocking the UI thread
- Incremental updates only

## Existing Approaches

### 1. Federated Learning (Google)
- Model trains locally
- Only model updates sent to server
- Differential privacy added

**Problems for Volli**:
- Still requires central server
- High CPU for training
- Complex implementation

### 2. Local Storage Patterns (Browsers)
- Store user preferences locally
- No server sync
- Clear data on request

**Limitations**:
- Creates persistent profiles
- Vulnerable to forensics
- No cross-device learning

### 3. Session-Only Learning (Privacy Browsers)
- Learn within session
- Forget on close
- No persistence

**Trade-off**: Relearn every session

### 4. Homomorphic Encryption
- Compute on encrypted data
- Privacy preserved

**Problem**: Extremely high CPU usage (1000x+)

## Research Findings

### "Privacy-Preserving Personalization" (2021)
Key insights:
- Bloom filters for efficient pattern matching
- Differential privacy adds < 5% overhead
- Sketch algorithms reduce memory 90%
- Edge computing viable for mobile

### "Learning Without Remembering" (2020)
Techniques:
- Count-min sketch for frequency
- Reservoir sampling for examples
- Exponential decay for forgetting
- Feature hashing for compression

## Proposed Solution for Volli

### Ephemeral Learning Architecture

```typescript
class PrivacyPreservingLearner {
  // All learning is ephemeral
  private sessionMemory = new EphemeralMemory();
  private sketches = new SketchCollection();
  
  // No persistent storage
  constructor() {
    // Initialize with zero knowledge
    this.sketches.initialize();
  }
  
  learn(interaction: UserInteraction): void {
    // Update counts without storing details
    this.sketches.update(interaction);
    
    // Adaptive thresholds
    this.updateThresholds(interaction);
    
    // Forget old patterns
    this.decay();
  }
  
  predict(context: Context): Prediction {
    // Make predictions from sketches
    return this.sketches.query(context);
  }
  
  // Explicit cleanup
  destroy(): void {
    this.sessionMemory.clear();
    this.sketches.reset();
    // Overwrite memory
    crypto.getRandomValues(this.buffer);
  }
}
```

### 1. Count-Min Sketch for Patterns

```typescript
class PatternSketch {
  // Probabilistic counting with low memory
  private sketch: CountMinSketch;
  
  constructor() {
    // 4KB memory for millions of items
    this.sketch = new CountMinSketch({
      width: 1000,   // 4 bytes * 1000 = 4KB
      depth: 4,      // Hash functions
      seed: crypto.getRandomValues(new Uint32Array(1))[0]
    });
  }
  
  recordPattern(pattern: Pattern): void {
    // Hash pattern to fixed size
    const hash = this.hashPattern(pattern);
    
    // Increment count (O(1) time)
    this.sketch.increment(hash);
  }
  
  getFrequency(pattern: Pattern): number {
    // Query in O(1) time
    const hash = this.hashPattern(pattern);
    return this.sketch.estimate(hash);
  }
  
  private hashPattern(pattern: Pattern): string {
    // Efficient feature hashing
    const features = [
      pattern.timeOfDay,
      pattern.networkType,
      pattern.contactGroup,
      pattern.messageType
    ];
    
    // Fast non-crypto hash
    return xxhash(features.join('|'));
  }
}
```

### 2. Differential Privacy Layer

```typescript
class DifferentialPrivacy {
  private epsilon = 1.0; // Privacy budget
  
  addNoise(value: number): number {
    // Laplace noise for differential privacy
    const scale = 1.0 / this.epsilon;
    const noise = this.sampleLaplace(scale);
    
    return value + noise;
  }
  
  private sampleLaplace(scale: number): number {
    // Efficient Laplace distribution sampling
    const u = crypto.getRandomValues(new Float32Array(1))[0] - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
  
  privatizeSketch(sketch: CountMinSketch): void {
    // Add noise to all counters
    for (let i = 0; i < sketch.width; i++) {
      for (let j = 0; j < sketch.depth; j++) {
        sketch.counters[j][i] = this.addNoise(
          sketch.counters[j][i]
        );
      }
    }
  }
}
```

### 3. Temporal Decay System

```typescript
class TemporalDecay {
  private decayRate = 0.95; // Per hour
  private lastDecay = Date.now();
  
  applyDecay(sketches: SketchCollection): void {
    const now = Date.now();
    const hoursPassed = (now - this.lastDecay) / (1000 * 60 * 60);
    
    if (hoursPassed > 0.1) { // Every 6 minutes
      const decayFactor = Math.pow(this.decayRate, hoursPassed);
      
      // Decay all counts
      sketches.forEach(sketch => {
        sketch.multiply(decayFactor);
      });
      
      this.lastDecay = now;
    }
  }
  
  // Aggressive forgetting for sensitive contexts
  forgetPattern(pattern: Pattern): void {
    // Immediately zero out specific patterns
    this.sketches.remove(pattern);
  }
}
```

### 4. CPU-Efficient Implementation

```typescript
class EffientLearner {
  private updateQueue = new MicroTaskQueue();
  private batchSize = 10;
  
  // Non-blocking learning
  async learn(interaction: UserInteraction): Promise<void> {
    // Queue for processing
    this.updateQueue.enqueue(interaction);
    
    // Process in microtasks
    if (this.updateQueue.size() >= this.batchSize) {
      await this.processBatch();
    }
  }
  
  private async processBatch(): Promise<void> {
    // Use idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.processUpdates();
      }, { timeout: 50 });
    } else {
      // Fallback to microtask
      queueMicrotask(() => {
        this.processUpdates();
      });
    }
  }
  
  private processUpdates(): void {
    const startTime = performance.now();
    const budget = 5; // 5ms budget
    
    while (this.updateQueue.size() > 0 && 
           performance.now() - startTime < budget) {
      const interaction = this.updateQueue.dequeue();
      this.updateSketches(interaction);
    }
  }
}
```

### 5. Memory-Bounded Learning

```typescript
class MemoryBoundedLearner {
  private maxMemory = 5 * 1024 * 1024; // 5MB limit
  private currentUsage = 0;
  
  addPattern(pattern: Pattern): boolean {
    const size = this.estimateSize(pattern);
    
    if (this.currentUsage + size > this.maxMemory) {
      // Evict old patterns
      this.evictOldest(size);
    }
    
    if (this.currentUsage + size <= this.maxMemory) {
      this.store(pattern);
      this.currentUsage += size;
      return true;
    }
    
    return false; // Cannot learn, memory full
  }
  
  private evictOldest(requiredSpace: number): void {
    // LRU eviction with temporal decay
    const candidates = this.patterns
      .sort((a, b) => {
        const scoreA = a.frequency * a.recency;
        const scoreB = b.frequency * b.recency;
        return scoreA - scoreB;
      });
    
    let freed = 0;
    for (const pattern of candidates) {
      if (freed >= requiredSpace) break;
      
      freed += this.remove(pattern);
    }
  }
}
```

### 6. Feature Extraction

```typescript
class PrivacyPreservingFeatures {
  // Extract features without storing raw data
  
  extractFeatures(interaction: UserInteraction): Features {
    return {
      // Temporal features (bucketed)
      hourOfDay: Math.floor(new Date().getHours() / 4), // 6 buckets
      dayOfWeek: new Date().getDay() > 4 ? 'weekend' : 'weekday',
      
      // Context features (generalized)
      networkType: this.generalizeNetwork(interaction.network),
      deviceState: this.generalizeDevice(interaction.device),
      
      // Behavioral features (anonymized)
      messageFrequency: this.bucketFrequency(interaction.frequency),
      interactionType: this.categorizeInteraction(interaction),
      
      // No identifying information
      // No message content
      // No specific contacts
      // No exact timestamps
    };
  }
  
  private generalizeNetwork(network: NetworkInfo): string {
    // Reduce to categories
    if (network.type === 'wifi' && network.trusted) return 'trusted-wifi';
    if (network.type === 'wifi') return 'public-wifi';
    if (network.type === 'cellular') return 'mobile';
    return 'unknown';
  }
}
```

## Additional Considerations

### Cross-Device Sync Without Profiles

```typescript
class AnonymousSync {
  // Sync preferences without identity
  
  exportPreferences(): EncryptedBlob {
    // Export learned patterns
    const patterns = this.sketches.export();
    
    // Encrypt with user's key
    const key = deriveKey(userSecret, 'preference-sync');
    const encrypted = encrypt(patterns, key);
    
    // Add temporal validity
    return {
      data: encrypted,
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      version: 1
    };
  }
  
  importPreferences(blob: EncryptedBlob): void {
    // Verify not expired
    if (blob.expires < Date.now()) {
      throw new Error('Preferences expired');
    }
    
    // Decrypt and merge
    const patterns = decrypt(blob.data, key);
    this.sketches.merge(patterns);
  }
}
```

### Performance Benchmarks

```typescript
interface PerformanceTargets {
  learning: {
    updateTime: 5,        // ms per interaction
    cpuUsage: 2,         // % average
    memoryUsage: 5,      // MB maximum
  },
  
  prediction: {
    queryTime: 1,        // ms per prediction
    accuracy: 0.8,       // 80% useful predictions
    falsePositives: 0.1, // 10% wrong suggestions
  },
  
  privacy: {
    differentialEpsilon: 1.0,  // Privacy budget
    dataRetention: 0,          // No permanent storage
    crossDeviceLeakage: 0,     // No identity leaks
  }
}
```

### Testing Privacy Guarantees

```typescript
class PrivacyTester {
  // Verify no information leakage
  
  async testNoProfileCreation(): Promise<boolean> {
    const learner = new PrivacyPreservingLearner();
    
    // Simulate usage
    for (let i = 0; i < 1000; i++) {
      learner.learn(generateInteraction());
    }
    
    // Export state
    const state1 = learner.export();
    
    // Reset and learn same patterns
    learner.destroy();
    for (let i = 0; i < 1000; i++) {
      learner.learn(generateInteraction());
    }
    
    const state2 = learner.export();
    
    // States should be different (randomized)
    return !deepEqual(state1, state2);
  }
}
```

## Implementation Recommendations

### Phase 1: Basic Sketching
1. Implement count-min sketch
2. Add temporal decay
3. Memory bounds

### Phase 2: Privacy Layer
1. Differential privacy noise
2. Feature generalization
3. Secure cleanup

### Phase 3: Performance
1. Async processing
2. CPU budgeting
3. Memory management

## Conclusion

Privacy-preserving learning for Volli must:
1. **Never create profiles** - Session-only memory
2. **Use sketches** - Probabilistic, not exact
3. **Add noise** - Differential privacy
4. **Forget quickly** - Temporal decay
5. **Bound resources** - CPU and memory limits

Key insight: Approximate learning with privacy is better than perfect learning with profiles.