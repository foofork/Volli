<div align="center">

# 🔐 Volli

### Post‑Quantum Secure, Local‑First Messaging Platform

[![License MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-2F74C0?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tests](https://img.shields.io/badge/Tests-70%2B%20Passing-brightgreen)]()
[![Security](https://img.shields.io/badge/Encryption-Post--Quantum-green)](docs/SECURITY.md)

**Private chat that stays private—even in a quantum future.**

</div>

> **Project status:** 🚧 **Phase 2 – Multi‑Platform Apps & P2P Sync**  
> Core cryptography and vault are **stable**. We're racing toward the first public beta (v1.0)!

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
cd apps/web && npm run dev     # → http://localhost:5173

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

## 🛡️ Key Features (Today)

* **Military‑grade, quantum‑resistant encryption** (Kyber‑1024 + Dilithium‑3)
* **Offline‑first**: send, receive & search with zero network
* **Instant search** over thousands of messages (< 50 ms)
* **Cross‑device**: identical UX on web, desktop & mobile
* **Plugin runtime**: sandboxed WASM for custom features

<details>
<summary>On the near horizon…</summary>

* Native desktop & mobile apps with biometric unlock
* P2P multi‑device sync via IPFS (Phase 2)
* WASM plugin marketplace (Phase 3)
* Group messaging (MLS), voice/video, federation & more

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
| **1. Foundation**     | ✅ Done         | Post‑quantum crypto, encrypted vault |
| **2. Apps & Sync**    | 🚧 In progress | Web/desktop/mobile, IPFS sync        |
| **3. Plugins & Beta** | 🔜 Q3 2025     | WASM plugins, public beta            |
| **4. Federation**     | 🔜 Q4 2025     | MLS groups, bridges, enterprise      |

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
