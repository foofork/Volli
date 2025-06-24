# 🏗️ Volli System Architecture

## Executive Summary

Volli is a privacy-first messaging platform designed for post-quantum security and local-first operation. This document provides a comprehensive architectural overview, distinguishing between current implementation and planned features.

## Table of Contents
1. [Architecture Principles](#architecture-principles)
2. [Current State Architecture](#current-state-architecture)
3. [Target Architecture](#target-architecture)
4. [Component Details](#component-details)
5. [Data Flow](#data-flow)
6. [Performance & Modularity Standards](#performance--modularity-standards)
7. [Security Architecture](#security-architecture)
8. [Technology Stack](#technology-stack)
9. [Deployment Architecture](#deployment-architecture)
10. [Architecture Decision Records](#architecture-decision-records)

---

## Architecture Principles

### Core Tenets
1. **Local-First**: All operations work offline; network is only for sync
2. **Zero-Trust**: No plaintext or key material on servers
3. **Privacy by Design**: Minimal metadata, end-to-end encryption
4. **Modularity**: Small, focused components with clear boundaries
5. **Performance**: Sub-100ms operations, <500 lines per file

### Design Principles
- **Progressive Enhancement**: Basic features work everywhere
- **Fail Secure**: Security failures result in denial, not exposure
- **Explicit Over Implicit**: Clear data flow and dependencies
- **Testability**: 95%+ test coverage requirement
- **Documentation**: Code is self-documenting with types

---

## Current State Architecture

### What's Actually Built
```mermaid
graph TB
    subgraph "Web Application (In-Memory Only)"
        WEB[Web UI<br/>SvelteKit]
        STORES[Svelte Stores<br/>In-Memory]
    end
    
    subgraph "Core Packages (Built, Not Integrated)"
        ID[identity-core<br/>Classical Crypto Only]
        VAULT[vault-core<br/>SQL.js Storage]
        SYNC[sync-ipfs<br/>IPFS Implementation]
        PLUGIN[plugins<br/>WASM Runtime]
    end
    
    subgraph "Placeholder/Mock"
        PQ[Post-Quantum<br/>TODO Placeholders]
        NET[Network Layer<br/>Mock Only]
    end
    
    WEB --> STORES
    
    style PQ fill:#ffcccc
    style NET fill:#ffcccc
    style ID fill:#ccffcc
    style VAULT fill:#ccffcc
    style SYNC fill:#ccffcc
    style PLUGIN fill:#ccffcc
```

### Current Limitations
- **No Persistence**: Data lost on page refresh
- **No Real Crypto**: Web app uses mock encryption
- **No Networking**: Messages don't leave the browser
- **No Mobile/Desktop**: Only web UI exists
- **Package Isolation**: Core packages not connected to UI

---

## Target Architecture

### Complete System Design
```mermaid
graph TB
    subgraph "Client Applications"
        WEB[Web App<br/>SvelteKit + PWA]
        MOBILE[Mobile Apps<br/>Capacitor]
        DESKTOP[Desktop App<br/>Tauri/Electron]
    end
    
    subgraph "Application Layer"
        UI[UI Components<br/>Shared Library]
        STATE[State Management<br/>Reactive Stores]
        API[API Layer<br/>Service Interfaces]
    end
    
    subgraph "Core Services"
        MSG[Messaging Service]
        CONTACT[Contact Service]
        FILE[File Service]
        SYNC[Sync Service]
    end
    
    subgraph "Security Layer"
        ID[Identity Core<br/>PQ + Classical]
        CRYPTO[Crypto Service<br/>Encryption/Signing]
        KM[Key Management<br/>Derivation/Storage]
    end
    
    subgraph "Storage Layer"
        VAULT[Vault Core<br/>Encrypted Storage]
        IDB[IndexedDB<br/>Browser Storage]
        SQL[SQLite<br/>Native Storage]
        CRDT[CRDT Engine<br/>Conflict Resolution]
    end
    
    subgraph "Network Layer"
        P2P[P2P Service<br/>WebRTC/libp2p]
        RELAY[Relay Service<br/>Fallback]
        DISCOVERY[Discovery<br/>Peer Finding]
    end
    
    subgraph "Extension Layer"
        PLUGIN[Plugin Runtime<br/>WASM Sandbox]
        PERMS[Permissions<br/>Capability System]
    end
    
    WEB --> UI
    MOBILE --> UI
    DESKTOP --> UI
    
    UI --> STATE
    STATE --> API
    API --> MSG
    API --> CONTACT
    API --> FILE
    
    MSG --> CRYPTO
    MSG --> SYNC
    CONTACT --> ID
    FILE --> CRYPTO
    
    CRYPTO --> KM
    ID --> KM
    
    MSG --> VAULT
    CONTACT --> VAULT
    FILE --> VAULT
    
    VAULT --> IDB
    VAULT --> SQL
    VAULT --> CRDT
    
    SYNC --> P2P
    SYNC --> RELAY
    P2P --> DISCOVERY
    
    API --> PLUGIN
    PLUGIN --> PERMS
```

---

## Component Details

### 1. Identity Core (`@volli/identity-core`)

**Current State**: Classical crypto only (X25519, Ed25519)  
**Target State**: Post-quantum (Kyber-1024, Dilithium-3) with hybrid mode

#### Responsibilities
- Identity generation and management
- Key derivation and rotation
- Device pairing protocols
- Signature generation/verification

#### Key Interfaces
```typescript
interface IdentityCore {
  // Identity Management
  generateIdentity(params: IdentityParams): Promise<Identity>
  importIdentity(data: IdentityData): Promise<Identity>
  exportIdentity(id: string): Promise<IdentityData>
  
  // Key Operations
  deriveSessionKey(identity: Identity, purpose: KeyPurpose): SessionKey
  rotateKeys(identity: Identity): Promise<Identity>
  
  // Device Pairing
  generatePairingCode(): PairingCode
  completePairing(code: PairingCode, pin: string): Promise<Identity>
}

interface Identity {
  id: string
  publicKey: PublicKey
  privateKey: PrivateKey
  algorithm: 'classical' | 'pq' | 'hybrid'
  created: number
  rotationSchedule?: KeyRotation
}
```

#### Performance Requirements
- Key generation: < 200ms (classical), < 500ms (PQ)
- Signature operations: < 50ms
- Memory usage: < 10MB per identity

### 2. Vault Core (`@volli/vault-core`)

**Current State**: SQL.js implementation exists but not integrated  
**Target State**: Multi-backend support with encryption

#### Responsibilities
- Encrypted local storage
- CRDT-based synchronization
- Data migration and versioning
- Query and indexing

#### Storage Architecture
```typescript
interface VaultCore {
  // Storage Operations
  initialize(config: VaultConfig): Promise<Vault>
  store<T>(collection: string, item: T): Promise<string>
  retrieve<T>(collection: string, id: string): Promise<T>
  query<T>(collection: string, filter: Filter): Promise<T[]>
  
  // Sync Operations
  getChanges(since: Timestamp): Promise<Change[]>
  applyChanges(changes: Change[]): Promise<void>
  resolveConflicts(strategy: ConflictStrategy): Promise<void>
}

interface VaultConfig {
  backend: 'indexeddb' | 'sqlite' | 'memory'
  encryption: EncryptionConfig
  sync?: SyncConfig
  migrations?: Migration[]
}
```

#### Storage Schema
```sql
-- Core tables with encryption
CREATE TABLE objects (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  data_encrypted BLOB NOT NULL,
  nonce BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  crdt_clock TEXT,
  INDEX idx_collection (collection),
  INDEX idx_updated (updated_at)
);

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value_encrypted BLOB NOT NULL,
  nonce BLOB NOT NULL
);
```

### 3. Messaging Service

**Current State**: Mock implementation only  
**Target State**: Full E2E encrypted messaging

#### Architecture
```typescript
interface MessagingService {
  // Message Operations
  sendMessage(params: SendParams): Promise<Message>
  receiveMessage(data: EncryptedData): Promise<Message>
  
  // Conversation Management
  createConversation(contacts: Contact[]): Promise<Conversation>
  loadConversation(id: string): Promise<Conversation>
  
  // Sync & Delivery
  queueForDelivery(message: Message): Promise<void>
  processDeliveryQueue(): Promise<DeliveryReport[]>
}

interface Message {
  id: string
  conversationId: string
  content: string
  attachments?: Attachment[]
  timestamp: number
  signature: Signature
  deliveryStatus: DeliveryStatus
}
```

### 4. Plugin System

**Current State**: WASM runtime implemented  
**Target State**: Full ecosystem with marketplace

#### Security Model
```typescript
interface PluginRuntime {
  // Lifecycle
  loadPlugin(wasm: ArrayBuffer, manifest: Manifest): Promise<Plugin>
  unloadPlugin(id: string): Promise<void>
  
  // Execution
  executeFunction(pluginId: string, fn: string, args: any[]): Promise<any>
  
  // Permissions
  checkPermission(pluginId: string, capability: Capability): boolean
  grantPermission(pluginId: string, capability: Capability): void
}

interface Manifest {
  name: string
  version: string
  capabilities: {
    required: Capability[]
    optional: Capability[]
  }
  resources: {
    memory: number  // bytes
    cpu: number     // milliseconds per call
    storage: number // bytes
  }
}
```

---

## Data Flow

### Message Send Flow
```mermaid
sequenceDiagram
    participant UI
    participant Store
    participant Crypto
    participant Vault
    participant Network
    participant Recipient
    
    UI->>Store: sendMessage(content)
    Store->>Crypto: encrypt(content, recipientKey)
    Crypto-->>Store: encryptedData
    Store->>Vault: store(message)
    Vault-->>Store: messageId
    Store->>Network: queue(encryptedData)
    Store-->>UI: optimisticUpdate
    
    Note over Network: When online
    Network->>Recipient: deliver(encryptedData)
    Recipient-->>Network: ack
    Network-->>Store: deliveryConfirmation
    Store-->>UI: updateStatus
```

### File Storage Flow
```mermaid
sequenceDiagram
    participant UI
    participant FileService
    participant Crypto
    participant Vault
    participant ChunkStore
    
    UI->>FileService: uploadFile(file)
    FileService->>FileService: validateSize(<10MB)
    FileService->>FileService: chunkFile(1MB chunks)
    
    loop For each chunk
        FileService->>Crypto: encryptChunk(data)
        Crypto-->>FileService: encryptedChunk
        FileService->>ChunkStore: store(chunk)
    end
    
    FileService->>Vault: storeMetadata(fileInfo)
    FileService-->>UI: uploadProgress
    FileService-->>UI: fileId
```

---

## Performance & Modularity Standards

### Code Organization

#### File Size Limits
- **Maximum file size**: 500 lines (enforced by linter)
- **Ideal file size**: 100-300 lines
- **Maximum function size**: 50 lines
- **Maximum complexity**: Cyclomatic complexity < 10

#### Module Structure
```
src/
├── lib/
│   ├── services/         # Business logic (100-300 lines each)
│   ├── stores/           # State management (100-200 lines each)
│   ├── components/       # UI components (50-150 lines each)
│   ├── utils/            # Helpers (50-100 lines each)
│   └── types/            # TypeScript types (interfaces only)
├── routes/               # Route handlers (50-100 lines each)
└── tests/                # Mirrors src structure
```

### Performance Budgets

#### Client-Side Metrics
| Metric | Target | Maximum |
|--------|--------|---------|
| Initial Load | < 100KB | 200KB |
| Time to Interactive | < 2s | 3s |
| First Contentful Paint | < 1s | 1.5s |
| API Response Time | < 100ms | 200ms |
| Memory Usage | < 50MB | 100MB |

#### Operation Performance
| Operation | Target | Maximum |
|-----------|--------|---------|
| Message Encrypt/Decrypt | < 50ms | 100ms |
| File Chunk Encryption | < 100ms | 200ms |
| Database Query | < 20ms | 50ms |
| CRDT Merge | < 50ms | 100ms |
| Plugin Execution | < 100ms | 500ms |

### Code Quality Metrics

#### Enforced by CI/CD
```yaml
quality_gates:
  coverage:
    statements: 95%
    branches: 90%
    functions: 95%
    lines: 95%
  
  complexity:
    max_cyclomatic: 10
    max_cognitive: 15
    max_file_lines: 500
    max_function_lines: 50
  
  duplication:
    max_duplicate_lines: 20
    max_duplicate_blocks: 2
  
  dependencies:
    max_bundle_size: 200KB
    tree_shaking: required
    security_audit: required
```

### Monitoring & Observability

#### Performance Monitoring
```typescript
interface PerformanceMonitor {
  // Timing
  startTimer(operation: string): Timer
  endTimer(timer: Timer): void
  
  // Metrics
  recordMetric(name: string, value: number): void
  recordError(error: Error, context: Context): void
  
  // Reporting
  getMetrics(): Metrics
  generateReport(): PerformanceReport
}
```

---

## Security Architecture

### Threat Model

#### In-Scope Threats
1. **Network Adversaries**: Eavesdropping, MITM attacks
2. **Compromised Servers**: Zero-trust design
3. **Device Theft**: Encrypted at rest
4. **Quantum Computing**: Post-quantum algorithms
5. **Malicious Plugins**: Sandboxed execution

#### Out-of-Scope Threats
1. **Compromised OS**: Kernel-level attacks
2. **Hardware Attacks**: Side-channel, cold boot
3. **Social Engineering**: User deception
4. **Legal Compulsion**: Warrant canaries

### Security Layers

```mermaid
graph TB
    subgraph "Application Security"
        CSP[Content Security Policy]
        SRI[Subresource Integrity]
        CORS[CORS Policy]
    end
    
    subgraph "Data Security"
        E2E[E2E Encryption]
        REST[Encryption at Rest]
        SIG[Digital Signatures]
    end
    
    subgraph "Network Security"
        TLS[TLS 1.3]
        PINNING[Certificate Pinning]
        ONION[Onion Routing]
    end
    
    subgraph "Platform Security"
        SANDBOX[Process Sandbox]
        PERMS[Permission System]
        AUDIT[Audit Logging]
    end
```

---

## Technology Stack

### Current Stack

| Layer | Technology | Status | Notes |
|-------|------------|--------|-------|
| Frontend | SvelteKit 2.0 | ✅ Active | Type-safe, performant |
| State | Svelte Stores | ⚠️ In-memory | Needs persistence |
| Crypto | libsodium.js | ✅ Active | Classical only |
| Storage | In-memory | ❌ Temporary | No persistence |
| Network | None | ❌ Missing | Mock only |
| Testing | Vitest | ✅ Active | 98.9% coverage |

### Target Stack (Research Phase)

| Layer | Options | Decision Criteria |
|-------|---------|-------------------|
| Storage | Dexie.js, LocalForage, PouchDB | Performance, size, encryption |
| P2P | WebRTC, libp2p, Gun.js | NAT traversal, reliability |
| CRDT | Yjs, Automerge | Performance, conflict resolution |
| PQ Crypto | liboqs, pqc-js, kyber-crystals | WASM support, performance |
| Desktop | Tauri, Electron | Security, bundle size |
| Mobile | Capacitor, React Native | Code reuse, performance |

---

## Deployment Architecture

### Web Deployment
```mermaid
graph LR
    subgraph "Client"
        BROWSER[Browser]
        SW[Service Worker]
        IDB[IndexedDB]
    end
    
    subgraph "CDN"
        CF[Cloudflare]
        ASSETS[Static Assets]
    end
    
    subgraph "Backend (Future)"
        RELAY[Relay Server]
        STUN[STUN/TURN]
    end
    
    BROWSER --> CF
    CF --> ASSETS
    SW --> IDB
    BROWSER --> RELAY
    BROWSER --> STUN
```

### Desktop/Mobile Deployment
- **Desktop**: Direct download, auto-updater
- **Mobile**: App stores with OTA updates
- **Updates**: Delta updates for efficiency

---

## Architecture Decision Records

### ADR-001: Local-First Architecture
**Status**: Accepted  
**Context**: Users need privacy and offline functionality  
**Decision**: All data stored locally, sync is optional  
**Consequences**: Complex sync, better privacy

### ADR-002: WASM Plugin System
**Status**: Accepted  
**Context**: Need extensibility without compromising security  
**Decision**: WASM sandbox with capability model  
**Consequences**: Performance overhead, strong security

### ADR-003: Post-Quantum Crypto
**Status**: Planned  
**Context**: Quantum computers threaten current crypto  
**Decision**: Hybrid classical + PQ approach  
**Consequences**: Larger keys, slower operations

### ADR-004: Browser Storage Strategy
**Status**: Under Review  
**Context**: Need persistent encrypted storage  
**Decision**: TBD - Evaluating IndexedDB libraries  
**Consequences**: TBD

---

## Appendix: Development Guidelines

### Code Review Checklist
- [ ] File size < 500 lines
- [ ] Function complexity < 10
- [ ] Test coverage > 95%
- [ ] TypeScript strict mode
- [ ] No any types
- [ ] Performance budget met
- [ ] Security review passed
- [ ] Documentation updated

### Performance Testing
```bash
# Run performance benchmarks
npm run perf:benchmark

# Profile bundle size
npm run perf:bundle

# Memory profiling
npm run perf:memory

# Load testing
npm run perf:load
```

### Security Testing
```bash
# Dependency audit
npm audit

# OWASP scan
npm run security:scan

# Fuzzing
npm run security:fuzz
```

---

*Last Updated: December 2024*  
*Version: 2.0 - Complete Rewrite for Accuracy*