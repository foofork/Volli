# 📚 Volli Documentation Overview

## Project Status: Alpha Development

Volli is an in-development messaging platform with a vision for post-quantum security and local-first operation. Currently in alpha stage with core packages built but not yet integrated.

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

## Current State (December 2024)

### ✅ What's Built
- **Core Packages**: Classical cryptography (libsodium.js)
- **Plugin System**: WASM runtime with sandboxing
- **Web UI**: All screens implemented (no persistence)
- **Test Coverage**: 98.9% on core packages

### ❌ What's Missing
- **Persistent Storage**: Data lost on refresh
- **Post-Quantum Crypto**: Placeholder code only
- **Network Layer**: No P2P messaging
- **Mobile/Desktop Apps**: Not implemented

### 🔬 Research Phase
Currently evaluating production-ready libraries for:
- IndexedDB encryption (Dexie.js vs alternatives)
- P2P networking (IPFS vs WebRTC vs libp2p)
- CRDT libraries (Yjs vs Automerge)
- Post-quantum crypto (liboqs vs pqc-js)

---

## Key Concepts

### Local-First Architecture
All data stored on device, network optional for sync. No servers see plaintext data.

### Post-Quantum Security (Planned)
- **Kyber-1024**: Key encapsulation (NIST approved)
- **Dilithium-3**: Digital signatures (NIST approved)
- **Hybrid Mode**: Classical + PQ for compatibility

### Modular Design
- Files limited to 500 lines
- Performance budgets enforced
- 95%+ test coverage requirement

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
├── apps/           # Applications (only web exists)
│   └── web/       # SvelteKit app (UI only)
├── packages/       # Core libraries
│   ├── identity-core/  # Crypto operations
│   ├── vault-core/     # Storage (not integrated)
│   ├── sync-ipfs/      # P2P sync (not integrated)
│   └── plugins/        # WASM runtime
├── docs/           # This documentation
└── tests/          # Test suites
```

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

*Generated: December 2024*  
*Status: Alpha - Not for production use*