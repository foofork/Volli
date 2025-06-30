# Important Note

This directory contains the **conceptual structure** for a LiveKit fork with post-quantum enhancements.

## What This Is

- Key files showing how to integrate ML-KEM-768 with LiveKit
- Protocol definitions for post-quantum signaling
- Enhanced JWT implementation
- Docker configuration

## What This Is NOT

- This is NOT a complete LiveKit fork
- It does NOT contain all LiveKit source code
- It cannot be built or run as-is

## Next Steps

To create an actual working fork:

1. Fork the official LiveKit repository: https://github.com/livekit/livekit
2. Add these post-quantum enhancements to the fork
3. Integrate the protocol buffer definitions
4. Implement the full crypto operations
5. Test with the Volly client

## Integration

The main Volly app can use this signaling server via Docker:

```bash
docker-compose -f docker-compose.signaling.yml up -d
```

The docker-compose.signaling.yml file in the root directory shows how to configure and run the signaling server with Redis for session management.
