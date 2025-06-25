# Volli Current Tasks - January 2025

## 🎯 Immediate Focus: MVP Testing & Stabilization

### Critical Issues to Fix
| Task | Priority | Description | Notes |
|------|----------|-------------|-------|
| Fix WASM build issues | 🔴 High | Resolve Automerge WASM configuration | Blocking some features |
| Update failing tests | 🔴 High | 23 tests failing in web app | Mock/expectation mismatches |
| Error handling improvements | 🟡 Medium | Better recovery from connection failures | User experience issue |
| Documentation update | 🟡 Medium | Align docs with implementation | Significant gaps exist |

### MVP Testing Tasks
| Task | Status | Description | Next Steps |
|------|--------|-------------|------------|
| Deploy signaling server | 🟢 Ready | Server code complete and tested | Need deployment environment |
| Multi-user testing | 🟢 Ready | Test with 3+ concurrent users | Create test scenarios |
| Performance profiling | 🟢 Ready | Measure real-world performance | Setup monitoring |
| User feedback collection | 🟢 Ready | Gather UX feedback | Create feedback forms |

## 🚀 Phase 2: Enhancement Features (Post-MVP)

### Adaptive Trust "Go Dark" Mode
| Task | Status | Complexity | Documentation |
|------|--------|------------|---------------|
| Connection preference storage | 🟢 Available | Low | Store per-contact connection preferences |
| UI color indicators | 🟢 Available | Low | Purple/Blue/Orange visual system |
| P2P key exchange protocol | 🟢 Available | High | Ephemeral DH over encrypted channel |
| "Go Dark" transition UX | 🟢 Available | Medium | Implement smooth server→P2P transition |
| Trust revocation | 🟢 Available | Low | Remove P2P access button |
| Multi-device support | 🟢 Available | High | Device introduction protocol |

### Group Messaging
| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| Group creation flow | 🟢 Available | Medium | UI and data model |
| Multi-recipient encryption | 🟢 Available | High | Efficient group key management |
| Group member management | 🟢 Available | Medium | Add/remove members |
| Group P2P mode | 🟢 Available | High | Optional P2P for groups |

## 🏗️ Infrastructure & Quality

### Testing & CI/CD
| Task | Status | Description |
|------|--------|-------------|
| E2E test suite | 🟢 Available | Playwright tests for critical flows |
| CI pipeline setup | 🟢 Available | GitHub Actions for tests/builds |
| Security audit prep | 🟢 Available | Prepare for external audit |
| Performance benchmarks | 🟢 Available | Automated performance tracking |

### Developer Experience
| Task | Status | Description |
|------|--------|-------------|
| API documentation | 🟢 Available | Document all public APIs |
| Example applications | 🟢 Available | Simple integration examples |
| Developer onboarding | 🟢 Available | Quick start guide |
| Plugin system docs | 🟢 Available | Document extension points |

## 📱 Platform Expansion (Phase 3)

### Mobile PWA (Capacitor)
| Task | Complexity | Prerequisites |
|------|------------|---------------|
| Capacitor integration | Medium | Stable web app |
| iOS wrapper | Low | Apple developer account |
| Android wrapper | Low | Google Play account |
| Push notifications | High | Server infrastructure |

### Desktop App (Tauri)
| Task | Complexity | Prerequisites |
|------|------------|---------------|
| Tauri setup | Medium | Stable web app |
| System tray | Low | Tauri integration |
| Native menus | Low | Tauri integration |
| Auto-updater | Medium | Release infrastructure |

## 🔬 Research & Future Features

### Advanced Features (Not Started)
- **Post-quantum cryptography**: Research implementation options
- **CRDT integration**: For offline conflict resolution
- **IPFS sync**: Distributed message storage
- **Plugin marketplace**: Third-party extensions

### Performance Optimizations
- **Message pagination**: For large conversations
- **Lazy loading**: Improve initial load time
- **WebAssembly crypto**: Performance improvements
- **IndexedDB optimization**: Better query performance

## 📊 Success Metrics

### MVP Success Criteria
- [ ] 10+ concurrent users without issues
- [ ] < 3 second initial load time
- [ ] < 5% CPU usage during idle
- [ ] 99% message delivery success
- [ ] Zero security vulnerabilities

### User Satisfaction Goals
- [ ] Intuitive onboarding (< 2 minutes)
- [ ] Reliable message delivery
- [ ] Clear security indicators
- [ ] Responsive UI across devices

## 🤝 How to Contribute

1. **Pick a task** from the 🟢 Available items
2. **Create an issue** to claim it
3. **Read relevant docs** before starting
4. **Follow TDD approach** using SPARC methodology
5. **Submit PR** with tests and documentation

### Priority Guidelines
- 🔴 **Critical**: Blocking issues or security concerns
- 🟡 **Important**: Core functionality or user experience
- 🟢 **Nice to have**: Enhancements and optimizations

## 📅 Rough Timeline

- **Week 1-2**: Fix critical issues, deploy MVP
- **Week 3-4**: User testing and feedback
- **Month 2**: Implement "Go Dark" mode
- **Month 3**: Mobile PWA release
- **Month 4+**: Desktop app and advanced features