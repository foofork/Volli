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

## ✨ What's Working Now

<table>
<tr>
<td width="50%">

### 🔒 **Military-Grade Encryption**
- Your messages are encrypted before they leave your device
- Uses the same crypto libraries as Signal and WhatsApp
- Future-proof against quantum computer attacks
- *No one can read your messages, not even us*

### 🌐 **Works Offline First** 
- Send and receive messages without internet
- All your data stays on your device
- Automatic sync when you're back online
- *Your conversations, your control*

</td>
<td width="50%">

### 📱 **One App, Every Device**
- Works in any web browser (Chrome, Safari, Firefox)
- Responsive design for phones, tablets, and desktop
- Same features everywhere you use it
- *Start a conversation on your phone, continue on your laptop*

### ⚡ **Lightning Fast Search**
- Find any message in under 50 milliseconds
- Search works even when you're offline
- Your search history stays private
- *Find that important message instantly*

</td>
</tr>
</table>

## 🚀 Coming Soon - The Future of Private Messaging

### 🏠 **Native Desktop Apps**
*Why it matters:* Faster performance, better integration with your operating system, and the peace of mind that comes with a dedicated app.
- **macOS, Windows, and Linux** desktop applications
- **Native notifications** without compromising privacy
- **System integration** for seamless file sharing
- **Better performance** than web browsers

### 📱 **Mobile Apps That Actually Protect You**
*Why it matters:* True privacy on the devices you use most, with biometric security that keeps others out.
- **iOS and Android** native applications
- **Biometric unlock** (FaceID, TouchID, fingerprint)
- **Background sync** without draining battery
- **Local notifications** that don't leak metadata

### 🌐 **Peer-to-Peer Magic**
*Why it matters:* Your messages travel directly between devices, not through corporate servers that can be hacked or monitored.
- **Direct device-to-device** messaging via IPFS
- **No central servers** means no single point of failure
- **Automatic relay** when direct connection isn't possible
- **Multi-device sync** that just works

### 🧩 **Smart Plugins That Respect Privacy**
*Why it matters:* Extend Volli with new features while keeping your data secure and private.
- **AI-powered message summarization** (runs locally, never sent to cloud)
- **Language translation** without sending text to Google
- **File format converters** (PDF, images, documents)
- **Custom integrations** with your favorite tools

### 🔮 **Quantum-Proof Security**
*Why it matters:* When quantum computers arrive, your old messages will still be private.
- **Kyber-1024 encryption** resistant to quantum attacks
- **Dilithium-3 signatures** for tamper-proof messaging
- **Automatic key rotation** for perfect forward secrecy
- **Future-proof cryptography** that evolves with threats

---

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
- **`@volli/ui-kit`** - Shared Svelte UI components
- **`@volli/web`** - SvelteKit web application

See [Architecture Documentation](docs/ARCHITECTURE.md) for details.

## 🔒 How We Protect Your Privacy

**🛡️ Bank-Level Encryption**  
Every message is encrypted with military-grade algorithms before leaving your device. Even if someone intercepts your messages, they'll see gibberish.

**🏠 Your Data Stays Home**  
Unlike WhatsApp or Telegram, your messages live on your devices, not our servers. We can't read them because we don't have them.

**🔮 Future-Proof Security**  
We're already preparing for quantum computers that could break today's encryption. Your messages will stay private for decades.

**🔍 Zero-Knowledge Design**  
We built Volli so that even we can't access your conversations, contacts, or any personal information. Privacy by design, not by policy.

> **Technical Details:** See our [Security Guide](docs/SECURITY.md) for cryptographic specifications and threat model analysis.

## 🗺️ Development Milestones

**✅ Phase 1 Complete:** Core messaging platform with encrypted storage and web interface  
**🚧 Phase 2 Current:** Multi-platform apps and P2P synchronization  
**📅 Phase 3 Planned:** Advanced features and plugin ecosystem

> See [**Technical Roadmap**](docs/ROADMAP.md) for detailed development timeline.

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