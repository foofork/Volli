# Volli Documentation

Welcome to the Volli documentation. Volli is a post-quantum secure, local-first messaging platform that prioritizes privacy and user sovereignty.

## Documentation Structure

- **[Architecture](./ARCHITECTURE.md)** - System design and component details
- **[Roadmap](./ROADMAP.md)** - Development timeline and milestones
- **[Security Guide](./SECURITY.md)** - Security model and best practices
- **[Developer Guide](./DEVELOPER.md)** - Setup and development workflow
- **[API Reference](./API.md)** - Package APIs and interfaces
- **[Plugin Development](./PLUGINS.md)** - Creating Volli plugins
- **[ADRs](./adr/)** - Architecture Decision Records

## Quick Links

### For Users
- [Getting Started](./getting-started.md)
- [Feature Guide](./features.md)
- [Privacy & Security](./privacy.md)

### For Developers
- [Development Setup](./DEVELOPER.md#setup)
- [Contributing Guide](./CONTRIBUTING.md)
- [Testing Guide](./TESTING.md)

### For Plugin Developers
- [Plugin SDK](./PLUGINS.md)
- [Capability System](./capabilities.md)
- [Plugin Examples](../plugins/)

## Key Features

### 🔐 Post-Quantum Security
- Kyber-1024 for key encapsulation
- Dilithium-3 for digital signatures
- Hybrid mode with X25519/Ed25519

### 📱 Multi-Platform
- Web (SvelteKit)
- Mobile (iOS/Android via Capacitor)
- Desktop (Tauri)

### 🔌 Extensible
- WASM plugin system
- Capability-based security
- Audit logging

### 🌐 Local-First
- Works 100% offline
- IPFS sync when online
- Encrypted local vault

## Getting Help

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/volli/volli/issues)
- **Discord**: Join our community (coming soon)
- **Security**: security@volli.chat (PGP key in [SECURITY.md](./SECURITY.md))