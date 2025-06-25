# Adaptive Trust System - Unified Connection Strategy

## Overview

This document describes the unified approach to handling diverse connection strategies (DHT, federated, mDNS, relay, etc.) using a single, flexible database schema and consistent interfaces.

## Key Principle: One Schema, Many Strategies

Rather than creating separate tables or schemas for each connection type, we use a unified approach where:
- All connection types share the same database tables
- Strategy-specific details are stored in flexible metadata fields
- Ephemeral data (like DHT routing tables) is kept in memory only
- The same `Connection` interface is returned regardless of discovery method

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Connection Manager                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│  │    DHT    │  │ Federated │  │   mDNS    │  ...    │
│  │ Strategy  │  │ Strategy  │  │ Strategy  │         │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘         │
│        │              │              │                 │
│        └──────────────┴──────────────┘                │
│                       │                                │
│                       ▼                                │
│              Unified Connection                        │
│                  Interface                             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │    Unified Database Schema        │
        │  • trust_decisions               │
        │  • trust_events                  │
        │  • network_profiles              │
        │  • (metadata fields for details) │
        └───────────────────────────────────┘
```

## Database Design

### Core Tables (Shared by All Strategies)

```typescript
// 1. Trust Decisions - applies to all connection types
interface TrustDecision {
  peer_id: string;
  mode: TrustMode;
  strategies_allowed: string[];    // Which strategies to try
  strategies_forbidden: string[];  // Which to avoid
  metadata: {
    // Flexible field for strategy-specific hints
    preferred_strategy?: string;
    connection_hints?: any;
  };
}

// 2. Connection Events - unified logging
interface ConnectionEvent {
  event_type: 'connection_attempt' | 'connection_established' | 'connection_failed';
  peer_id: string;
  strategy: string;
  success: boolean;
  latency?: number;
  metadata: {
    // Strategy-specific details
    [key: string]: any;
  };
  timestamp: Date;
}

// 3. Network Profiles - reconnection optimization
interface NetworkProfile {
  peer_id: string;
  fingerprint: string;
  capabilities: string[];           // Which strategies this peer supports
  last_successful_strategy: string;
  success_rates: {
    [strategy: string]: number;     // Per-strategy success rate
  };
  connection_hints: {
    // Strategy-specific cached data
    dht_node_id?: string;
    relay_preferences?: string[];
    local_addresses?: string[];
    federated_servers?: string[];
  };
}
```

### What Goes in Metadata Fields

```typescript
// DHT Connection Metadata
{
  strategy: 'dht',
  dht_lookup_time: 1250,      // ms
  hop_count: 3,               // DHT hops to find peer
  node_distance: 5,           // XOR distance in DHT
  bootstrap_node: 'node123'   // Which bootstrap node helped
}

// Federated Connection Metadata
{
  strategy: 'federated',
  server_url: 'wss://relay.volli.com',
  server_latency: 45,         // ms
  auth_method: 'token',
  server_version: '1.2.0'
}

// Friend Relay Metadata
{
  strategy: 'friend_relay',
  relay_peer_id: 'friend456',
  relay_path: ['peer123', 'friend456', 'peer789'],
  relay_latency: 150,
  relay_willing: true         // Relay willing to continue
}

// Local mDNS Metadata
{
  strategy: 'mdns',
  local_address: '192.168.1.100',
  service_name: '_volli._tcp',
  txt_records: {
    version: '1.0',
    capabilities: 'webrtc,dtls'
  }
}
```

## Connection Strategy Implementation

### Base Strategy Interface

```typescript
interface IConnectionStrategy {
  name: string;
  priority: number;
  
  // Check if available in current context
  isAvailable(context: Context): Promise<boolean>;
  
  // Estimate connection time
  estimateLatency(peerId: string): Promise<number>;
  
  // Attempt connection (returns same Connection type)
  connect(peerId: string, options?: any): Promise<Connection>;
  
  // Get strategy-specific metadata
  getMetadata(): StrategyMetadata;
}

// All strategies return the same Connection interface
interface Connection {
  id: string;
  peerId: string;
  strategy: string;             // Which strategy established it
  state: ConnectionState;
  transport: Transport;          // Underlying transport
  
  // Same methods regardless of how connected
  send(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  
  // Events
  on(event: 'data', handler: (data: Uint8Array) => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
}
```

### Strategy Implementations

```typescript
// DHT Strategy
class DHTStrategy implements IConnectionStrategy {
  name = 'dht';
  priority = 2;
  
  // Ephemeral state (NOT stored in DB)
  private routingTable: KBucket[];
  private activeLoookups: Map<string, Lookup>;
  
  async connect(peerId: string): Promise<Connection> {
    // Use Kademlia to find peer
    const nodeInfo = await this.lookup(peerId);
    
    // Establish WebRTC connection
    const transport = await this.establishWebRTC(nodeInfo);
    
    // Return unified Connection
    return new Connection({
      peerId,
      strategy: this.name,
      transport,
      metadata: {
        dht_node_id: nodeInfo.id,
        lookup_time: nodeInfo.lookupTime
      }
    });
  }
}

// Federated Strategy  
class FederatedStrategy implements IConnectionStrategy {
  name = 'federated';
  priority = 1;
  
  private servers: string[];
  
  async connect(peerId: string): Promise<Connection> {
    // Connect through server
    const server = await this.selectBestServer();
    const transport = await this.connectViaServer(server, peerId);
    
    // Same Connection interface
    return new Connection({
      peerId,
      strategy: this.name,
      transport,
      metadata: {
        server_url: server,
        server_latency: await this.measureLatency(server)
      }
    });
  }
}
```

## Ephemeral vs Persistent Data

### Ephemeral (Memory Only)

```typescript
class EphemeralConnectionState {
  // DHT routing table - rebuilt each session
  dhtRouting: Map<string, KademliaNode> = new Map();
  
  // Active connections
  activeConnections: Map<string, RTCPeerConnection> = new Map();
  
  // Current session discoveries
  mdnsDiscoveries: Map<string, ServiceInfo> = new Map();
  
  // Recent connection attempts (ring buffer)
  recentAttempts: RingBuffer<AttemptInfo> = new RingBuffer(100);
  
  // Performance metrics (session only)
  strategyMetrics: Map<string, PerformanceMetrics> = new Map();
}
```

### Persistent (Database)

```typescript
class PersistentConnectionData {
  // What we store
  async storeConnectionSuccess(
    peerId: string,
    strategy: string,
    connection: Connection
  ): Promise<void> {
    // Update network profile
    await this.db.network_profiles.update(peerId, {
      last_successful_strategy: strategy,
      last_seen: new Date(),
      [`success_rates.${strategy}`]: this.calculateSuccessRate(peerId, strategy)
    });
    
    // Log event
    await this.db.trust_events.add({
      event_type: 'connection_established',
      peer_id: peerId,
      strategy,
      metadata: connection.metadata,
      timestamp: new Date()
    });
  }
}
```

## Unified Connection Flow

```typescript
class UnifiedConnectionManager {
  private strategies = new Map<string, IConnectionStrategy>();
  
  async connect(peerId: string): Promise<Connection> {
    // 1. Get trust decision (same for all strategies)
    const decision = await this.trustManager.decide();
    
    // 2. Get allowed strategies based on trust mode
    const allowedStrategies = this.getStrategiesForMode(decision.mode);
    
    // 3. Sort by priority and recent success
    const sortedStrategies = await this.rankStrategies(
      allowedStrategies,
      peerId
    );
    
    // 4. Try each strategy
    for (const strategyName of sortedStrategies) {
      const strategy = this.strategies.get(strategyName);
      
      try {
        // Check availability
        if (!await strategy.isAvailable(this.context)) {
          continue;
        }
        
        // Attempt connection
        const connection = await strategy.connect(peerId);
        
        // Store success (unified schema)
        await this.storeSuccess(peerId, strategyName, connection);
        
        // Schedule background upgrade if beneficial
        if (this.canUpgrade(connection, decision)) {
          this.scheduleUpgrade(connection);
        }
        
        return connection;
      } catch (err) {
        // Log failure (unified schema)
        await this.storeFailure(peerId, strategyName, err);
        continue;
      }
    }
    
    throw new Error('All strategies failed');
  }
  
  private async rankStrategies(
    strategies: string[],
    peerId: string
  ): Promise<string[]> {
    const profile = await this.db.network_profiles.get(peerId);
    
    return strategies.sort((a, b) => {
      // First by success rate
      const successA = profile?.success_rates[a] || 0.5;
      const successB = profile?.success_rates[b] || 0.5;
      
      if (successA !== successB) {
        return successB - successA;
      }
      
      // Then by strategy priority
      const priorityA = this.strategies.get(a)?.priority || 0;
      const priorityB = this.strategies.get(b)?.priority || 0;
      
      return priorityB - priorityA;
    });
  }
}
```

## Benefits of Unified Approach

### 1. Simplicity
- One set of tables for all connection types
- Consistent interfaces throughout
- Easier to understand and maintain

### 2. Flexibility
- Easy to add new strategies without schema changes
- Metadata fields handle strategy-specific data
- Can mix and match strategies per connection

### 3. Performance
- No complex joins across strategy-specific tables
- Efficient queries for connection history
- Single index for all connection events

### 4. Evolution
- New strategies just implement the interface
- No database migrations needed
- Backward compatible by design

## Example: Adding a New Strategy

```typescript
// Step 1: Implement the interface
class QuantumStrategy implements IConnectionStrategy {
  name = 'quantum';
  priority = 5;
  
  async connect(peerId: string): Promise<Connection> {
    const quantumChannel = await this.establishQuantumChannel(peerId);
    
    return new Connection({
      peerId,
      strategy: this.name,
      transport: new QuantumTransport(quantumChannel),
      metadata: {
        entanglement_fidelity: 0.99,
        quantum_key: await this.deriveQuantumKey()
      }
    });
  }
}

// Step 2: Register it
connectionManager.registerStrategy(new QuantumStrategy());

// Step 3: Done! No schema changes needed
// Metadata stored in existing flexible fields
```

## Best Practices

### 1. Keep Ephemeral Data Ephemeral
```typescript
// DON'T store in DB
- Active connection objects
- Temporary routing tables
- Session-only metrics

// DO store in DB
- Success/failure rates
- Last successful strategy
- Connection metadata for debugging
```

### 2. Use Metadata Wisely
```typescript
// Good: Useful for reconnection
metadata: {
  server_preference: 'eu-west',
  supports_protocols: ['webrtc', 'quic']
}

// Bad: Too much ephemeral data
metadata: {
  current_cpu_usage: 45.2,
  temp_session_key: 'abc123',
  routing_table_snapshot: {...}  // Too large
}
```

### 3. Strategy Independence
Each strategy should:
- Be self-contained
- Not depend on other strategies
- Handle its own ephemeral state
- Return the same Connection interface

## Conclusion

The unified connection strategy provides a clean, extensible architecture for handling diverse P2P connection methods. By sharing a common schema and interface, we achieve simplicity without sacrificing flexibility, making it easy to add new connection strategies as they emerge.