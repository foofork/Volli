# Adaptive Trust System - Connection-Based Trust Model

## Overview

The Adaptive Trust Layer focuses on **dynamic peer relationship trust** that evolves based on interaction history and connection preferences, NOT environmental network adaptation. The system learns user preferences for each contact and provides visual security indicators for different connection modes.

## Core Concept

The adaptive trust system intelligently manages how users connect with their contacts, remembering preferences and building trust relationships over time. It creates a **human-centric trust model** that mirrors how trust naturally develops in relationships.

## Visual Security Indicators

| Mode | Color | Icon | Description | Security Level |
|------|-------|------|-------------|----------------|
| **Direct P2P** | 🟣 Purple | 🔒 | Fully private peer-to-peer connection | Highest |
| **Server-Assisted** | 🔵 Blue | 🔐 | Encrypted but routed through signaling server | High |
| **Unverified** | 🟠 Orange | ⚠️ | Unverified source or contact | Caution |

## MVP Features

### 1. Connection Mode Memory
- Auto-suggest connection type based on history with each contact
- If Alice connects to Bob via P2P 3 times → auto-suggest P2P for future connections
- Visual indicators show current and preferred connection modes

### 2. Trust-Based UI Adaptation
- **Trusted contacts** (P2P history): Full UI features, purple accent, all capabilities
- **New contacts** (server-required): Standard UI, blue accent, core features
- **Unverified contacts**: Minimal UI, orange accent, text-only communication

### 3. Smart Defaults from Behavior
- Frequently direct-connected peers → auto-enable "always try direct first"
- Multiple failed P2P attempts → auto-suggest server fallback
- Remember per-contact preferences (quiet hours, connection methods)

## "Go Dark" Feature

### Progressive Trust Building
Users can transition from server-assisted to fully private P2P connections as trust develops.

### User Flow
1. **Initial Connection** - Users connect via server (blue indicator)
   - Easy onboarding, no friction
   - Encrypted but server-routed

2. **Trust Building** - After successful interactions
   - System prompts: "Ready to go direct? 🟣"
   - One-tap upgrade to P2P mode

3. **Seamless Transition**
   - UI morphs from blue → purple
   - "Going dark..." transition animation
   - Conversation history preserved

4. **Smart Fallback**
   - If P2P fails: "Reconnect through server?"
   - Temporary blue mode with automatic P2P retry
   - User setting: "Always try direct first"

## Remote P2P Key Exchange

### Secure Key Exchange for Remote Users
Users who can't meet physically can still establish secure P2P connections.

### Protocol
1. **Ephemeral Key Exchange**
   - Generate one-time Diffie-Hellman keys during server-assisted chat
   - Exchange over existing encrypted channel
   - Server never sees derived P2P keys

2. **Time-Bound Invites**
   ```
   Alice → "Send dark mode invite" → 15-minute window
   Bob receives notification → Accept → Keys exchange
   Both transition to purple P2P → Original keys destroyed
   ```

3. **Verification Methods**
   - Voice verification: Read key fingerprint
   - Shared secret: Confirm previous conversation detail
   - Social proof: Mutual contacts vouch (web of trust)

### Persistent Connection After First Exchange
- Initial exchange creates long-term identity keys
- Future connections auto-negotiate using stored keys
- Session keys rotate automatically
- No manual re-verification needed

## Unified Message Interface

### Single Conversation View
- All message types (P2P, server-assisted, unverified) in one interface
- Per-message security indicators
- Clear visual differentiation with colored borders/badges
- Inline notifications for security state changes

### Security Context Preservation
- Users always know their security level
- Mode changes are explicit and visible
- Warnings for security downgrades

## Multi-Device Support

### Device Introduction Protocol
- Primary device introduces new devices to P2P contacts
- One-tap approval: "Add tablet to P2P network?"
- Primary device signs new device's keys
- Contacts notified: "Alice added new device 📱"

## Trust Management

### Trust Revocation
- Simple "Remove P2P access" button per contact
- Forces connection back to server-only mode
- Preserves conversation history

### Backup & Recovery
- **Default**: P2P keys NOT included in backups (maximum security)
- **Optional**: "Include secure connections" toggle with security warnings
- **Recovery**: Batch re-invitation system for previous P2P contacts

## Group Chat Support

### Group Trust Modes
- **Default**: Server-assisted (blue) for all group chats
- **P2P Groups**: Can be toggled if all members are P2P-capable
- **Mixed Mode**: Fallback to server if any member lacks P2P

## Implementation Priority

### Phase 1 (MVP)
- Connection mode memory
- Visual security indicators
- Basic "go dark" transition
- Trust revocation

### Phase 2
- Remote key exchange protocol
- Multi-device support
- Group P2P mode

### Phase 3
- Advanced trust metrics
- Web of trust integration
- Backup/recovery options

## Technical Integration

The adaptive trust layer integrates with:
- `SignalingClient` - For connection management
- `NetworkStore` - For storing peer preferences
- UI components - For visual indicators and mode switching

## Security Considerations

- All P2P keys stored encrypted locally
- Forward secrecy through session key rotation
- Time-bound operations prevent replay attacks
- Clear user consent for all trust upgrades
- No behavioral tracking or profiling

## User Benefits

- **"It just works"** - Remembers connection preferences
- **Progressive privacy** - Start easy, upgrade as trust builds
- **Visual clarity** - Always know your security status
- **User control** - Explicit choices, not forced transitions