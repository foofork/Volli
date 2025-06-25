# Volli Documentation

## 🚀 Start Here

### Essential Reads
- **[Getting Started](./GETTING_STARTED.md)** - Setup and run Volli in minutes
- **[Project Status](./PROJECT_STATUS.md)** - What's working, what's not (January 2025)
- **[Current Tasks](./CURRENT_TASKS.md)** - What needs to be done now

## 📚 Documentation Structure

### Core Documentation
- **[Architecture](./ARCHITECTURE.md)** - System architecture overview
- **[Security](./SECURITY.md)** - Security model and encryption details
- **[P2P Networking](./P2P_NETWORKING.md)** - WebRTC implementation
- **[Test Status](./TEST_STATUS.md)** - Current test coverage
- **[Code Quality](./CODE_QUALITY.md)** - Standards and practices

### Feature Documentation
- **[Adaptive Trust System](./adaptive-trust/)** - Connection-based trust model
  - [Connection Modes](./adaptive-trust/ADAPTIVE_TRUST_CONNECTION_MODES.md) - P2P vs Server model
  - [Go Dark UX Flow](./adaptive-trust/GO_DARK_UX_FLOW.md) - Server to P2P transition
  - [Implementation Guide](./adaptive-trust/ADAPTIVE_TRUST_IMPLEMENTATION_GUIDE.md)
  - [Architecture](./adaptive-trust/ADAPTIVE_TRUST_ARCHITECTURE.md)
  - [Research](./adaptive-trust/research/)

### Platform & Deployment
- **[Signaling Server](./signaling/)** - Peer discovery documentation
  - [Phasing Plan](./signaling/SIGNALING_DISCOVERY_PHASING_PLAN.md)
- **[Multi-Platform Strategy](./platforms/)** - Mobile and desktop plans
  - [Platform Phasing](./platforms/MULTIPLATFORM_PHASING_PLAN.md)

### Development Guides
- **[Contributing Workflow](./CONTRIBUTING_WORKFLOW.md)** - How to contribute
- **[Developer Guide](./DEVELOPER.md)** - Development environment setup
- **[SPARC Methodology](../CLAUDE.md)** - AI-assisted TDD development

### Planning & History
- **[Roadmap](./ROADMAP.md)** - Long-term vision
- **[Task Board](./TASK_BOARD.md)** - Historical task tracking
- **[Launch Strategy](./LAUNCH_STRATEGY.md)** - Go-to-market planning

## 🎯 Quick Links by Role

### For New Users
1. Start with **[Getting Started](./GETTING_STARTED.md)**
2. Check **[Project Status](./PROJECT_STATUS.md)** to understand current state
3. Review **[Architecture](./ARCHITECTURE.md)** for system overview

### For Contributors
1. Read **[Contributing Workflow](./CONTRIBUTING_WORKFLOW.md)**
2. Check **[Current Tasks](./CURRENT_TASKS.md)** for work items
3. Follow **[Developer Guide](./DEVELOPER.md)** for setup

### For Security Researchers
1. Review **[Security Model](./SECURITY.md)**
2. Check **[Adaptive Trust](./adaptive-trust/ADAPTIVE_TRUST_CONNECTION_MODES.md)**
3. See **[P2P Networking](./P2P_NETWORKING.md)** for protocol details

### For SPARC Development
1. Read **[SPARC Configuration](../CLAUDE.md)**
2. Use `npx claude-flow sparc tdd "feature"` for TDD assistance
3. Follow **[Test Status](./TEST_STATUS.md)** for coverage goals

## 📁 Archive

Older documentation and superseded designs can be found in the [archive](./archive/) directory.