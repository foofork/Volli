# Volly Signaling Server Integration

## Overview

Volly now includes a production-ready signaling server based on LiveKit, enhanced with post-quantum cryptography (ML-KEM-768). This provides the infrastructure needed for WebRTC video calling, audio calls, and peer discovery.

## Quick Start

### 1. Start the Signaling Server
```bash
# From the main Volly directory
docker-compose -f docker-compose.signaling.yml up -d

# Check status
docker-compose -f docker-compose.signaling.yml ps
```

### 2. Verify Connection
```bash
# Health check
curl http://localhost:7880/healthz

# Should return: {"status":"ok"}
```

### 3. Connect from Volly Client
```typescript
// In your Volly web app
const signalingUrl = 'ws://localhost:7880';
const apiKey = 'volly-dev-key';
const apiSecret = 'volly-dev-secret-key-2024';

// Generate access token with post-quantum key
const token = await generateVollyAccessToken(apiKey, apiSecret, {
  room: 'conversation-123',
  identity: 'user-alice',
  pqPublicKey: clientPublicKey  // ML-KEM-768 public key
});

// Connect to signaling server
const connection = new WebSocket(`${signalingUrl}?access_token=${token}`);
```

## Post-Quantum Security Features

### Enhanced JWT Tokens
```typescript
// Standard LiveKit token
const standardToken = {
  roomJoin: true,
  room: 'conversation-123',
  identity: 'user-alice'
};

// Volly enhanced token with post-quantum
const vollyToken = {
  ...standardToken,
  pqPublicKey: 'base64-encoded-ml-kem-768-key',
  pqAlgorithm: 'ML-KEM-768',
  pqKeyExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
};
```

### Signaling Security
1. **Initial Handshake**: Client sends ML-KEM-768 public key in JWT
2. **Key Encapsulation**: Server performs encapsulation → shared secret
3. **Session Encryption**: All signaling messages encrypted with shared secret
4. **Forward Secrecy**: Sessions expire automatically with key rotation

### Integration with Volly Messaging
```typescript
// Connect to signaling for WebRTC
const signalingConnection = new VollySignalingClient({
  url: 'ws://localhost:7880',
  token: vollyToken
});

// Use the same post-quantum session for messaging
const messagingConnection = new VollyMessagingClient({
  postQuantumSession: signalingConnection.getPostQuantumSession()
});
```

## Development Workflow

### Local Development
```bash
# Start signaling server + Redis
docker-compose -f docker-compose.signaling.yml up -d

# Your Volly web app connects to:
# WebSocket: ws://localhost:7880
# HTTP API: http://localhost:7881
# Redis UI: http://localhost:8081 (with --profile debug)
```

### Testing Video Calls
```bash
# Enable monitoring for call quality metrics
docker-compose -f docker-compose.signaling.yml --profile monitoring up -d

# Open Grafana dashboard
open http://localhost:3000  # admin/admin
```

### Environment Configuration
```bash
# Production keys (set in .env file)
export LIVEKIT_API_KEY="your-production-api-key"
export LIVEKIT_API_SECRET="your-production-secret"

# Development with custom settings
export LOG_LEVEL=debug
export VOLLY_PQ_SESSION_TIMEOUT=3600  # 1 hour sessions
```

## Production Deployment

### 1. Security Configuration
```yaml
# docker-compose.production.yml
services:
  volly-signaling:
    environment:
      - LIVEKIT_KEYS=${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - LOG_LEVEL=warn
    deploy:
      replicas: 3
      placement:
        constraints:
          - node.role == worker
```

### 2. TLS Configuration
```bash
# Use a reverse proxy (nginx/traefik) for TLS termination
# Signaling requires WSS:// in production
```

### 3. Horizontal Scaling
```bash
# Multiple signaling instances with shared Redis
docker-compose -f docker-compose.signaling.yml -f docker-compose.production.yml up --scale volly-signaling=3
```

## Integration with Volly Components

### 1. WebRTC Video/Audio Calling
```typescript
// pkg/volli-webrtc (to be implemented)
import { VollySignalingClient } from '@volli/signaling-client';

const signaling = new VollySignalingClient({
  url: process.env.VOLLY_SIGNALING_URL,
  token: await generateToken()
});

// Establish post-quantum secured WebRTC connection
const call = await signaling.createCall({
  video: true,
  audio: true,
  recipient: 'user-bob'
});
```

### 2. Peer Discovery
```typescript
// Find online users through signaling server
const onlineUsers = await signaling.discoverUsers([
  'alice@volli.app',
  'bob@volli.app',
  'charlie@volli.app'
]);
```

### 3. Message Delivery via WebRTC Data Channels
```typescript
// Send messages through WebRTC data channels
const dataChannel = await call.createDataChannel('messages');
dataChannel.send(encryptedMessage);
```

## API Reference

### Signaling Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |
| `/volly/sessions/stats` | GET | Post-quantum session stats |
| `/rtc` | WebSocket | SignalRequest/Response protocol |

### WebSocket Protocol
```javascript
// Connect with JWT
const ws = new WebSocket('ws://localhost:7880?access_token=<jwt>');

// Post-quantum handshake (automatic)
ws.send(JSON.stringify({
  type: 'pq_handshake',
  algorithm: 'ML-KEM-768',
  client_public_key: publicKeyBytes,
  session_id: 'unique-session-id'
}));

// Receive encapsulated secret
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  if (response.type === 'pq_handshake_response') {
    // Decapsulate to get shared secret
    const sharedSecret = decapsulate(response.kem_ciphertext);
    // All subsequent messages encrypted with sharedSecret
  }
};
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVEKIT_API_KEY` | `volly-dev-key` | API key for authentication |
| `LIVEKIT_API_SECRET` | `volly-dev-secret-key-2024` | API secret |
| `VOLLY_PQ_ENABLED` | `true` | Enable post-quantum features |
| `VOLLY_PQ_ALGORITHM` | `ML-KEM-768` | Post-quantum algorithm |
| `VOLLY_PQ_SESSION_TIMEOUT` | `86400` | Session timeout (seconds) |
| `LOG_LEVEL` | `info` | Logging level |

## Monitoring and Debugging

### Session Statistics
```bash
# Get post-quantum session stats
curl http://localhost:7881/volly/sessions/stats

# Response:
{
  "active_sessions": 42,
  "expired_sessions": 8,
  "total_sessions": 50,
  "algorithm": "ML-KEM-768"
}
```

### Redis Session Inspection
```bash
# Connect to Redis
docker-compose -f docker-compose.signaling.yml exec volly-redis redis-cli

# List active sessions
KEYS "session:*"

# Inspect session data
HGETALL "session:abc123def456"
```

### Performance Metrics
- Post-quantum handshake success rate
- Session creation/expiry rates  
- WebRTC connection establishment time
- Memory usage per session
- Redis performance metrics

## Troubleshooting

### Common Issues

**"Connection refused on port 7880"**
```bash
# Check if container is running
docker-compose -f docker-compose.signaling.yml ps

# Check logs
docker-compose -f docker-compose.signaling.yml logs volly-signaling
```

**"Invalid JWT token"**
```bash
# Verify API keys match
echo $LIVEKIT_API_KEY
echo $LIVEKIT_API_SECRET

# Check token generation
node -e "console.log(require('jsonwebtoken').decode('your-token-here'))"
```

**"Post-quantum handshake failed"**
```bash
# Enable debug logging
LOG_LEVEL=debug docker-compose -f docker-compose.signaling.yml up

# Check for invalid public keys
docker-compose -f docker-compose.signaling.yml logs | grep "pq_handshake"
```

This signaling server provides the foundation for Volly's video calling and real-time communication features while maintaining quantum-resistant security throughout the connection establishment process.