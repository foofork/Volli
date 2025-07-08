# Volly Signaling Server (LiveKit Fork)

This is a fork of [LiveKit](https://github.com/livekit/livekit) enhanced with post-quantum cryptography (ML-KEM-768) for the Volly secure messaging platform.

## Post-Quantum Enhancements

### 1. Enhanced JWT Tokens

- Embeds ML-KEM-768 public keys in access tokens
- Automatic key rotation and expiry
- Backward compatible with standard LiveKit clients

### 2. Quantum-Resistant Signaling

- Post-quantum key encapsulation during WebSocket handshake
- Session-based encryption for all signaling messages
- ML-KEM-768 shared secrets for message protection

### 3. Session Management

- Redis-backed session storage for horizontal scaling
- Automatic cleanup of expired sessions
- Session statistics and monitoring

## Quick Start

### Development

```bash
# Run with Docker
docker build -t volly-signaling -f docker/Dockerfile .
docker run -p 7880:7880 -p 7881:7881 volly-signaling

# Or run directly
go run ./cmd/server --config config-sample.yaml
```

### Integration with Volly

```typescript
// Generate access token with post-quantum key
const token = await generateVollyAccessToken(apiKey, apiSecret, {
  room: 'conversation-123',
  identity: 'user-alice',
  pqPublicKey: mlKem768PublicKey,
});

// Connect to signaling server
const connection = new WebSocket(`ws://localhost:7880?access_token=${token}`);
```

## Architecture

### Modified Components

- `pkg/volly/auth/`: Enhanced JWT with post-quantum support
- `pkg/volly/crypto/`: ML-KEM-768 cryptographic operations
- `proto/volly/`: Post-quantum protocol definitions

### Protocol Extensions

- `PQHandshakeRequest/Response`: Post-quantum key establishment
- `VollySignalRequest/Response`: Enhanced signaling messages
- `PQSessionStatus`: Session state management

## Deployment

Use the provided Docker Compose configuration in the main Volly repository:

```bash
docker-compose -f docker-compose.signaling.yml up -d
```

## License

This fork maintains LiveKit's Apache 2.0 license. See LICENSE for details.
