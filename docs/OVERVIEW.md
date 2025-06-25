# 📚 Volli Documentation Overview

## Project Status: Alpha Development - P2P Messaging Functional

Volli is an encrypted messaging platform with working P2P communication via WebRTC. Features local-first operation with persistent storage and per-recipient encryption. Currently in alpha stage with core functionality operational.

## Documentation Index

### Core Documentation
- **[Architecture](./ARCHITECTURE.md)** - System design, current vs target state
- **[Security](./SECURITY.md)** - Security model, implementation status, roadmap
- **[Developer Guide](./DEVELOPER.md)** - Setup, development workflow, performance standards
- **[Roadmap](./ROADMAP.md)** - Detailed implementation timeline with research phase

### Technical Specifications
- **[Encrypted Storage Spec](./ENCRYPTED_STORAGE_SPEC.md)** - Storage architecture design
- **[Vault Initialization Flow](./VAULT_INITIALIZATION_FLOW_SPEC.md)** - Vault setup process
- **[Web App Pseudocode](./WEB_APP_PSEUDOCODE.md)** - Implementation logic
- **[Test Architecture](./WEB_APP_TEST_ARCHITECTURE.md)** - Testing strategy

---

## Current State (January 2025)

### ✅ What's Built & Working
- **Core Packages**: Classical cryptography (libsodium.js)
- **Plugin System**: WASM runtime with sandboxing
- **Web UI**: All screens with full functionality
- **Persistent Storage**: IndexedDB with Dexie
- **P2P Messaging**: WebRTC data channels
- **Message Queue**: Persistent with retry logic
- **Per-Recipient Encryption**: Public key cryptography
- **Test Coverage**: 89.7% (113/126 tests passing)

### ❌ What's Missing
- **Signaling Server**: Manual peer connection required
- **Post-Quantum Crypto**: Placeholder code only
- **CRDT Sync**: No conflict resolution
- **Mobile/Desktop Apps**: Not implemented

### 🔬 Next Research Phase
Technologies chosen and implemented:
- ✅ IndexedDB: Dexie.js (implemented)
- ✅ P2P networking: WebRTC with data channels (implemented)

Still evaluating:
- CRDT libraries (Yjs vs Automerge)
- Post-quantum crypto (liboqs vs pqc-js)
- Signaling solutions (Socket.io vs WebSocket vs Firebase)

---

## Key Concepts

### Local-First Architecture
All data stored on device, network optional for sync. No servers see plaintext data.

### P2P Messaging (Implemented)
- **WebRTC Data Channels**: Direct peer-to-peer communication
- **Message Queue**: Persistent with exponential backoff retry
- **Per-Recipient Encryption**: Messages encrypted for specific recipients
- **Offline Support**: Messages queued and delivered when peers reconnect

### Post-Quantum Security (Planned)
- **Kyber-1024**: Key encapsulation (NIST approved)
- **Dilithium-3**: Digital signatures (NIST approved)
- **Hybrid Mode**: Classical + PQ for compatibility

### Modular Design
- Files limited to 500 lines
- Performance budgets enforced
- 89.7% test coverage achieved

---

## Getting Started

### For Developers
1. Clone repository
2. Run `npm install`
3. Run `npm run build:packages`
4. See [Developer Guide](./DEVELOPER.md) for details

### For Users
⚠️ **Not ready for users** - This is development software only

---

## Project Structure

```
volli/
├── apps/           # Applications
│   └── web/       # SvelteKit app (fully functional)
├── packages/       # Core libraries
│   ├── identity-core/  # Crypto operations
│   ├── vault-core/     # Storage (integrated)
│   ├── integration/    # P2P, messaging, queue (NEW)
│   ├── messaging/      # Message management
│   ├── sync-ipfs/      # IPFS sync (not used)
│   └── plugins/        # WASM runtime
├── docs/           # This documentation
└── tests/          # Test suites
```

### Key New Components
- **Network Store**: WebRTC peer management
- **Message Queue**: Persistent retry system
- **Integration Package**: Connects all components

---

## Contributing

Currently not accepting external contributions while in early development. Check back when project reaches beta status.

---

## Resources

### Internal Documentation
- Architecture decisions in `docs/adr/`
- Implementation specs in `docs/specs/`
- SPARC methodology notes

### External Standards
- [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [OWASP Security Guidelines](https://owasp.org/)
- [W3C Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/)

---

*Generated: January 2025*  
*Status: Alpha - P2P Messaging Functional*  
*Not for production use*