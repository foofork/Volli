# Volly Signaling Server Integration Plan

## Overview

We're forking LiveKit to create `volly-signaling` - a production-ready WebRTC signaling server enhanced with post-quantum cryptography (ML-KEM-768).

## Architecture Decision: LiveKit vs Janus

### LiveKit (Selected) ✅
- **Language**: Go + Pion WebRTC
- **License**: Apache 2.0 (permissive for commercial use)
- **Protocol**: WebSocket + Protocol Buffers
- **Status**: Very active (2024), powers ChatGPT Voice Mode
- **Modification**: Easy Go codebase, structured signaling protocol

### Janus (Not Selected) ❌
- **Language**: C/C++
- **License**: GPL v3 (more restrictive)
- **Protocol**: WebSocket + JSON
- **Status**: Stable but harder to modify
- **Modification**: Complex C++ codebase, plugin architecture

## Post-Quantum Integration Points

### 1. Enhanced JWT Authentication
```go
// Current LiveKit JWT:
type VideoGrant struct {
    RoomJoin bool   `json:"roomJoin"`
    Room     string `json:"room"`
}

// Volly Enhancement:
type VollyVideoGrant struct {
    VideoGrant                      // Inherit all LiveKit capabilities
    PQPublicKey string `json:"pqPublicKey"`    // ML-KEM-768 public key
    PQAlgorithm string `json:"pqAlgorithm"`    // "ML-KEM-768"  
    PQKeyExpiry int64  `json:"pqKeyExpiry"`    // Key rotation timestamp
}
```

### 2. Custom Protocol Messages
```protobuf
// Add to LiveKit's existing protocol:
message VollyPQHandshake {
  string algorithm = 1;           // "ML-KEM-768"
  bytes client_public_key = 2;    // Client's public key
  string session_id = 3;          // Session identifier
}

message VollyPQResponse {
  bytes kem_ciphertext = 1;       // Server's encapsulated secret
  string algorithm = 2;           // Confirmation
  string session_id = 3;          // Session identifier  
  bool success = 4;               // Handshake success
}

// Enhanced SignalRequest:
message VollySignalRequest {
  oneof message {
    // ... all existing LiveKit messages
    VollyPQHandshake pq_handshake = 100;
  }
}
```

### 3. Connection Flow
```
1. Client generates ML-KEM-768 keypair
2. Client embeds public key in JWT token
3. WebSocket connect: wss://signaling?access_token=<pq_jwt>
4. Server validates JWT + extracts PQ public key
5. Server performs key encapsulation → shared secret
6. Server sends ciphertext in JoinResponse/custom message
7. Client decapsulates → establishes shared secret
8. All subsequent signaling encrypted with shared secret
9. WebRTC negotiation continues normally
```

## Repository Structure

```
volly-signaling/                 # Forked from LiveKit
├── pkg/
│   ├── volly/                  # Our post-quantum additions
│   │   ├── crypto/             # ML-KEM-768 implementation
│   │   ├── auth/               # Enhanced JWT handling
│   │   └── protocol/           # Custom protobuf messages
│   ├── rtc/                    # Modified signaling server
│   └── service/                # Enhanced room management
├── proto/
│   ├── livekit_volly.proto     # Our protobuf additions
│   └── ...                     # Existing LiveKit protos
├── cmd/
│   └── server/                 # Modified server entry point
├── docker/
│   ├── Dockerfile              # Production deployment
│   └── docker-compose.yml      # Development setup
└── deploy/
    ├── k8s/                    # Kubernetes manifests
    └── terraform/              # Infrastructure as code
```

## Integration with Main Volly Repository

### Option A: Git Submodule (Recommended)
```bash
# In main Volly repo:
git submodule add https://github.com/volly-org/volly-signaling.git signaling
git submodule update --init --recursive

# Docker Compose integration:
services:
  volly-signaling:
    build: ./signaling
    environment:
      - LIVEKIT_KEYS=api-key:secret
      - REDIS_HOST=redis:6379
```

### Option B: Docker Image
```bash
# Separate CI/CD for signaling server
# Publish to registry: ghcr.io/volly-org/volly-signaling:latest
# Reference in main app's docker-compose.yml
```

## Implementation Timeline

### Phase 1: Fork Setup (3-5 days)
- [x] Fork LiveKit → volly-signaling repository
- [ ] Set up CI/CD pipeline
- [ ] Create Docker configuration
- [ ] Add as submodule to main Volly repo

### Phase 2: Post-Quantum Integration (1-2 weeks)  
- [ ] Add ML-KEM-768 crypto library (Go implementation or CGO wrapper)
- [ ] Implement VollyPQHandshake protocol messages
- [ ] Enhance JWT authentication with PQ public keys
- [ ] Modify signaling server to handle PQ handshakes
- [ ] Add session management for shared secrets

### Phase 3: Testing & Production (1 week)
- [ ] Integration tests with Volly WebRTC components
- [ ] Performance benchmarking vs current signaling server
- [ ] Security audit of post-quantum implementation
- [ ] Production deployment configuration

## Key Benefits

### ✅ Production-Ready Foundation
- Battle-tested signaling infrastructure (LiveKit powers major apps)
- Built-in clustering, Redis persistence, monitoring
- Professional deployment patterns

### ✅ Post-Quantum Security  
- ML-KEM-768 integrated into signaling handshake
- Future-proof against quantum computer attacks
- Session-based encryption for all signaling messages

### ✅ Maintainability
- Fork tracks upstream LiveKit improvements
- Clear separation of Volly-specific modifications  
- Docker isolation for consistent deployments

### ✅ Scalability
- Go + Pion WebRTC excellent performance
- Horizontal scaling with Redis
- Global deployment capability

## Development Workflow

### Local Development
```bash
# Start signaling server locally
cd signaling
docker-compose up -d

# Main Volly app connects to localhost:7880
# All post-quantum features available for testing
```

### Production Deployment
```bash
# Deploy signaling server to multiple regions
# Main Volly app connects via load balancer
# Redis cluster for session persistence across regions
```

This approach gives us enterprise-grade signaling infrastructure while maintaining our post-quantum security requirements.