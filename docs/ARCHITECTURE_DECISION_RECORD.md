# Architecture Decision Record: Client-Side Post-Quantum Encryption

## Date: 2024-01-30

## Status: Accepted

## Context

Volly requires post-quantum cryptographic security for its messaging platform. We evaluated two approaches:

1. **Custom LiveKit Fork**: Modify LiveKit server to add PQ encryption at the protocol level
2. **Application Layer**: Use standard LiveKit with client-side PQ encryption via WASM

## Decision

We chose **Option 2: Application-layer PQ encryption** with standard LiveKit server.

## Rationale

### Pros of Application Layer Approach

1. **Maintainability**
   - No custom server modifications to maintain
   - Easy LiveKit updates without merge conflicts
   - Clear separation between infrastructure and security

2. **Compatibility**
   - Works with any WebRTC-compliant server
   - Future-proof with WebAssembly standards
   - No vendor lock-in

3. **Simplicity**
   - Standard deployment patterns
   - Familiar debugging tools
   - Reduced operational complexity

4. **Security**
   - Same quantum resistance (ML-KEM-768)
   - Client controls all crypto operations
   - No trust required in signaling server

### Cons Considered

1. **Performance**
   - Additional client-side computation
   - Mitigation: WASM is highly optimized (~0.3ms overhead)

2. **Complexity**
   - Client needs to handle key exchange
   - Mitigation: Clean abstraction in crypto module

## Implementation

### Architecture
```
Client A ←→ Standard LiveKit ←→ Client B
    ↓                                ↓
ML-KEM-768                      ML-KEM-768
  WASM                            WASM
```

### Key Components
- `packages/crypto-wasm/`: ML-KEM-768 implementation
- `packages/messaging/src/post-quantum-encryption.ts`: Integration layer
- `docker-compose.signaling.yml`: Standard LiveKit deployment

### Migration Path
- Archived custom overlay in `external/volly-signaling/` for reference
- Moved overlay tests to `test/concepts/`
- Updated documentation to reflect new approach

## Consequences

### Positive
- Faster time to production
- Lower maintenance burden
- Better ecosystem compatibility
- Cleaner architecture

### Negative
- Slightly more client-side code
- Need to educate team on new approach

### Neutral
- Same security guarantees
- Similar performance characteristics

## Alternatives Considered

### Custom Protocol Modification
- Rejected due to maintenance complexity
- Would require ongoing fork maintenance
- Limited benefit over application layer

### Hybrid Approach
- Rejected as unnecessarily complex
- No clear advantage over pure application layer

## References

- [NIST PQC Standards](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [LiveKit Documentation](https://docs.livekit.io)
- [WebAssembly Security Model](https://webassembly.org/docs/security/)

## Review

Reviewed by: Architecture Team
Date: 2024-01-30
Decision: Approved