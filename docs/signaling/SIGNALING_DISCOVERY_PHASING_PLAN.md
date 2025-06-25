# Signaling & Discovery - Phased Implementation Plan

## 🎉 UPDATE: Phase 1 Complete!
**Status**: ✅ **PHASE 1 COMPLETE** (December 2024)
- WebSocket signaling server fully implemented with TDD
- Client integration with NetworkStore complete
- ICE candidate exchange for NAT traversal implemented
- Ready for production deployment

## Executive Summary

**THE BLOCKER**: ~~Volli has working P2P messaging but users must manually exchange connection offers. Without discovery, it's a demo, not a product.~~ **SOLVED** ✅

## Current State vs Launch Requirements

### What Works ✅
- WebRTC peer connections
- Message encryption and delivery  
- Offline message queue
- Web app UI

### ~~What's Missing~~ What's Complete ✅
- ✅ **Finding peers** (automatic discovery via signaling server)
- ✅ **Presence** (real-time online/offline status)  
- 🟢 **Push notifications** (ready for implementation - signaling infrastructure complete)

## Phased Approach: Ship Fast, Decentralize Later

### 🚀 Phase 1: Minimal Signaling Server (Weeks 1-3)
**Goal**: SHIP IT! Users can actually find each other.
**Team Size**: 1-2 developers

#### Scope
```typescript
// Minimal WebSocket signaling server
interface SignalingServer {
  // Core functions only
  register(userId: string, publicKey: string): void;
  findUser(userId: string): { online: boolean, publicKey: string };
  relay(from: string, to: string, offer: RTCOffer): void;
  
  // That's it! No chat, no storage, no complexity
}
```

#### Implementation
- **Server**: Simple Node.js WebSocket server (~200 lines)
- **Hosting**: Single $5/month VPS can handle 10k users
- **Protocol**: JSON over WebSocket
- **Auth**: Public key signatures (no passwords)

#### Client Changes
```typescript
// Add to NetworkStore
class NetworkStore {
  private signaling?: WebSocket;
  
  async connectToSignaling() {
    this.signaling = new WebSocket('wss://signal.volli.app');
    // Auto-reconnect, presence, offer relay
  }
  
  async discoverPeer(userId: string) {
    // No more manual offer exchange!
    const presence = await this.signaling.send({ type: 'find', userId });
    if (presence.online) {
      await this.connectToPeer(userId);
    }
  }
}
```

#### Success Criteria
- Users can connect by ID (phone/email/username)
- < 1 second discovery time
- WebSocket reconnection handled
- **Can launch with this!**

### 🌐 Phase 2: Federated Signaling (Week 3-4)
**Goal**: Remove single point of failure

#### Scope
- Multiple signaling servers
- Servers share presence info
- Users can run their own
- Client failover logic

#### Architecture
```
User A → signal1.volli.app ←→ signal2.volli.app ← User B
                          ↑
                    Community Server
```

#### Implementation
- Server federation protocol
- DNS-based discovery
- Automatic failover
- Health monitoring

### 🔐 Phase 3: Hybrid P2P Discovery (Week 5-8)
**Goal**: True decentralization with fallbacks

#### Scope  
- **Local**: mDNS for same network
- **DHT**: Kademlia-style for internet
- **Social**: Friend-of-friend discovery
- **Fallback**: Signaling servers

#### Progressive Enhancement
```typescript
class HybridDiscovery {
  async findPeer(peerId: string): Promise<PeerInfo> {
    // Try all methods in parallel
    return Promise.race([
      this.localNetwork.find(peerId),      // Instant on LAN
      this.dht.find(peerId),                // Decentralized
      this.socialGraph.find(peerId),        // Through friends
      this.signaling.find(peerId)           // Fallback
    ]);
  }
}
```

## Implementation Status

For current tasks and progress, see: **[TASK_BOARD.md](../TASK_BOARD.md#signaling-server)**

### Phase 1: MVP Signaling (Weeks 1-3)
**Goal**: Basic WebSocket server for user discovery
**Deliverables**:
- WebSocket server with presence tracking
- Client integration in NetworkStore
- Production deployment with monitoring

### Phase 2: Production Hardening (Weeks 4-6)
**Goal**: Scale to 1000+ users with reliability
**Deliverables**:
- Rate limiting and DDoS protection
- Database persistence and Redis caching
- Federation protocol and documentation

### Phase 3: Decentralization (Weeks 7-12)
**Goal**: Progressive P2P with fallbacks
**Deliverables**:
- mDNS local discovery
- DHT integration (libp2p or Kademlia)
- Hybrid discovery system

### Coordination Gates
1. **Before Production** (Week 3): Security review required
2. **Before Federation** (Week 6): Protocol spec review
3. **Before P2P** (Week 12): Privacy impact assessment

## Configuration Examples

### Phase 1 (Centralized)
```json
{
  "discovery": {
    "methods": ["signaling"],
    "signaling": {
      "url": "wss://signal.volli.app",
      "reconnect": true
    }
  }
}
```

### Phase 2 (Federated)
```json
{
  "discovery": {
    "methods": ["signaling"],
    "signaling": {
      "servers": [
        "wss://signal1.volli.app",
        "wss://signal2.volli.app",
        "wss://community.signal.volli.app"
      ],
      "federation": true
    }
  }
}
```

### Phase 3 (Hybrid)
```json
{
  "discovery": {
    "methods": ["mdns", "dht", "social", "signaling"],
    "priority": "fastest",
    "fallback": true
  }
}
```

## MVP Signaling Protocol

### 1. Register
```json
{
  "type": "register",
  "userId": "alice@volli.app",
  "publicKey": "base64...",
  "signature": "proof-of-key-ownership"
}
```

### 2. Discover
```json
{
  "type": "discover",
  "userId": "bob@volli.app"
}
// Response
{
  "online": true,
  "publicKey": "base64..."
}
```

### 3. Relay Offer
```json
{
  "type": "offer",
  "to": "bob@volli.app",
  "offer": { "sdp": "...", "type": "offer" }
}
```

### 4. Relay Answer
```json
{
  "type": "answer",
  "to": "alice@volli.app",
  "answer": { "sdp": "...", "type": "answer" }
}
```

### 5. ICE Candidate Exchange ✅ IMPLEMENTED
```json
{
  "type": "ice-candidate",
  "to": "bob@volli.app",
  "candidate": {
    "candidate": "candidate:1 1 UDP 2113667326 192.168.1.100 54400 typ host",
    "sdpMLineIndex": 0,
    "sdpMid": "data"
  }
}
```
**Status**: Complete - Enables NAT traversal for production P2P connections

## Deployment Strategy

### Phase 1: Single Server
- Deploy to Hetzner/DigitalOcean ($5/month)
- Nginx + Node.js + PM2
- Let's Encrypt SSL
- CloudFlare for DDoS protection

### Phase 2: Multi-Region
- US East, EU, Asia servers
- GeoDNS routing
- PostgreSQL for state sync
- Redis for presence cache

### Phase 3: Community Nodes
- Docker image for self-hosting
- Federation documentation
- Public node registry
- Monitoring dashboard

## Success Metrics

### Launch Metrics (Phase 1)
- **Connection Success Rate**: > 95%
- **Discovery Time**: < 1 second
- **Server Uptime**: > 99.9%
- **User Growth**: 100 → 1k → 10k

### Decentralization Metrics (Phase 3)
- **P2P Discovery Rate**: > 50%
- **Signaling Fallback**: < 20%
- **Community Nodes**: > 10
- **Federation Coverage**: > 3 regions

## Risks and Mitigation

### Phase 1 Risks
- **Single point of failure**: Accept for MVP, communicate Phase 2 timeline
- **Scaling**: Start small, monitor closely
- **DDoS**: Use CloudFlare, rate limiting

### Long-term Risks
- **Sybil attacks on DHT**: Reputation system
- **Eclipse attacks**: Multiple discovery methods
- **Privacy leaks**: Minimize metadata

## Why This Order?

1. **Phase 1 enables launch** - Without discovery, Volli is unusable
2. **Phase 2 builds trust** - Federation shows commitment to decentralization  
3. **Phase 3 delivers vision** - True P2P as promised

## Team Coordination & Dependencies

### Phase 1 Dependencies
- **Requires**: Working WebRTC implementation ✅
- **Blocks**: User onboarding, mobile app launch
- **Team**: 1 backend dev, 1 frontend dev

### Phase 2 Dependencies  
- **Requires**: Phase 1 complete, 100+ active users
- **Blocks**: Community growth
- **Team**: +1 DevOps engineer

### Phase 3 Dependencies
- **Requires**: Stable federated network
- **Blocks**: True decentralization claim
- **Team**: +1 P2P specialist

### Critical Coordination Points

1. **Before Production (Week 3)**
   - Security review of protocol
   - Load testing results
   - Deployment runbook
   
2. **Before Federation (Week 6)**
   - Protocol specification review
   - Community server documentation
   - Backwards compatibility plan

3. **Before P2P (Week 12)**
   - Privacy impact assessment
   - Performance benchmarks
   - Fallback testing

## Success Metrics & Go/No-Go

### Phase 1 Launch Criteria
- ✅ 100 concurrent users stable
- ✅ < 100ms connection time
- ✅ 99.9% uptime for 48 hours
- ✅ Zero security vulnerabilities

### Phase 2 Launch Criteria  
- ✅ 1000 concurrent users stable
- ✅ Federation between 3 servers
- ✅ < 1 second failover time
- ✅ Community documentation complete

### Phase 3 Launch Criteria
- ✅ 50% P2P discovery success
- ✅ < 5 second DHT lookup
- ✅ Privacy audit passed
- ✅ Works behind NAT/firewall

## Next Steps

1. **Week 1**: Start signaling server development
2. **Week 2**: Begin client integration  
3. **Week 3**: Deploy to production
4. **Week 4**: **SOFT LAUNCH** to beta users
5. **Week 6**: **PUBLIC LAUNCH** with federation

The key insight: Ship centralized but with a clear path to decentralization. Users need to connect TODAY.