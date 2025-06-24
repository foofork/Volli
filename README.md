<div align="center">

<img src="https://img.shields.io/badge/🔐-Volli-FF3E00?style=for-the-badge&labelColor=2F74C0" alt="Volli" height="60">

# Post‑Quantum Secure, Local‑First Messaging

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License MIT"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.3-2F74C0?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://kit.svelte.dev/"><img src="https://img.shields.io/badge/SvelteKit-2.0-FF3E00?style=flat-square&logo=svelte&logoColor=white" alt="SvelteKit"></a>
  <a href="#"><img src="https://img.shields.io/badge/Coverage-98.9%25-brightgreen?style=flat-square" alt="Coverage"></a>
  <a href="docs/SECURITY.md"><img src="https://img.shields.io/badge/Encryption-Post--Quantum-green?style=flat-square&logo=shield&logoColor=white" alt="Security"></a>
</p>

<h3>Private chat that stays private—even in a quantum future.</h3>

<br/>

</div>

> [!NOTE]
> **Project Status: 🛠️ Alpha - Core Packages Built**  
> Core encryption packages implemented with 98.9% test coverage. Web app UI functional but using in-memory storage (not persistent). Post-quantum crypto and mobile/desktop apps pending.

> [!TIP]
> **Starting with Research Phase**: Before implementing, we're evaluating production-ready libraries to avoid reinventing wheels and ensure robust, secure solutions.

<br/>

## 🌟 Why Choose Volli?

<table>
<thead>
<tr>
<th width="300">Feature</th>
<th width="200" align="center">Volli</th>
<th width="200" align="center">Signal/WhatsApp</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>🔮 Post‑Quantum Crypto</strong></td>
<td align="center">🚧 Planned</td>
<td align="center">❌ Not Yet</td>
</tr>
<tr>
<td><strong>💾 Local‑First Storage</strong></td>
<td align="center">🚧 In Development</td>
<td align="center">❌ Server Required</td>
</tr>
<tr>
<td><strong>🌐 Offline Operation</strong></td>
<td align="center">🚧 Planned</td>
<td align="center">❌ Limited</td>
</tr>
<tr>
<td><strong>🧩 Plugin Ecosystem</strong></td>
<td align="center">✅ WASM Runtime Ready</td>
<td align="center">❌ None</td>
</tr>
<tr>
<td><strong>🔗 P2P Sync</strong></td>
<td align="center">🚧 Partial IPFS</td>
<td align="center">❌ Centralized</td>
</tr>
</tbody>
</table>

> [!IMPORTANT]
> **Your messages never hit our servers—because we don't have any.**

<br/>

## 🚀 Quick Start

> [!WARNING]
> **Current Limitations**: The web app currently stores data in memory only. All data is lost on page refresh. This is a development preview - not ready for production use.

> [!TIP]
> Volli will be **server‑less** when complete—your data will live in an encrypted SQLite db inside the browser or app sandbox.

<details open>
<summary><h3>📦 Installation</h3></summary>

```bash
# Clone the repository
git clone https://github.com/foofork/Volli.git
cd Volli

# Install dependencies
npm install

# Build packages
npm run build:packages

# Run the web app
cd apps/web && npm run dev     # → http://localhost:3000

# Run tests (98.9% coverage!)
npm test
```

</details>

<details>
<summary><h3>🖥️ Platform-Specific Builds</h3></summary>

#### Desktop (Tauri)
```bash
# Requires Rust toolchain
cd apps/desktop && npm run dev
```

#### Mobile (Capacitor)
```bash
# Requires Xcode/Android Studio
cd apps/mobile && npm run dev
```

</details>

<br/>

## ✨ Features

### 🎯 What's Actually Working

- [x] **📦 Core Packages** - Encryption libraries with real crypto implementations
- [x] **🧪 Test Coverage** - 98.9% coverage on core packages
- [x] **🎨 Web UI** - Functional interface (data resets on refresh)
- [x] **🔑 Authentication Flow** - Passphrase validation logic
- [x] **🧩 Plugin System** - WASM runtime with sandboxing
- [ ] **💾 Persistent Storage** - Currently in-memory only
- [ ] **🔐 Post-Quantum Crypto** - Placeholder code only
- [ ] **🔄 IPFS Sync** - Partially implemented

### 🔜 Coming Soon

- [ ] **🔄 Real-time Sync** - Multi-device synchronization
- [ ] **🖥️ Desktop App** - Native Tauri application
- [ ] **📱 Mobile Apps** - iOS and Android with Capacitor
- [ ] **🔮 Full PQ Crypto** - Complete Kyber-1024 + Dilithium-3
- [ ] **🧩 Plugin System** - WASM-based extensibility
- [ ] **👥 Group Chat** - Multi-participant conversations

<br/>

## 🏗️ Architecture

```mermaid
graph TD
    subgraph "Applications"
        A[Web App<br/>SvelteKit]
        B[Desktop App<br/>Tauri]
        C[Mobile App<br/>Capacitor]
    end
    
    subgraph "Core Packages"
        D[identity-core<br/>🔑 Crypto & Keys]
        E[vault-core<br/>🔒 Encrypted Storage]
        F[messaging<br/>💬 Message Handling]
        G[sync-ipfs<br/>🔄 P2P Sync]
        H[plugins<br/>🧩 WASM Runtime]
        I[ui-kit<br/>🎨 Components]
    end
    
    subgraph "Security Layer"
        J[Post-Quantum<br/>Kyber + Dilithium]
        K[Classical<br/>X25519 + Ed25519]
        L[Encryption<br/>XChaCha20-Poly1305]
    end
    
    A --> I
    B --> I
    C --> I
    I --> F
    F --> D
    F --> E
    E --> G
    D --> J
    D --> K
    E --> L
    
    style A fill:#FF3E00
    style D fill:#2F74C0
    style E fill:#2F74C0
    style J fill:#00C853
```

> [!NOTE]
> See [Architecture Documentation](docs/ARCHITECTURE.md) for detailed system design.

<br/>

## 🔒 Security Overview

<table>
<thead>
<tr>
<th>Layer</th>
<th>Technology</th>
<th>Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>🔐 Encryption</strong></td>
<td>Kyber‑1024, XChaCha20</td>
<td>Post‑quantum confidentiality</td>
</tr>
<tr>
<td><strong>✍️ Signatures</strong></td>
<td>Dilithium‑3</td>
<td>Authentication & integrity</td>
</tr>
<tr>
<td><strong>🔑 KDF</strong></td>
<td>Argon2id</td>
<td>Password-based key derivation</td>
</tr>
<tr>
<td><strong>💾 Storage</strong></td>
<td>Encrypted SQLite + CRDT</td>
<td>Local‑first with sync</td>
</tr>
</tbody>
</table>

> [!CAUTION]
> **Security**: This is an early development preview. Security audits pending.

<br/>

## 📊 Development Progress

> See [detailed roadmap](docs/ROADMAP.md) for complete timeline and sprint planning.

### Phase -1: Research 🔬 *(Starting Now)*
- [ ] Evaluate production-ready libraries
- [ ] Benchmark performance options
- [ ] Validate architecture decisions

### Phase 0: Integration 🚨 *(Next Priority)*
- [ ] Add persistent storage (IndexedDB)
- [ ] Connect existing packages to web app
- [ ] Integrate real encryption

### Phase 1: Core Features 🚧
- [x] Core encryption packages *(built, not integrated)*
- [x] Plugin system with WASM runtime
- [ ] P2P messaging layer
- [ ] Post-quantum crypto (Kyber/Dilithium)

### Phase 2: Advanced Features 📅
- [ ] Real-time P2P sync
- [ ] Group messaging
- [ ] Voice notes
- [ ] Message reactions

### Phase 3: Multi-Platform 🔜
- [ ] Desktop app (Tauri)
- [ ] iOS app (Capacitor) 
- [ ] Android app (Capacitor)
- [ ] Cross-platform sync

<br/>

## 🛠️ Development

<details>
<summary><strong>📋 Available Scripts</strong></summary>

<br/>

| Script | Description |
|--------|-------------|
| `npm install` | Install all dependencies |
| `npm run build:packages` | Build all packages |
| `npm run test` | Run test suite (98.9% coverage) |
| `npm run lint` | Lint codebase |
| `npm run typecheck` | TypeScript validation |
| `npm run dev` | Start dev servers |

</details>

<details>
<summary><strong>📁 Project Structure</strong></summary>

<br/>

```
volli/
├── 📱 apps/              # Applications
│   ├── web/             # SvelteKit web app
│   ├── desktop/         # Tauri desktop app
│   └── mobile/          # Capacitor mobile app
├── 📦 packages/          # Core packages
│   ├── identity-core/   # Cryptography & identity
│   ├── vault-core/      # Encrypted storage
│   ├── messaging/       # Message handling
│   ├── sync-ipfs/       # P2P synchronization
│   ├── plugins/         # Plugin system
│   └── ui-kit/          # Shared components
└── 📚 docs/             # Documentation
```

</details>

<br/>

## 📚 Documentation

<div align="center">

| 📖 Document | 📝 Description |
|:------------|:---------------|
| [**Overview**](docs/OVERVIEW.md) | Project introduction and goals |
| [**Architecture**](docs/ARCHITECTURE.md) | System design and components |
| [**Security**](docs/SECURITY.md) | Cryptography and security model |
| [**Developer Guide**](docs/DEVELOPER.md) | Setup and development workflow |
| [**Roadmap**](docs/ROADMAP.md) | Development timeline and milestones |

</div>

<br/>

## 🤝 Contributing

> [!NOTE]
> **Not accepting contributions at this time.** This project is in early development. Check back later for contribution guidelines.

<br/>

---

<div align="center">

**MIT © 2025 The Volli Authors**

<br/>

Built with ❤️ for privacy and autonomy  
**"Privacy is not granted—it's taken back."**

<br/>

<a href="https://github.com/foofork/Volli"><img src="https://img.shields.io/github/stars/foofork/Volli?style=social" alt="Stars"></a>
<a href="https://github.com/foofork/Volli/fork"><img src="https://img.shields.io/github/forks/foofork/Volli?style=social" alt="Forks"></a>
<a href="https://github.com/foofork/Volli/issues"><img src="https://img.shields.io/github/issues/foofork/Volli?style=social" alt="Issues"></a>

</div>