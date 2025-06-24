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

### Phase 0: Integration (Current Priority) 🚨
Connect existing packages to the web application

### Phase 1: Core Functionality
Implement persistent storage and real encryption

### Phase 2: Advanced Features
Add P2P sync, post-quantum crypto

### Phase 3: Multi-Platform
Build mobile and desktop applications

---

## Immediate Priorities (Phase 0)

### Sprint 0.1: Web App Persistence (2 weeks)

**Goal**: Make the web app actually save data

**Tasks**:
| Task | Component | Priority | Effort |
|------|-----------|----------|--------|
| Integrate vault-core SQL.js with web app | apps/web | P0 | 3d |
| Replace mock stores with real implementations | apps/web | P0 | 3d |
| Implement IndexedDB adapter | apps/web | P0 | 2d |
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

**Goal**: Implement real P2P messaging with classical crypto

**Tasks**:
| Task | Package | Priority | Effort |
|------|---------|----------|--------|
| Integrate sync-ipfs with web app | apps/web | P0 | 3d |
| Implement message routing | messaging | P0 | 2d |
| Add relay server fallback | sync-ipfs | P0 | 2d |
| Implement offline queue | messaging | P0 | 2d |
| Network testing | all | P0 | 1d |

**Deliverables**:
- [ ] Messages actually sent between clients
- [ ] Offline message queue
- [ ] P2P with relay fallback

---

### Sprint 1.2: Post-Quantum Crypto (2 weeks)

**Goal**: Upgrade to post-quantum cryptography

**Tasks**:
| Task | Package | Priority | Effort |
|------|---------|----------|--------|
| Integrate liboqs-wasm or pqc-js | identity-core | P0 | 3d |
| Implement Kyber-1024 key exchange | identity-core | P0 | 2d |
| Implement Dilithium-3 signatures | identity-core | P0 | 2d |
| Hybrid mode with classical crypto | identity-core | P0 | 2d |
| Performance optimization | identity-core | P1 | 1d |

**Deliverables**:
- [ ] Working post-quantum crypto
- [ ] Hybrid mode for compatibility
- [ ] Performance < 200ms for operations

---

## Phase 2: Advanced Features (Weeks 9-12)

### Sprint 2.1: Multi-Device Sync (2 weeks)

**Goal**: Enable sync across devices

**Tasks**:
| Task | Package | Priority | Effort |
|------|---------|----------|--------|
| Device pairing protocol | sync-ipfs | P0 | 3d |
| CRDT conflict resolution | vault-core | P0 | 3d |
| Sync UI implementation | apps/web | P0 | 2d |
| Bandwidth optimization | sync-ipfs | P1 | 2d |

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

**Goal**: Create Tauri desktop app

**Tasks**:
| Task | Component | Priority | Effort |
|------|-----------|----------|--------|
| Tauri project setup | apps/desktop | P0 | 1d |
| Native menu integration | apps/desktop | P0 | 2d |
| System tray support | apps/desktop | P1 | 2d |
| Auto-updater | apps/desktop | P1 | 2d |
| Platform testing (Win/Mac/Linux) | apps/desktop | P0 | 3d |

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

## Next Steps

1. **Immediate**: Begin Sprint 0.1 - Web App Persistence
2. **Week 1**: Set up IndexedDB integration
3. **Week 2**: Replace mock stores with real implementations
4. **Week 3**: Security review of persistence layer
5. **Week 4**: Begin real crypto integration

This roadmap reflects the actual current state and provides a realistic path forward.