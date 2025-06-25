# Volli Task Board - Central Work Tracking

## Contributor Workflow

```mermaid
graph LR
    A[Visit TASK_BOARD.md] --> B[Find 🟢 Available Task]
    B --> C[Claim Task<br/>Change to 🔴 + @username]
    C --> D[Read Linked Docs]
    D --> E[Create Feature Branch]
    E --> F[Do the Work]
    F --> G{Done?}
    G -->|Yes| H[Update to ✅]
    G -->|No| I[Update Progress 📝]
    I --> F
    H --> J[Create PR]
```

## How to Use This Board

**New contributor?** Read the full [Contributing Workflow Guide](./CONTRIBUTING_WORKFLOW.md)

**Quick steps:**
1. **Find a task** marked as 🟢 Available
2. **Claim it** by editing this file: Change status to 🔴 and add your GitHub handle
3. **Read the docs** linked in the task
4. **Do the work** following the documentation
5. **Update status** to ✅ when complete or 📝 with progress notes

## Task Status Legend

- 🟢 **Available** - Ready to work on
- 🔴 **In Progress** - Someone is working on this
- ✅ **Complete** - Done and merged
- 🚧 **Blocked** - Waiting on dependencies
- 📝 **Needs Update** - Progress documented below

---

## 🚨 MVP Testing Phase (Immediate Priority)

**Goal**: Get to working end-to-end demo for testing and iteration

| Task | Status | Owner | Documentation | Notes |
|------|--------|-------|---------------|-------|
| Local signaling server setup | 🔴 In Progress | @assistant | [Local Testing Guide](#local-testing-setup) | Start server locally |
| Web app signaling integration | 🟢 Available | - | [Integration Points](#integration-points) | Connect UI to signaling |
| Dual contact discovery (hex + signaling) | 🟢 Available | - | [Contact Discovery](#contact-discovery) | Keep hex keys + add username |
| Real P2P message delivery | 🟢 Available | - | [Message Flow](#message-flow) | Replace mock delivery |
| End-to-end testing setup | 🟢 Available | - | [Testing Guide](#testing-flow) | Two-browser demo |

---

## 🚨 Launch-Critical Tasks (Post-MVP)

### Signaling Server
| Task | Status | Owner | Documentation | Notes |
|------|--------|-------|---------------|-------|
| WebSocket signaling server | ✅ Complete | @assistant | [Signaling Plan](./signaling/SIGNALING_DISCOVERY_PHASING_PLAN.md#phase-1-mvp-signaling-weeks-1-3) | TDD implementation complete |
| Client integration | ✅ Complete | @assistant | [Network Store](./P2P_NETWORKING.md#network-store) | Full WebRTC + ICE candidates |
| Production deployment | 🟢 Available | - | [Deployment](./signaling/SIGNALING_DISCOVERY_PHASING_PLAN.md#deployment-strategy) | Server + client ready |

### Mobile Apps
| Task | Status | Owner | Documentation | Notes |
|------|--------|-------|---------------|-------|
| Capacitor setup | 🟢 Available | - | [Mobile PWA](./platforms/MULTIPLATFORM_PHASING_PLAN.md#phase-1-mobile-pwa-wrapper-weeks-1-4) | iOS + Android |
| Push notifications | 🟢 Available | - | [Native Features](./platforms/MULTIPLATFORM_PHASING_PLAN.md#native-features-phase-1) | Signaling server ready |
| App store assets | 🟢 Available | - | [Assets](./platforms/MULTIPLATFORM_PHASING_PLAN.md#week-3-app-store-assets) | Designer needed |

---

## 🎯 Enhancement Tasks (Post-launch improvements)

### Adaptive Trust - Alpha Phase
| Task | Status | Owner | Documentation | Notes |
|------|--------|-------|---------------|-------|
| Rule Engine | ✅ Complete | @assistant | [Implementation Guide](./adaptive-trust/ADAPTIVE_TRUST_IMPLEMENTATION_GUIDE.md#rule-engine--complete) | Merged in PR #1 |
| Network Detector | 🟢 Available | - | [Alpha Scope](./adaptive-trust/ADAPTIVE_TRUST_PHASING_PLAN.md#2-network-detector--essential) | WiFi trust only |
| Trust Manager | 🔴 In Progress | @assistant | [Alpha Scope](./adaptive-trust/ADAPTIVE_TRUST_PHASING_PLAN.md#1-trust-manager--essential) | Basic decision flow |
| Volli Integration | 🚧 Blocked | - | [Integration](./adaptive-trust/ADAPTIVE_TRUST_PHASING_PLAN.md#3-volli-integration--essential) | Needs Trust Manager |

### Desktop Apps
| Task | Status | Owner | Documentation | Notes |
|------|--------|-------|---------------|-------|
| Tauri setup | 🟢 Available | - | [Desktop Phase](./platforms/MULTIPLATFORM_PHASING_PLAN.md#phase-3-desktop-apps-weeks-9-12) | Week 9+ |
| System tray | 🚧 Blocked | - | [Desktop Features](./platforms/MULTIPLATFORM_PHASING_PLAN.md#week-10-desktop-features) | Needs Tauri |

---

## 📋 Task Details

### 🔴 In Progress Tasks

#### WebSocket Signaling Server (COMPLETE)
**Owner**: @assistant  
**Started**: 2025-06-25  
**Progress**:
- ✅ TDD tests written (13 tests covering all functionality)
- ✅ SignalingServer class implementation complete
- ✅ User registration and presence tracking
- ✅ Offer/Answer relay for WebRTC
- ✅ Error handling and connection cleanup
- ✅ All tests passing
- ✅ Build and typecheck successful
- ✅ Committed to branch: `feature/signaling-server`

#### Client Integration (COMPLETE)
**Owner**: @assistant  
**Started**: 2025-06-25  
**Progress**:
- ✅ SignalingClient class with TDD (17 tests)
- ✅ WebSocket connection management with reconnection
- ✅ User registration and discovery
- ✅ Offer/Answer relay handlers
- ✅ **ICE candidate exchange for NAT traversal**
- ✅ NetworkStore integration with signaling
- ✅ Automatic peer discovery before connection
- ✅ Complete WebRTC peer connection flow
- ✅ All tests passing and builds successful
- ✅ Committed to branch: `feature/signaling-server`

#### Example: Rule Engine (COMPLETE)
**Owner**: @assistant  
**Started**: 2025-01-25  
**Progress**:
- ✅ TDD tests written (17 tests)
- ✅ Implementation complete
- ✅ All tests passing
- ✅ Build successful
- ✅ Committed to branch: `feature/adaptive-trust-rule-engine`

---

### 📝 Progress Updates

#### Task: [Task Name]
**Owner**: @username  
**Update Date**: YYYY-MM-DD  
**Progress**:
- What's complete
- What's remaining
- Any blockers

---

## 🚀 MVP Testing Phase Guide

### Local Testing Setup

#### Start Signaling Server
```bash
cd packages/signaling-server
npm run dev
# Server will run on ws://localhost:8080
```

#### Start Web Application
```bash
cd apps/web
npm run dev  
# App will run on http://localhost:5173
```

### Integration Points

#### 1. Signaling Connection (Web App Startup)
**Location**: `apps/web/src/lib/stores/core.ts`
- Add signaling connection to app initialization
- Use current user identity + public key
- Connect to `ws://localhost:8080`

#### 2. Contact Discovery Enhancement
**Location**: `apps/web/src/routes/app/contacts/+page.svelte`
- Keep existing hex key validation (never remove!)
- Add username/email discovery via signaling
- Show "User found!" vs "User not found" states

#### 3. Message Delivery Integration  
**Location**: `apps/web/src/lib/stores/messages.ts`
- Replace mock `deliverMessage` with NetworkStore calls
- Show message status: "P2P" vs "Queued" vs "Failed"
- Enable real peer-to-peer messaging

### Contact Discovery

#### Dual Mode Support
```typescript
// Support both discovery methods
if (isValidHexKey(input)) {
  // Direct hex key entry (power users)
  await addContactByKey(name, input);
} else {
  // Username/email discovery (normal users)  
  const user = await discoverUser(input);
  if (user.online) {
    await addContactByKey(name, user.publicKey);
  }
}
```

#### UX Design
- **Tab 1**: "Find by Username" (signaling discovery)
- **Tab 2**: "Enter Public Key" (direct hex entry)
- **Always available**: QR code scanner/generator

### Message Flow

#### Real P2P Delivery
```typescript
async function deliverMessage(message: Message) {
  // Try direct P2P connection
  const delivered = await networkStore.sendMessage(message);
  
  if (!delivered) {
    // Queue for retry when peer comes online
    await messageQueue.enqueue(message);
  }
}
```

### Testing Flow

#### Two-Browser Demo
1. **Browser 1**: Create identity "Alice" 
2. **Browser 2**: Create identity "Bob"
3. **Contact Discovery**:
   - Alice: Add Bob by hex key
   - Bob: Find Alice by username
4. **Messaging**: Send messages both directions
5. **P2P Verification**: Check connection status in UI

#### Expected Behaviors
- ✅ Users can find each other via signaling
- ✅ Messages deliver via direct P2P when online
- ✅ Messages queue when peer offline
- ✅ Connection status shows in conversations
- ✅ Hex key entry still works for power users

---

## 🔗 Quick Links

### Documentation
- [Launch Strategy](./LAUNCH_STRATEGY.md) - Overall timeline
- [Phasing Summary](./PHASING_SUMMARY.md) - All features overview
- [Adaptive Trust Guide](./adaptive-trust/ADAPTIVE_TRUST_IMPLEMENTATION_GUIDE.md)
- [P2P Networking](./P2P_NETWORKING.md)

### Coordination
- [Team Chat]: Discord/Slack channel
- [Daily Standup]: Time/link
- [Code Reviews]: PR process

---

## ⚠️ Important Notes

1. **One task at a time** - Don't claim multiple tasks
2. **Update status immediately** - Others are waiting
3. **Ask for help** - Post blockers in team chat
4. **Follow TDD** - Tests first, then implementation
5. **Document progress** - Especially if blocked

## How to Claim a Task

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create your branch
git checkout -b feature/[task-name]

# 3. Edit this file to claim task
# Change: | Task Name | 🟢 Available | - |
# To:     | Task Name | 🔴 In Progress | @yourname |

# 4. Commit and push
git add docs/TASK_BOARD.md
git commit -m "claim: [task name]"
git push origin feature/[task-name]
```

---

*Last Updated: 2025-01-25*