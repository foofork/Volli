# "Go Dark" Mode - UX Flow Design

## Overview
The "Go Dark" feature allows users to transition from server-assisted (blue) connections to direct P2P (purple) connections, creating a natural progression of trust and privacy.

## User Journey

### Phase 1: Initial Server-Assisted Connection

#### Contact List View
```
┌─────────────────────────────┐
│ Contacts                    │
├─────────────────────────────┤
│ 🔵 Alice                    │
│    "Hey, how are you?"      │
│    Yesterday 3:42 PM        │
├─────────────────────────────┤
│ 🟣 Bob                      │
│    "See you tomorrow"       │
│    Today 9:15 AM           │
├─────────────────────────────┤
│ 🔵 Charlie (NEW)            │
│    "Nice to meet you!"      │
│    Today 2:30 PM           │
└─────────────────────────────┘
```

#### Chat View - Server-Assisted
```
┌─────────────────────────────┐
│ Charlie     🔵 Server       │
├─────────────────────────────┤
│                             │
│  ┌───────────────────┐      │
│  │ Nice to meet you! │      │
│  └───────────────────┘      │
│                             │
│      ┌─────────────────┐    │
│      │ Same here! 👋   │    │
│      └─────────────────┘    │
│                             │
│ [🔵 Connection: Server]      │
└─────────────────────────────┘
```

### Phase 2: Trust Building Trigger

After 5+ successful message exchanges or 24 hours of communication:

#### Go Dark Prompt
```
┌─────────────────────────────┐
│ Charlie     🔵 Server       │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │   Ready to go direct?   │ │
│ │         🟣              │ │
│ │ Enable private P2P mode │ │
│ │ with Charlie for more   │ │
│ │ secure communication    │ │
│ │                         │ │
│ │ [Go Dark] [Not Now]     │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### Phase 3: Key Exchange Flow

#### Step 1: Initiation
```
┌─────────────────────────────┐
│ Charlie     🔵→🟣 Upgrading │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │   Establishing secure    │ │
│ │      connection...       │ │
│ │                         │ │
│ │    [████████░░░░] 60%   │ │
│ │                         │ │
│ │ Exchanging secure keys  │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

#### Step 2: Verification Options
```
┌─────────────────────────────┐
│ Verify Connection           │
├─────────────────────────────┤
│                             │
│ Choose verification method: │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📞 Voice Call           │ │
│ │ Compare: 7B2A 4F91      │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 💬 Shared Secret        │ │
│ │ "Our first topic"       │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 👥 Mutual Contact       │ │
│ │ Bob can vouch          │ │
│ └─────────────────────────┘ │
│                             │
│ [Skip Verification]         │
└─────────────────────────────┘
```

### Phase 4: Successful P2P Connection

#### Transition Animation
```
┌─────────────────────────────┐
│ Charlie     🔵→🟣           │
├─────────────────────────────┤
│                             │
│     ✨ Going Dark ✨        │
│                             │
│   🔵 ═══════════> 🟣       │
│                             │
│  Connection Upgraded!       │
│                             │
└─────────────────────────────┘
```

#### P2P Chat View
```
┌─────────────────────────────┐
│ Charlie     🟣 Direct       │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ 🟣 Direct connection    │ │
│ │    established!         │ │
│ └─────────────────────────┘ │
│                             │
│  ┌───────────────────┐      │
│  │ This is much more │      │
│  │ private! 🔒       │      │
│  └───────────────────┘      │
│                             │
│      ┌─────────────────┐    │
│      │ Exactly! No     │    │
│      │ servers between │    │
│      │ us now 🟣       │    │
│      └─────────────────┘    │
│                             │
│ [🟣 Connection: Direct P2P]  │
└─────────────────────────────┘
```

## State Transitions

### Connection States
```
NEW CONTACT → SERVER_CONNECTED → TRUST_BUILDING → KEY_EXCHANGE → P2P_CONNECTED
     🔵              🔵               🔵→🟣            🔵→🟣           🟣
```

### Fallback Handling
```
P2P_CONNECTED → CONNECTION_LOST → FALLBACK_PROMPT → SERVER_RECONNECT → AUTO_RETRY_P2P
      🟣              ⚠️               🔵?               🔵              🟣
```

## UI Components

### Trust Level Indicators
- **Contact List**: Color dot before name (🔵/🟣/🟠)
- **Chat Header**: Connection type badge with color
- **Message View**: Subtle border color on message bubbles
- **Connection Banner**: Status messages with appropriate colors

### Interactive Elements

#### Go Dark Button States
```
Normal:     [🟣 Go Dark]
Hover:      [🟣 Go Dark] (slight glow)
Processing: [⟳ Connecting...]
Success:    [✓ Connected]
Failed:     [⚠️ Retry]
```

#### Mode Switch Toggle (Settings)
```
Connection Preference:
┌─────────────────────┐
│ ◉ Auto (Recommended)│  - Try P2P first, fallback to server
│ ○ Always P2P       │  - P2P only (may fail)
│ ○ Always Server    │  - Never attempt P2P
└─────────────────────┘
```

## Notifications

### System Notifications
- "Charlie wants to establish a secure connection"
- "Direct connection with Charlie established!"
- "Connection to Charlie lost, reconnecting via server..."

### In-App Toasts
```
┌──────────────────────────┐
│ ✅ Secure P2P enabled    │
│    with Charlie          │
└──────────────────────────┘
```

## Settings Integration

### Per-Contact Settings
```
Charlie's Settings
├─ Connection Mode: 🟣 Direct P2P
├─ Auto-retry P2P: ✓ Enabled
├─ Verification: Voice (completed)
└─ [Remove P2P Access]
```

### Global Preferences
```
Privacy Settings
├─ Default connection: Auto
├─ P2P prompt after: 5 messages
├─ Require verification: ✓ Yes
└─ Remember P2P keys: ✓ Yes
```

## Error States

### Connection Failures
```
┌─────────────────────────────┐
│ ⚠️ P2P Connection Failed    │
├─────────────────────────────┤
│ Unable to establish direct  │
│ connection with Charlie.    │
│                            │
│ [Use Server] [Retry] [Help]│
└─────────────────────────────┘
```

### Verification Timeout
```
┌─────────────────────────────┐
│ ⏱️ Verification Expired     │
├─────────────────────────────┤
│ Secure connection request  │
│ timed out (15 minutes).    │
│                            │
│ [Send New Request] [Cancel]│
└─────────────────────────────┘
```

## Accessibility

### Screen Reader Announcements
- "Server-assisted connection with Charlie"
- "Upgrading to direct peer-to-peer connection"
- "Secure direct connection established"

### Keyboard Navigation
- `Tab` through connection options
- `Enter` to initiate Go Dark
- `Escape` to dismiss prompts
- `Ctrl+Shift+P` to toggle connection mode

## Implementation Notes

1. **Color Consistency**: Always use the defined colors (purple/blue/orange)
2. **Progressive Disclosure**: Don't overwhelm new users with P2P options
3. **Clear Feedback**: Every state change should have visual feedback
4. **Graceful Degradation**: Always provide fallback options
5. **User Control**: Never force P2P, always give choice

## Mobile Considerations

- Larger touch targets for mode switching
- Swipe gestures for quick connection mode toggle
- Persistent notification for current connection state
- Battery-aware P2P attempts (skip if low battery)