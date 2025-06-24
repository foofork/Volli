# 🗺️ Volli Implementation Roadmap

## Current State (December 2024)

### ✅ What's Actually Built
- **Core Packages**: Classical encryption (XChaCha20-Poly1305, X25519, Ed25519) with 98.9% test coverage
- **Plugin System**: Complete WASM runtime with sandboxing
- **Web UI**: All screens implemented (auth, messaging, contacts, files, settings)
- **Test Infrastructure**: Comprehensive test suite with mocks

### ⚠️ Built but Not Integrated
- **vault-core package**: SQL.js encrypted storage (not used by web app)
- **sync-ipfs package**: Full IPFS implementation (not connected to web app)

### ❌ Not Implemented
- **Persistent Storage**: Web app uses in-memory storage only
- **Post-Quantum Crypto**: Only placeholder code with TODOs
- **Mobile/Desktop Apps**: Directories don't exist
- **Real Messaging**: Mock network layer only
- **File Encryption**: Mock implementation only

---

## Revised Development Phases

### Phase -1: Research & Validation 🔬 *(1-2 weeks)*
Validate technology choices before implementation

### Phase 0: Integration (Current Priority) 🚨
Connect existing packages to the web application

### Phase 1: Core Functionality
Implement persistent storage and real encryption

### Phase 2: Advanced Features
Add P2P sync, post-quantum crypto

### Phase 3: Multi-Platform
Build mobile and desktop applications

---

## Critical Research Phase (Phase -1)

### Sprint -1: Technology Research & Validation

**Goal**: Ensure we're using production-worthy approaches and not reinventing wheels

**Research Tasks**:
| Task | Focus Area | Priority | Effort |
|------|------------|----------|--------|
| Evaluate IndexedDB libraries (Dexie vs LocalForage vs PouchDB) | Storage | P0 | 1d |
| Research encrypted browser storage patterns | Security | P0 | 1d |
| Compare P2P approaches (IPFS vs WebRTC vs libp2p vs Gun.js) | Networking | P0 | 2d |
| Evaluate CRDT libraries (Yjs vs Automerge vs others) | Sync | P0 | 2d |
| Research PQ crypto libraries (liboqs vs pqc-js vs kyber-crystals) | Crypto | P0 | 2d |
| Benchmark PQ crypto performance in browsers | Performance | P0 | 1d |
| Research key management best practices (WebAuthn, recovery) | Security | P0 | 1d |

**Deliverables**:
- [ ] Technology decision matrix with justifications
- [ ] Performance benchmark results
- [ ] Architecture validation document
- [ ] Security considerations checklist

---

## Immediate Priorities (Phase 0)

### Sprint 0.1: Web App Persistence (2 weeks)

**Goal**: Make the web app actually save data using best practices

**Research & Implementation Tasks**:
| Task | Component | Priority | Effort |
|------|-----------|----------|--------|
| Implement chosen IndexedDB library from Phase -1 | apps/web | P0 | 2d |
| Apply encrypted storage patterns from research | apps/web | P0 | 2d |
| Integrate vault-core SQL.js with web app | apps/web | P0 | 2d |
| Replace mock stores with real implementations | apps/web | P0 | 2d |
| Add data migration system | apps/web | P1 | 1d |
| Update tests for persistence | apps/web | P0 | 1d |

**Deliverables**:
- [ ] Data persists across page refreshes
- [ ] Encrypted storage using vault-core
- [ ] Migration path for future updates

---

### Sprint 0.2: Real Encryption Integration (2 weeks)

**Goal**: Use the actual crypto packages in the web app

**Tasks**:
| Task | Component | Priority | Effort |
|------|-----------|----------|--------|
| Replace mock encryption with identity-core | apps/web | P0 | 2d |
| Implement real file encryption | apps/web | P0 | 2d |
| Add key management UI | apps/web | P0 | 2d |
| Implement contact verification | apps/web | P0 | 2d |
| Security testing | apps/web | P0 | 2d |

**Deliverables**:
- [ ] Real encryption for messages and files
- [ ] Contact key exchange working
- [ ] Security audit of integration

---

## Phase 1: Core Functionality (Weeks 5-8)

### Sprint 1.1: Network Layer (2 weeks)

**Goal**: Implement real P2P messaging using research-validated approach

**Implementation Tasks**:
| Task | Package | Priority | Effort |
|------|---------|----------|--------|
| Implement chosen P2P solution from Phase -1 research | apps/web | P0 | 3d |
| Apply NAT traversal best practices (STUN/TURN) | sync-ipfs | P0 | 1d |
| Implement message routing | messaging | P0 | 2d |
| Add relay server fallback | sync-ipfs | P0 | 2d |
| Implement offline queue | messaging | P0 | 1d |
| Network performance testing | all | P0 | 1d |

**Deliverables**:
- [ ] Messages actually sent between clients
- [ ] Offline message queue
- [ ] P2P with relay fallback

---

### Sprint 1.2: Post-Quantum Crypto (2 weeks)

**Goal**: Upgrade to post-quantum cryptography using production-ready library

**Implementation Tasks**:
| Task | Package | Priority | Effort |
|------|---------|----------|--------|
| Integrate chosen PQ library from Phase -1 benchmarks | identity-core | P0 | 2d |
| Implement Kyber-1024 key exchange per NIST standards | identity-core | P0 | 2d |
| Implement Dilithium-3 signatures per NIST standards | identity-core | P0 | 2d |
| Apply hybrid crypto pattern from research | identity-core | P0 | 2d |
| Performance optimization based on benchmarks | identity-core | P1 | 2d |

**Deliverables**:
- [ ] Working post-quantum crypto
- [ ] Hybrid mode for compatibility
- [ ] Performance < 200ms for operations

---

## Phase 2: Advanced Features (Weeks 9-12)

### Sprint 2.1: Multi-Device Sync (2 weeks)

**Goal**: Enable sync across devices using proven CRDT approach

**Implementation Tasks**:
| Task | Package | Priority | Effort |
|------|---------|----------|--------|
| Integrate chosen CRDT library from Phase -1 | vault-core | P0 | 2d |
| Device pairing protocol with WebAuthn support | sync-ipfs | P0 | 2d |
| Implement CRDT conflict resolution patterns | vault-core | P0 | 2d |
| Sync UI implementation | apps/web | P0 | 2d |
| Bandwidth optimization based on CRDT benchmarks | sync-ipfs | P1 | 2d |

**Deliverables**:
- [ ] Multi-device pairing
- [ ] Automatic sync
- [ ] Conflict resolution

---

### Sprint 2.2: Plugin Ecosystem (2 weeks)

**Goal**: Create example plugins

**Tasks**:
| Task | Component | Priority | Effort |
|------|-----------|----------|--------|
| Message translator plugin | plugins/ | P1 | 2d |
| File converter plugin | plugins/ | P1 | 2d |
| Plugin marketplace UI | apps/web | P2 | 2d |
| Plugin documentation | docs/ | P1 | 2d |
| Security sandbox testing | plugins | P0 | 2d |

**Deliverables**:
- [ ] 2-3 working example plugins
- [ ] Plugin installation UI
- [ ] Developer documentation

---

## Phase 3: Multi-Platform (Weeks 13-16)

### Sprint 3.1: Desktop Application (2 weeks)

**Goal**: Create desktop app using research-validated framework

**Pre-Sprint Research**:
| Task | Component | Priority | Effort |
|------|-----------|----------|--------|
| Compare Tauri vs Electron vs native approaches | apps/desktop | P0 | 1d |
| Evaluate security implications of each approach | apps/desktop | P0 | 0.5d |

**Implementation Tasks**:
| Task | Component | Priority | Effort |
|------|-----------|----------|--------|
| Framework setup based on research choice | apps/desktop | P0 | 1d |
| Native menu integration | apps/desktop | P0 | 2d |
| System tray support | apps/desktop | P1 | 1.5d |
| Auto-updater with code signing | apps/desktop | P1 | 2d |
| Platform testing (Win/Mac/Linux) | apps/desktop | P0 | 2d |

**Deliverables**:
- [ ] Working desktop app
- [ ] Native OS integration
- [ ] Auto-update system

---

### Sprint 3.2: Mobile Applications (2 weeks)

**Goal**: Create Capacitor mobile apps

**Tasks**:
| Task | Component | Priority | Effort |
|------|-----------|----------|--------|
| Capacitor project setup | apps/mobile | P0 | 1d |
| Biometric authentication | apps/mobile | P0 | 2d |
| Push notifications | apps/mobile | P0 | 2d |
| Camera integration | apps/mobile | P1 | 2d |
| App store preparation | apps/mobile | P0 | 3d |

**Deliverables**:
- [ ] iOS app ready
- [ ] Android app ready
- [ ] Store listings prepared

---

## Updated Success Metrics

### Immediate Goals (Phase 0)
- ✅ Test coverage > 95% (achieved)
- [ ] Data persistence working
- [ ] Real encryption integrated
- [ ] Manual testing complete

### Short-term Goals (Phase 1)
- [ ] P2P messaging working
- [ ] Post-quantum crypto operational
- [ ] Performance targets met
- [ ] Security review passed

### Long-term Goals (Phase 2-3)
- [ ] Multi-platform support
- [ ] Plugin ecosystem active
- [ ] Beta user testing
- [ ] Security audit complete

---

## Realistic Timeline

### Current Status
- **Alpha**: Core packages built, UI complete, no persistence

### Projected Milestones
- **Beta** (Week 8): Persistent storage, real crypto, basic messaging
- **RC1** (Week 12): Post-quantum crypto, P2P sync
- **1.0** (Week 16): Multi-platform, security audited

---

## Risk Assessment

### Critical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| IndexedDB integration complexity | High | Start immediately, have localStorage fallback |
| Post-quantum crypto performance | Medium | Implement hybrid mode, optimize hot paths |
| IPFS reliability | Medium | Build relay fallback first |
| App store approval | Low | Begin early, follow guidelines |

---

## Resource Requirements

### Development Team
- 1-2 Full-stack developers
- 1 Security engineer (part-time)
- 1 Mobile developer (Phase 3)

### Infrastructure
- Development servers for relay testing
- CI/CD pipeline for multi-platform builds
- Security audit budget ($15-30k)

---

## Best Practices & Standards

### Key Principles
1. **Research First**: Never implement without researching existing solutions
2. **Use Proven Libraries**: Prefer battle-tested libraries over custom implementations
3. **Follow Standards**: Adhere to NIST, W3C, and industry standards
4. **Security by Design**: Consider security implications at every step
5. **Performance Budgets**: Set and maintain performance targets

### Critical Standards to Follow
- **NIST PQC Standards**: For post-quantum cryptography
- **W3C Web Crypto API**: For browser cryptography
- **OWASP Guidelines**: For web and mobile security
- **RFC Standards**: For networking protocols

### Recommended Libraries to Evaluate
- **Storage**: Dexie.js, LocalForage, PouchDB
- **Crypto**: libsodium.js, noble-crypto, WebCrypto API
- **P2P**: WebRTC, libp2p, Gun.js
- **CRDT**: Yjs, Automerge
- **Testing**: Vitest, Playwright, WASM testing tools

---

## Next Steps

1. **Immediate**: Complete Phase -1 Research (1-2 weeks)
2. **Week 3**: Begin Sprint 0.1 - Web App Persistence
3. **Week 5**: Replace mock stores with real implementations
4. **Week 7**: Security review of persistence layer
5. **Week 9**: Begin real crypto integration

This roadmap reflects the actual current state and provides a research-driven path forward.