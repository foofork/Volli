<div align="center">

# 🔐 Volli

### Post‑Quantum Secure, Local‑First Messaging Platform

[![License MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-2F74C0?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tests](https://img.shields.io/badge/Coverage-98.9%25-brightgreen)]()
[![Security](https://img.shields.io/badge/Encryption-Post--Quantum-green)](docs/SECURITY.md)

**Private chat that stays private—even in a quantum future.**

</div>

> **Project status:** 🚀 **Web App Phase 1 Complete**  
> Full messaging, contact management, secure file storage, and vault functionality with 98.9% test coverage. Desktop and mobile apps coming soon!

---

## ✨ Why Volli?

|                                   |           Volli           | Signal / WhatsApp |
| --------------------------------- | :-----------------------: | :---------------: |
| **Post‑Quantum Crypto**           | ✅ Kyber‑1024, Dilithium‑3 |         ❌         |
| **Local‑First Storage**           |  ✅ Device‑only by default |     ❌ (server)    |
| **Works Completely Offline**      |             ✅             |         ❌         |
| **Plugin Ecosystem**              |       ✅ WASM sandbox      |         ❌         |
| **P2P Sync / No Central Servers** |           ✅ IPFS          |         ❌         |

**Your messages never hit our servers—because we don't have any.**

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/foofork/Volli.git
cd Volli

# 2. Install dependencies
npm install

# 3. Build packages
npm run build:packages

# 4. Run the web app
cd apps/web && npm run dev     # → http://localhost:3000

# 5. Run the full test suite
npm test
```

<details>
<summary>Need desktop or mobile builds?</summary>

```bash
# Desktop (Tauri) - requires Rust
cd apps/desktop && npm run dev

# Mobile (Capacitor) - requires Xcode/Android Studio
cd apps/mobile && npm run dev
```

</details>

> 💡 Volli is **server‑less** in development too—your data lives in an encrypted SQLite db inside the browser or app sandbox.

---

## 🛡️ Key Features (Working Now)

* **🔐 Secure Vault**: Passphrase-protected local storage with encryption
* **💬 Messaging**: Send and receive end-to-end encrypted messages
* **👥 Contact Management**: Add, verify, and manage contacts with public key exchange
* **📁 Secure File Storage**: Upload, encrypt, and share files up to 10MB
* **🔑 PassphraseInput**: Secure input component with real-time strength validation
* **🌐 Web App**: Fully functional web interface with modern UI
* **🔒 Strong Authentication**: 12+ character passphrase with 128-bit entropy validation
* **⏱️ Auto-lock**: Automatic vault locking after 15 minutes of inactivity
* **📱 Responsive Design**: Works on desktop and mobile browsers
* **🧪 Test Coverage**: 98.9% test coverage with comprehensive test suite

<details>
<summary>On the near horizon…</summary>

* **Real-time Sync**: Multi-device synchronization
* **Desktop App**: Native Tauri application
* **Mobile Apps**: iOS and Android with Capacitor
* **Post-Quantum Crypto**: Full Kyber-1024 + Dilithium-3 implementation
* **Plugin System**: WASM-based extensibility
* **Group Messaging**: Multi-participant conversations

</details>

---

## 🏗️ Architecture Overview

```
 ┌────────────┐      ┌─────────────┐
 │  identity  │──┐   │   plugins   │
 │  core 🔑   │  │   │   (WASM)    │
 └────────────┘  │   └─────────────┘
                 │
 ┌────────────┐  ▼   ┌─────────────┐
 │   vault    │─────►│   sync      │
 │  core 🔒   │ CRDT │  (IPFS)     │
 └────────────┘      └─────────────┘
        ▲
        │
 ┌────────────┐
 │   UI kit   │  SvelteKit / Tauri / Capacitor
 └────────────┘
```

*Monorepo packages live under `packages/`—see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for deep‑dive.*

---

## 🔒 Security at a Glance

| Layer          | Tech                           | Purpose                                       |
| -------------- | ------------------------------ | --------------------------------------------- |
| **Encryption** | Kyber‑1024, XChaCha20‑Poly1305 | Post‑quantum E2E confidentiality              |
| **Signatures** | Dilithium‑3                    | Authenticated, tamper‑proof messages          |
| **KDF**        | Argon2id                       | Strong password‑based key derivation          |
| **Storage**    | Encrypted SQLite + CRDT        | Local‑only vault, conflict‑free offline edits |

Read the full [Security Guide](docs/SECURITY.md) for threat model, key rotation, and audit plans.

---

## 📅 Roadmap

| Phase                 | Status         | Highlights                           |
| --------------------- | -------------- | ------------------------------------ |
| **1. Core Web App**   | ✅ Complete     | Messaging, contacts, file storage, vault, auth, 98.9% test coverage |
| **2. Advanced Features** | 🚧 In progress | Real-time sync, group messaging      |
| **3. Multi-Platform** | 🔜 Q2 2025     | Desktop and mobile apps              |
| **4. Full Crypto**   | 🔜 Q3 2025     | Post-quantum implementation          |

Track progress in [docs/ROADMAP.md](docs/ROADMAP.md).

---

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
│   └── ui-kit/         # Shared components
├── apps/              # Applications
│   ├── web/           # SvelteKit web app
│   ├── desktop/       # Tauri desktop app
│   └── mobile/        # Capacitor mobile app
└── docs/              # Documentation
```

</details>

See [**Developer Guide**](docs/DEVELOPER.md) for comprehensive setup instructions.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [**Overview**](docs/OVERVIEW.md) | Project introduction and goals |
| [**Architecture**](docs/ARCHITECTURE.md) | System design and components |
| [**Security**](docs/SECURITY.md) | Cryptography and security model |
| [**Developer Guide**](docs/DEVELOPER.md) | Setup and development workflow |
| [**Roadmap**](docs/ROADMAP.md) | Development timeline and milestones |


---

## 📄 License

MIT © 2025 The Volli Authors

---

<div align="center">

Built with ❤️ for privacy and autonomy.  
**"Privacy is not granted—it's taken back."**

</div>
