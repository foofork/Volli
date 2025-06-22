<div align="center">

# 🔐 Volli

**Post-Quantum Secure, Local-First Messaging Platform**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Svelte](https://img.shields.io/badge/Svelte-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![Tests](https://img.shields.io/badge/Tests-70%2B%20Passing-brightgreen)]()
[![Security](https://img.shields.io/badge/Security-Post--Quantum-green)](docs/SECURITY.md)

> **⚠️ Development Status:** Currently in **Phase 2** development. Core foundation complete, working towards v1.0 release.

*Privacy-first messaging with quantum-resistant cryptography and local-first architecture*

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🏗️ Architecture](#️-architecture) • [🔒 Security](#-security)

</div>

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔒 **Quantum-Resistant Security**
- Kyber-1024 (KEM) + Dilithium-3 (signatures)
- X25519/Ed25519 hybrid compatibility
- XChaCha20-Poly1305 encryption
- Forward secrecy and deniability

### 🌐 **Local-First Architecture** 
- 100% offline functionality
- Encrypted SQLite storage
- CRDT-based synchronization
- No server dependencies

</td>
<td width="50%">

### 📱 **Multi-Platform Support**
- Progressive Web App
- Native desktop (Tauri/Electron)
- iOS and Android (planned)
- Single TypeScript codebase

### 🔌 **Extensible Design**
- WASM plugin system
- Capability-based security
- Encrypted search (< 50ms)
- Zero-trust architecture

</td>
</tr>
</table>

## 📋 Prerequisites

- **Node.js** 18+ 
- **npm** 9+
- **Git**

<details>
<summary><strong>Optional Development Tools</strong></summary>

- **Rust** - For Tauri desktop development
- **Xcode** - For iOS development  
- **Android Studio** - For Android development

</details>

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/foofork/Volli.git
cd Volli
npm install
```

### 2. Build All Packages
```bash
npm run build:packages
```

### 3. Start Development

```bash
# Start web application
cd apps/web && npm run dev
# → http://localhost:5173

# Run all tests
npm run test

# Type checking
npm run typecheck

# Lint code
npm run lint
```

> **Note**: The web app runs locally with encrypted storage. No server required!

## 🏗️ Architecture

Volli uses a monorepo structure with the following packages:

- **`@volli/identity-core`** - Post-quantum cryptography and identity management
- **`@volli/vault-core`** - Encrypted local storage with CRDT sync
- **`@volli/messaging`** - Message schemas and encryption helpers  
- **`@volli/sync-ipfs`** - P2P synchronization via IPFS
- **`@volli/plugins`** - WASM plugin runtime
- **`@volli/cap-table`** - Equity and cap table management
- **`@volli/ui-kit`** - Shared Svelte UI components
- **`@volli/web`** - SvelteKit web application

See [Architecture Documentation](docs/ARCHITECTURE.md) for details.

## 🔒 Security

Volli implements defense-in-depth security:

- **Cryptography**: Post-quantum algorithms (Kyber, Dilithium) in hybrid mode
- **Storage**: XChaCha20-Poly1305 encrypted SQLite database
- **Transport**: E2E encryption with forward secrecy
- **Plugins**: Capability-based permissions in WASM sandbox

See [Security Guide](docs/SECURITY.md) for details.

## 🗺️ Development Status

<details open>
<summary><strong>✅ Phase 1: Foundation (Complete)</strong></summary>

- ✅ Post-quantum cryptography implementation
- ✅ Encrypted local storage with CRDT synchronization  
- ✅ Web application with authentication flows
- ✅ Message management and end-to-end encryption
- ✅ Comprehensive test suite (70+ tests passing)
- ✅ Full TypeScript support across packages
- ✅ Multi-package monorepo architecture

</details>

<details>
<summary><strong>🚧 Phase 2: Multi-Platform (In Progress)</strong></summary>

- 🔄 Desktop application (Tauri/Electron)
- 📅 Mobile applications (React Native)
- 📅 P2P synchronization via IPFS
- 📅 Multi-device identity management

</details>

<details>
<summary><strong>📅 Phase 3: Advanced Features (Planned)</strong></summary>

- 📅 WASM plugin system
- 📅 Group messaging and channels
- 📅 Voice and video calling
- 📅 File sharing and collaboration

</details>

> See [**Full Roadmap**](docs/ROADMAP.md) for detailed timeline and milestones.

## 🛠️ Development

<details>
<summary><strong>Package Scripts</strong></summary>

```bash
# Package management
npm install              # Install all dependencies
npm run build:packages   # Build all packages
npm run clean            # Clean build artifacts

# Quality assurance  
npm run test             # Run all tests
npm run typecheck        # TypeScript validation
npm run lint             # Code linting

# Development
npm run dev              # Start development servers
```

</details>

<details>
<summary><strong>Project Structure</strong></summary>

```
volli/
├── packages/           # Core packages
│   ├── identity-core/  # Cryptography & identity
│   ├── vault-core/     # Encrypted storage  
│   ├── messaging/      # Message handling
│   ├── sync-ipfs/      # P2P synchronization
│   ├── plugins/        # Plugin system
│   ├── cap-table/      # Equity management
│   └── ui-kit/         # Shared components
├── apps/              # Applications
│   ├── web/           # SvelteKit web app
│   ├── desktop/       # Desktop app
│   └── mobile/        # Mobile app
└── docs/              # Documentation
```

</details>

See [**Developer Guide**](docs/DEVELOPER.md) for comprehensive setup instructions.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [**Overview**](docs/OVERVIEW.md) | Project introduction and goals |
| [**Architecture**](docs/ARCHITECTURE.md) | System design and components |
| [**Security**](docs/SECURITY.md) | Cryptography and security model |
| [**Developer Guide**](docs/DEVELOPER.md) | Setup and development workflow |
| [**Roadmap**](docs/ROADMAP.md) | Development timeline and milestones |

## 🤝 Contributing

We welcome contributions to Volli! Here's how you can help:

### 🐛 **Bug Reports**
File detailed bug reports with reproduction steps

### 💡 **Feature Requests** 
Propose new features that align with our privacy-first mission

### 🔧 **Code Contributions**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm run test`)
5. Submit a pull request

### 🔒 **Security**
For security vulnerabilities, please create a GitHub issue with the `security` label.

---

<div align="center">

## 📄 License

**Volli** is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

Built with these amazing technologies:

[![NIST PQC](https://img.shields.io/badge/NIST-Post--Quantum%20Cryptography-blue)](https://csrc.nist.gov/projects/post-quantum-cryptography)
[![libsodium](https://img.shields.io/badge/libsodium-Cryptography-orange)](https://libsodium.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-Web%20Framework-FF3E00)](https://kit.svelte.dev/)
[![IPFS](https://img.shields.io/badge/IPFS-Distributed%20Storage-65C2CB)](https://ipfs.io/)

---

### 🔐 Built with ❤️ for Privacy and Security

*"Privacy is not something that I'm merely entitled to, it's an absolute prerequisite."* - Marlon Brando

</div>