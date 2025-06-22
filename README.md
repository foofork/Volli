# 🔐 Volli - Post-Quantum Secure Messaging

<div align="center">
  <img src="docs/assets/volli-logo.svg" alt="Volli Logo" width="200" />
  
  **Local-first, privacy-first messaging with post-quantum security**
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Security](https://img.shields.io/badge/security-post--quantum-green.svg)](docs/SECURITY.md)
  [![Docs](https://img.shields.io/badge/docs-available-brightgreen.svg)](docs/OVERVIEW.md)
  
  🎉 **Phase 1 Complete!** All core packages implemented. See [PHASE1_CHECKLIST.md](./PHASE1_CHECKLIST.md) | [SPARC Report](./docs/SPARC_PHASE1_COMPLETION.md)
</div>

## 🚀 Features

- **🔒 Post-Quantum Security**: Kyber-1024 (KEM) + Dilithium-3 (signatures) with X25519/Ed25519 hybrid mode
- **📱 Multi-Platform**: Single codebase for Web, iOS, Android, and Desktop
- **🔌 Extensible**: WASM plugin system with capability-based security
- **🌐 Local-First**: Works 100% offline with P2P sync when online
- **🎯 Zero Trust**: No server ever sees plaintext or key material
- **🔍 Private Search**: Encrypted local search with < 50ms performance

## 📋 Requirements

- Node.js 18+ and npm 9+
- Git
- Optional: iOS/Android dev tools for mobile development
- Optional: Rust for Tauri desktop development

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/volli/volli.git
cd volli
npm install
```

### 2. Build All Packages
```bash
npm run build
```

### 3. Start Development
```bash
# Web development
npm run dev

# Run tests
npm run test

# Type checking
npm run typecheck
```

## 🏗️ Architecture

Volli uses a monorepo structure with the following packages:

- **`@volli/identity-core`** - Post-quantum cryptography and identity management
- **`@volli/vault-core`** - Encrypted local storage with CRDT sync
- **`@volli/messaging`** - Message schemas and encryption helpers  
- **`@volli/sync-ipfs`** - P2P synchronization via IPFS
- **`@volli/plugins`** - WASM plugin runtime
- **`@volli/ui-kit`** - Shared Svelte UI components

See [Architecture Documentation](docs/ARCHITECTURE.md) for details.

## 🔒 Security

Volli implements defense-in-depth security:

- **Cryptography**: Post-quantum algorithms (Kyber, Dilithium) in hybrid mode
- **Storage**: XChaCha20-Poly1305 encrypted SQLite database
- **Transport**: E2E encryption with forward secrecy
- **Plugins**: Capability-based permissions in WASM sandbox

See [Security Guide](docs/SECURITY.md) for details.

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- Post-quantum crypto implementation
- Encrypted local storage
- Basic messaging UI

### Phase 2: Distribution 🚧
- Mobile apps (iOS/Android)
- P2P sync via IPFS
- Multi-device support

### Phase 3: Extensibility 📅
- Plugin system
- Group messaging
- Voice/video calls

See [Full Roadmap](docs/ROADMAP.md) for timeline.

## 🧑‍💻 Development

### Using SPARC Methodology
```bash
# List available SPARC modes
npm run sparc:modes

# Run specific mode
npm run sparc:run architect "design new feature"

# Test-driven development
npm run sparc:tdd "implement user stories"
```

See [Developer Guide](docs/DEVELOPER.md) for complete instructions.

## 📚 Documentation

- [Overview](docs/OVERVIEW.md) - Project introduction
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Security](docs/SECURITY.md) - Security model
- [Developer Guide](docs/DEVELOPER.md) - Setup and development
- [API Reference](docs/API.md) - Package APIs
- [Plugin Guide](docs/PLUGINS.md) - Creating plugins

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Reporting Security Issues
Please report security vulnerabilities to security@volli.chat. See [Security Policy](SECURITY.md) for details.

## 📄 License

Volli is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [NIST PQC](https://csrc.nist.gov/projects/post-quantum-cryptography) for post-quantum standards
- [libsodium](https://libsodium.org/) for cryptographic primitives  
- [IPFS](https://ipfs.io/) for distributed storage
- [SvelteKit](https://kit.svelte.dev/) for the web framework

---

<div align="center">
  Built with ❤️ for privacy and security
</div>