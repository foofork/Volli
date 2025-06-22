# 🏗️ Volli System Architecture

## Overview

Volli is a post-quantum secure, local-first, privacy-first messaging platform built on a zero-trust architecture. This document outlines the technical architecture, component interactions, and design decisions.

## Architecture Principles

1. **Local-First**: All data operations work offline; network is only for sync
2. **Zero-Trust**: Servers never see plaintext or key material
3. **Post-Quantum Security**: Kyber-1024 (KEM) + Dilithium-3 (signatures) in hybrid mode
4. **Extensible**: WASM plugins with capability-based security
5. **Cross-Platform**: Single codebase for web, mobile, and desktop

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        WEB[Web App<br/>SvelteKit]
        MOBILE[Mobile App<br/>Capacitor]
        DESKTOP[Desktop App<br/>Tauri]
    end
    
    subgraph "Core Layer"
        UI[UI Kit<br/>@volli/ui-kit]
        MSG[Messaging<br/>@volli/messaging]
        VAULT[Vault Core<br/>@volli/vault-core]
        ID[Identity Core<br/>@volli/identity-core]
        PLUGIN[Plugin Runtime<br/>@volli/plugins]
        CAP[Capability Table<br/>@volli/cap-table]
    end
    
    subgraph "Storage & Sync"
        SQLITE[SQLite<br/>sql.js]
        IDB[IndexedDB]
        CRDT[Automerge 2<br/>CRDT Engine]
        SYNC[IPFS Sync<br/>@volli/sync-ipfs]
    end
    
    subgraph "Security Layer"
        CRYPTO[Crypto Library<br/>liboqs-js + libsodium]
        SEARCH[FlexSearch<br/>Encrypted Index]
    end
    
    subgraph "External Services"
        IPFS[IPFS Network]
        RELAY[HTTPS Relay<br/>Fallback]
        S3[S3 Backup<br/>Optional]
    end
    
    WEB --> UI
    MOBILE --> UI
    DESKTOP --> UI
    
    UI --> MSG
    MSG --> VAULT
    MSG --> ID
    MSG --> PLUGIN
    
    VAULT --> SQLITE
    VAULT --> IDB
    VAULT --> CRDT
    VAULT --> SEARCH
    
    ID --> CRYPTO
    VAULT --> CRYPTO
    
    PLUGIN --> CAP
    
    CRDT --> SYNC
    SYNC --> IPFS
    SYNC --> RELAY
    
    VAULT --> S3
```

## Component Details

### 1. Identity Core (`@volli/identity-core`)

Manages cryptographic identities and key lifecycle.

**Responsibilities:**
- Post-quantum key generation (Kyber-1024 + Dilithium-3)
- Hybrid mode with X25519 until 2027
- Subkey derivation for sessions
- QR code generation for pairing
- Key revocation and rotation

**Key APIs:**
```typescript
interface IdentityCore {
  generateIdentity(): Promise<Identity>
  deriveSessionKey(identity: Identity): SessionKey
  generatePairingQR(identity: Identity): QRData
  revokeKey(keyId: string): Promise<void>
}
```

### 2. Vault Core (`@volli/vault-core`)

Encrypted local storage with CRDT synchronization.

**Responsibilities:**
- Encrypted SQLite storage (XChaCha20-Poly1305)
- Automerge adapter for conflict-free sync
- Search index management
- Backup/restore operations

**Storage Schema:**
```sql
-- Core tables
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT,
  sender_id TEXT,
  content_encrypted BLOB,
  timestamp INTEGER,
  crdt_clock TEXT
);

CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  public_key BLOB,
  display_name_encrypted BLOB,
  trust_level INTEGER
);

CREATE TABLE vault_metadata (
  key TEXT PRIMARY KEY,
  value BLOB
);
```

### 3. Messaging (`@volli/messaging`)

Message handling and cryptographic operations.

**Responsibilities:**
- Message schema definitions
- Encryption/decryption helpers
- Thread management
- File sharing support

**Message Types:**
```typescript
type MessageSchema = 
  | { type: 'chat.message', content: string, attachments?: FileRef[] }
  | { type: 'file.share', file: FileRef, caption?: string }
  | { type: 'thread.update', updates: ThreadUpdate[] }
```

### 4. IPFS Sync (`@volli/sync-ipfs`)

Peer-to-peer synchronization layer.

**Responsibilities:**
- IPFS node management
- HTTPS relay fallback
- Conflict resolution
- Network state handling

**Sync Protocol:**
1. Generate content-addressed diff
2. Publish to IPFS DHT
3. Fallback to relay if P2P fails
4. Apply received diffs via CRDT

### 5. Plugin System (`@volli/plugins`)

WASM-based plugin runtime with capability security.

**Responsibilities:**
- WASM module loading (Wasmer-JS)
- Permission enforcement
- Audit logging
- Resource sandboxing

**Plugin Manifest:**
```json
{
  "name": "summarizer",
  "version": "1.0.0",
  "capabilities": {
    "vault.read": ["messages"],
    "vault.write": ["summaries"],
    "network": false
  }
}
```

### 6. Capability Table (`@volli/cap-table`)

Compile-time permission system for plugins.

**Responsibilities:**
- Parse plugin manifests
- Generate capability tables
- Runtime permission checks
- Audit trail generation

## Security Architecture

### Cryptographic Stack

```
Application Layer
    ↓
Message Encryption (XChaCha20-Poly1305)
    ↓
Key Agreement (Kyber-1024 + X25519 hybrid)
    ↓
Digital Signatures (Dilithium-3 + Ed25519 hybrid)
    ↓
Key Derivation (Argon2id)
    ↓
Random Generation (libsodium CSPRNG)
```

### Trust Model

1. **Device Trust**: Multi-device pairing via QR + PIN
2. **Contact Trust**: Fingerprint verification on first contact
3. **Plugin Trust**: Capability-based permissions
4. **Network Trust**: End-to-end encryption, metadata minimization

## Performance Architecture

### Optimization Strategies

1. **Local-First Performance**
   - All operations < 50ms on mid-tier devices
   - SQLite for ACID guarantees
   - FlexSearch for instant search

2. **Efficient Sync**
   - Binary CRDT format (Automerge 2)
   - Delta compression
   - Selective sync based on viewport

3. **UI Responsiveness**
   - Virtual scrolling for large lists
   - Web Workers for crypto operations
   - Progressive enhancement

## Deployment Architecture

### Web Deployment
```
CloudFlare CDN
    ↓
Static SvelteKit Build
    ↓
Service Worker (offline support)
    ↓
IndexedDB + sql.js
```

### Mobile Deployment
```
App Store / Play Store
    ↓
Capacitor Shell
    ↓
WebView + Native Plugins
    ↓
Native SQLite
```

### Desktop Deployment
```
Direct Download / App Stores
    ↓
Tauri Shell
    ↓
WebView + Rust Backend
    ↓
Native SQLite
```

## Development Architecture

### Monorepo Structure
```
volli/
├── apps/
│   ├── web/          # SvelteKit app
│   ├── mobile/       # Capacitor config
│   └── desktop/      # Tauri config
├── packages/
│   ├── identity-core/
│   ├── vault-core/
│   ├── messaging/
│   ├── sync-ipfs/
│   ├── plugins/
│   ├── cap-table/
│   └── ui-kit/
├── plugins/          # Example plugins
├── docs/
│   └── adr/         # Architecture Decision Records
└── tools/           # Build tools
```

### Build Pipeline
1. TypeScript compilation
2. WASM plugin compilation
3. Capability table generation
4. Bundle optimization
5. Platform-specific builds

## Scalability Considerations

### Horizontal Scaling
- Stateless relay servers
- IPFS node clustering
- CDN for static assets

### Data Scaling
- Pagination for message history
- Selective sync windows
- Archive old messages locally

### Plugin Scaling
- Lazy loading of plugins
- Resource quotas per plugin
- Background execution limits

## Future Architecture Considerations

### Phase 2 Features
- Encrypted push notifications
- Group messaging (MLS protocol)
- Voice/video calls (WebRTC + PQ-KEM)
- Federation protocol

### Migration Path
- Gradual PQ crypto adoption
- Plugin API versioning
- Storage format migrations
- Network protocol upgrades