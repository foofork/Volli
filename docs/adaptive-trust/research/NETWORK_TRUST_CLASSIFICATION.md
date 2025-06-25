# Network Trust Classification Research

## Overview
Network trust classification is critical for adaptive security decisions. This research examines existing approaches and proposes methods suitable for Volli.

## Existing Approaches

### 1. Android Network Scoring (Android 5.0+)
Android provides a Network Scorer API that rates networks based on:
- **Signal strength**
- **Link speed**
- **Historical performance**
- **User preference**

**Limitations**:
- Requires system-level permissions
- Limited to Android platform
- Focuses on performance, not security

### 2. iOS Network Extension Framework
Apple's approach includes:
- **Wi-Fi network recommendations**
- **Known network detection**
- **Captive portal detection**

**Limitations**:
- Restricted API access
- Platform-specific
- Privacy-focused but limited control

### 3. Windows Network Location Awareness (NLA)
Windows classifies networks as:
- **Domain**: Corporate networks
- **Private**: Home/work networks
- **Public**: Untrusted networks

**Key Innovation**: User can manually classify networks

### 4. NetworkManager (Linux)
Provides network profiles with:
- **Connection UUID tracking**
- **802.1X authentication status**
- **Security method detection**

## Academic Research Findings

### Network Fingerprinting Techniques

**1. BSSID-based Fingerprinting**
```javascript
// Basic implementation approach
function getNetworkFingerprint() {
  return {
    bssid: getAccessPointMAC(),        // Unique AP identifier
    ssid: getNetworkName(),            // Network name
    security: getSecurityType(),       // WPA2/WPA3/Open
    channel: getWiFiChannel(),         // 2.4GHz/5GHz
    manufacturer: getAPManufacturer()  // From MAC OUI
  };
}
```

**Research**: "A Privacy-Preserving WiFi Fingerprinting System" (2019)
- Accuracy: 94% network re-identification
- Privacy: Hashed fingerprints prevent tracking

**2. Network Behavior Analysis**
```javascript
// Behavioral indicators
const trustIndicators = {
  captivePortal: detectCaptivePortal(),     // Requires login
  dnsHijacking: checkDNSIntegrity(),        // Modified responses
  sslInterception: detectSSLMITM(),         // Certificate changes
  trackerPresence: detectTrackers(),        // Analytics/ads
  vpnBlocking: checkVPNConnectivity()      // Blocks VPN protocols
};
```

**Research**: "Detecting Evil Twin Attacks in WiFi Networks" (2020)
- Identifies rogue access points
- Behavioral anomaly detection
- 89% detection accuracy

### 5. Machine Learning Approaches

**Random Forest Classifier** (Most Promising)
```python
features = [
    'packet_loss_rate',
    'latency_variance', 
    'dns_response_time',
    'ssl_handshake_time',
    'port_availability',
    'bandwidth_consistency'
]

# Trained on labeled network data
# Output: trust_score (0-1)
```

**Research**: "ML-based Network Trust Classification" (2021)
- 96% accuracy on test set
- Low false positive rate
- Lightweight for mobile devices

## Proposed Approach for Volli

### Hybrid Classification System

```typescript
interface NetworkTrustClassifier {
  // Level 1: Immediate Classification
  quickClassify(): QuickTrust {
    // Based on cached data and simple checks
    // < 100ms response time
  }
  
  // Level 2: Detailed Analysis
  async deepClassify(): Promise<DetailedTrust> {
    // Behavioral analysis and fingerprinting
    // 1-3 second analysis
  }
  
  // Level 3: User Override
  setUserTrust(level: TrustLevel): void {
    // User's decision is final
    // Persisted locally
  }
}
```

### Implementation Strategy

**Phase 1: Basic Detection**
```typescript
class BasicNetworkTrust {
  private knownNetworks = new Map<string, TrustLevel>();
  
  classify(network: NetworkInfo): TrustLevel {
    // 1. Check user-defined trust
    const fingerprint = this.getFingerprint(network);
    if (this.knownNetworks.has(fingerprint)) {
      return this.knownNetworks.get(fingerprint);
    }
    
    // 2. Check security type
    if (network.security === 'open') {
      return TrustLevel.UNTRUSTED;
    }
    
    // 3. Check common patterns
    if (this.isPublicPattern(network.ssid)) {
      return TrustLevel.PUBLIC;
    }
    
    // 4. Default to unknown
    return TrustLevel.UNKNOWN;
  }
  
  private isPublicPattern(ssid: string): boolean {
    const patterns = [
      /^xfinity/i,
      /^attwifi/i,
      /starbucks/i,
      /airport/i,
      /guest/i,
      /_nomap$/i  // Hidden from maps
    ];
    
    return patterns.some(p => p.test(ssid));
  }
}
```

**Phase 2: Behavioral Analysis**
```typescript
class BehavioralAnalyzer {
  async analyze(): Promise<BehaviorScore> {
    const tests = await Promise.all([
      this.testDNSIntegrity(),
      this.testSSLTransparency(),
      this.testPortAvailability(),
      this.testLatencyConsistency()
    ]);
    
    return this.computeScore(tests);
  }
  
  private async testDNSIntegrity(): Promise<TestResult> {
    // Query known-good domains
    const testDomains = [
      'dns.google',
      'one.one.one.one',
      'example.com'
    ];
    
    for (const domain of testDomains) {
      const result = await this.resolveDNS(domain);
      if (!this.isExpectedIP(domain, result)) {
        return { passed: false, reason: 'DNS hijacking detected' };
      }
    }
    
    return { passed: true };
  }
}
```

**Phase 3: Persistent Learning**
```typescript
class NetworkMemory {
  private db: IDBDatabase;
  
  async remember(network: NetworkInfo, trust: TrustDecision) {
    const entry = {
      fingerprint: this.getFingerprint(network),
      trust: trust.level,
      reason: trust.reason,
      timestamp: Date.now(),
      autoClassified: trust.source === 'automatic'
    };
    
    await this.db.put('networks', entry);
  }
  
  async forget(fingerprint: string) {
    await this.db.delete('networks', fingerprint);
  }
  
  async exportTrust(): Promise<TrustExport> {
    // Allow users to backup their network trust decisions
    const all = await this.db.getAll('networks');
    return this.encrypt(all);
  }
}
```

## Privacy Considerations

### 1. Local Processing Only
- All analysis happens on-device
- No network fingerprints sent to servers
- User trust decisions stay private

### 2. Fingerprint Anonymization
```typescript
function anonymizeFingerprint(network: NetworkInfo): string {
  // Use HMAC with local key
  const localKey = this.getOrCreateLocalKey();
  return hmac(localKey, network.bssid + network.ssid);
}
```

### 3. Minimal Data Collection
- Only collect what's necessary for classification
- Auto-expire old network data
- User can clear all network history

## Implementation Recommendations

### 1. Start Simple
- Begin with SSID pattern matching
- Add user manual classification
- Build behavioral analysis incrementally

### 2. Platform-Specific APIs
```typescript
// Web API limitations
if ('connection' in navigator) {
  // Basic network type detection
}

// Native app capabilities
if (isNative) {
  // Access to WiFi APIs
  // BSSID detection
  // Signal strength
}
```

### 3. Fallback Strategies
- When network detection fails, assume untrusted
- Allow user to manually specify trust
- Provide clear indicators of detection failure

## Testing Approach

### 1. Network Diversity Testing
Test on:
- Home networks (various routers)
- Corporate networks (802.1X)
- Public WiFi (coffee shops, airports)
- Mobile hotspots
- VPN connections
- Tor network

### 2. Attack Simulation
- Evil twin attacks
- DNS hijacking
- SSL stripping
- Captive portal injection

### 3. Performance Benchmarks
- Classification speed < 100ms
- Battery impact < 0.5%
- Memory usage < 10MB

## Open Source Libraries

### 1. Network Detection
- **netifaces** (Python): Cross-platform network interface info
- **network-information-api** (Web): Basic network detection
- **wifi** (Node.js): WiFi network scanning

### 2. Analysis Tools
- **scapy** (Python): Packet analysis
- **netstat** integration: Port availability
- **dns-packet** (JavaScript): DNS query analysis

## Conclusion

Network trust classification for Volli should:
1. **Prioritize user control** - Manual classification overrides automation
2. **Use behavioral analysis** - Not just network names
3. **Maintain privacy** - All processing happens locally
4. **Fail securely** - Unknown networks are untrusted by default
5. **Learn over time** - Remember user decisions

The hybrid approach combining pattern matching, behavioral analysis, and user input provides the best balance of automation and control.