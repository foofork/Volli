# Adaptive Trust System Documentation

## Quick Navigation

### 📚 Start Here

#### Connection-Based Trust Model (Current Direction)
- **[Connection Modes & Trust](./ADAPTIVE_TRUST_CONNECTION_MODES.md)** - P2P vs Server trust model with visual indicators
- **[Go Dark UX Flow](./GO_DARK_UX_FLOW.md)** - Detailed UX design for server to P2P transition

#### Environment-Based Trust Model (Alternative Approach)
1. **[Overview](./ADAPTIVE_TRUST_OVERVIEW.md)** - What is Adaptive Trust?
2. **[Phasing Plan](./ADAPTIVE_TRUST_PHASING_PLAN.md)** - Rollout strategy and priorities
3. **[Implementation Guide](./ADAPTIVE_TRUST_IMPLEMENTATION_GUIDE.md)** - How to build it
4. **[TDD Guide](./ADAPTIVE_TRUST_TDD_GUIDE.md)** - Test-driven development approach

### 🏗️ Architecture & Design
- **[Architecture](./ADAPTIVE_TRUST_ARCHITECTURE.md)** - System design and patterns
- **[API Reference](./ADAPTIVE_TRUST_API_REFERENCE.md)** - Interface definitions
- **[Constants](./ADAPTIVE_TRUST_CONSTANTS.md)** - Shared values and budgets
- **[Performance Guide](./ADAPTIVE_TRUST_PERFORMANCE_GUIDE.md)** - Optimization strategies
- **[Security Checklist](./ADAPTIVE_TRUST_SECURITY_CHECKLIST.md)** - Security requirements

### 🚀 Development
- **[Quick Reference](./ADAPTIVE_TRUST_QUICK_REFERENCE.md)** - Keep this handy!
- **[Research](./research/)** - Background research and findings

## Key Concepts

### Connection-Based Trust Model (Current)
Visual indicators for connection security:
- 🟣 **Purple** - Direct P2P connection (highest privacy)
- 🔵 **Blue** - Server-assisted connection (encrypted routing)
- 🟠 **Orange** - Unverified source (caution required)

Key Features:
- **"Go Dark"** - Transition from server to P2P as trust builds
- **Connection Memory** - System learns preferred connection methods
- **Progressive Trust** - Relationships evolve from public to private

### Environment-Based Trust Model (Alternative)
- ☕ **Convenience** - Fast, minimal privacy
- 🛡️ **Balanced** - Good privacy/performance balance  
- 🏰 **Private** - Maximum privacy
- 🔒 **Air Gap** - Local only, no internet

### Core Principles
1. **User Sovereignty** - User rules always win
2. **Performance First** - < 5% battery/CPU
3. **Privacy by Design** - No user profiling
4. **Progressive Enhancement** - Don't break existing functionality

## Implementation Status

- ✅ Research complete
- ✅ Architecture designed
- ✅ API contracts defined
- 🚧 Ready for TDD implementation

## For Implementers

Start with the [Implementation Guide](./ADAPTIVE_TRUST_IMPLEMENTATION_GUIDE.md) and keep the [Quick Reference](./ADAPTIVE_TRUST_QUICK_REFERENCE.md) open while coding.

All development must follow [TDD methodology](./ADAPTIVE_TRUST_TDD_GUIDE.md):
🔴 RED → 🟢 GREEN → 🔵 REFACTOR