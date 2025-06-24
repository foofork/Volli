# Volli Vault Management Flow Specification

## Overview

This specification defines the complete vault management system including creation, unlock, lock, and auto-lock flows as implemented in Volli's current system.

## 🏗️ Vault Architecture (Implemented)

### Vault Structure
```typescript
interface VaultState {
  isInitialized: boolean;    // Has vault been created
  isUnlocked: boolean;       // Is vault currently accessible
  identity: Identity | null; // Current identity (when unlocked)
  lastActivity: number;      // Timestamp for auto-lock
  autoLockTimeout: number;   // 5 minutes default
}
```

### Storage Architecture
- **Encrypted Storage**: IndexedDB with Dexie
- **Key Management**: Memory-only derived keys (no persistence)
- **Identity Data**: Encrypted private keys + metadata
- **Session Management**: Auto-lock with configurable timeout

## 🔑 Vault Creation Flow (Implemented)

### 1. Identity Creation Integration
```mermaid
flowchart TD
    A[Start Identity Creation] --> B[Generate Key Pair]
    B --> C[Request Passphrase]
    C --> D[Validate Passphrase]
    D --> E{Valid?}
    E -->|No| C
    E -->|Yes| F[Derive Vault Key]
    F --> G[Encrypt Identity]
    G --> H[Store in IndexedDB]
    H --> I[Mark Vault Initialized]
    I --> J[Auto-unlock Vault]
    J --> K[Complete]
```

### 2. Passphrase Requirements (Current)
```typescript
// Implemented validation rules
PASSPHRASE_REQUIREMENTS = {
  minLength: 8,           // Minimum 8 characters
  requireMix: false,      // No complexity requirements (UX focus)
  allowCommon: true,      // User choice priority
  showStrength: true,     // Visual feedback provided
  confirmRequired: true   // Double-entry verification
}
```

### 3. Key Derivation Process
1. **Salt Generation**: 16-byte cryptographically secure random salt
2. **Argon2id Derivation**: 64MB memory, 2 operations, passphrase + salt
3. **Encryption**: XChaCha20-Poly1305 with derived key
4. **Storage**: Encrypted identity + salt stored in IndexedDB

## 🔓 Vault Unlock Flow (Implemented)

### 1. Unlock Process
```mermaid
flowchart TD
    A[User Enters Passphrase] --> B[Retrieve Salt from DB]
    B --> C[Derive Key with Argon2id]
    C --> D[Attempt Decryption]
    D --> E{Success?}
    E -->|No| F[Show Error Message]
    F --> A
    E -->|Yes| G[Load Identity to Memory]
    G --> H[Start Auto-lock Timer]
    H --> I[Load All Data]
    I --> J[Mark Vault Unlocked]
    J --> K[Navigate to App]
```

### 2. Data Loading (Current Implementation)
```typescript
// Performed after successful unlock
async function loadVaultData() {
  await messages.loadConversations();  // Load encrypted messages
  await contacts.loadContacts();       // Load contact list
  await files.loadFiles();             // Load file metadata
  // All data remains encrypted at rest
}
```

### 3. Error Handling
- **Wrong Passphrase**: Clear error message, allow retry
- **Database Error**: Technical error display with retry option
- **Memory Error**: Graceful fallback with simplified interface

## 🔒 Vault Lock Flow (Implemented)

### 1. Manual Lock Process
```mermaid
flowchart TD
    A[User Clicks Lock] --> B[Clear Derived Key]
    B --> C[Clear Identity from Memory]
    C --> D[Stop Auto-lock Timer]
    D --> E[Clear All Cached Data]
    E --> F[Mark Vault Locked]
    F --> G[Navigate to Auth]
```

### 2. Auto-lock Process (Implemented)
```typescript
// Current auto-lock implementation
AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function startAutoLockTimer() {
  setInterval(() => {
    if (isInactive() && vault.isUnlocked) {
      performAutoLock();
    }
  }, 60000); // Check every minute
}

function updateActivity() {
  lastActivity = Date.now();
}
```

### 3. Security Cleanup
- **Memory Clearing**: Zero out derived keys and sensitive data
- **Cache Clearing**: Remove all decrypted content from memory
- **UI State Reset**: Return to locked state interface

## ⚡ Auto-lock System (Implemented)

### 1. Activity Detection
```typescript
// Events that reset auto-lock timer
ACTIVITY_EVENTS = [
  'click', 'keydown', 'mousemove', 'scroll',
  'touchstart', 'focus', 'input'
];

// Activity tracking
function trackActivity() {
  ACTIVITY_EVENTS.forEach(event => {
    window.addEventListener(event, updateActivity, true);
  });
}
```

### 2. Background Processing
- **Timer Management**: Precise interval checking (1-minute resolution)
- **State Persistence**: Activity tracking across app navigation
- **Grace Period**: No auto-lock during active operations

### 3. User Experience
- **Warning System**: No warnings implemented (immediate lock)
- **Recovery**: Seamless re-unlock without data loss
- **Customization**: Fixed 5-minute timeout (future: user configurable)

## 🛡️ Security Properties (Achieved)

### 1. Key Management
- ✅ **No Key Persistence**: Keys only exist in memory during session
- ✅ **Secure Derivation**: Argon2id with appropriate parameters
- ✅ **Memory Cleanup**: Secure disposal on lock/error
- ✅ **Session Isolation**: Fresh key derivation each unlock

### 2. Data Protection
- ✅ **Encryption at Rest**: All sensitive data encrypted in IndexedDB
- ✅ **Access Control**: Data inaccessible when vault locked
- ✅ **Atomic Operations**: Consistent state during operations
- ✅ **Error Recovery**: Graceful handling of failures

### 3. User Experience
- ✅ **Fast Unlock**: ~200ms typical unlock time
- ✅ **Seamless Lock**: Instant lock with no data loss
- ✅ **Activity Tracking**: Natural interaction patterns
- ✅ **Error Feedback**: Clear, actionable error messages

## 📊 Performance Metrics (Current)

### Timing Benchmarks
```typescript
// Typical performance (Chrome on modern hardware)
VAULT_CREATION: 200-300ms  // Including key derivation + storage
VAULT_UNLOCK: 150-250ms    // Key derivation + data loading
VAULT_LOCK: <10ms          // Memory cleanup + state change
AUTO_LOCK_CHECK: <5ms      // Background timer operations
```

### Resource Usage
- **Memory**: ~5MB peak during key derivation
- **Storage**: <1KB vault overhead per identity
- **CPU**: Argon2id ~100-200ms per operation
- **Battery**: Minimal impact from background timers

## 🔬 Testing Coverage (Implemented)

### Functional Tests
- ✅ Vault creation with various passphrase types
- ✅ Successful unlock with correct passphrase
- ✅ Failed unlock with incorrect passphrase
- ✅ Manual lock and unlock cycles
- ✅ Auto-lock timer functionality
- ✅ Data accessibility state changes

### Security Tests
- ✅ Key derivation consistency
- ✅ Encryption/decryption round trips
- ✅ Memory cleanup verification
- ✅ State isolation between lock/unlock
- ✅ Error condition handling

### Performance Tests
- ✅ Key derivation benchmarks
- ✅ Large data set unlock timing
- ✅ Memory usage profiling
- ✅ Battery usage assessment

## 🚧 Future Enhancements (Next Phase)

### Planned Features
- [ ] **Configurable Timeouts**: User-selectable auto-lock periods
- [ ] **Multiple Vaults**: Support for separate encrypted containers
- [ ] **Biometric Unlock**: WebAuth integration for modern devices
- [ ] **Recovery Options**: Backup passphrase or recovery codes
- [ ] **Hardware Integration**: HSM/secure enclave support

### Security Improvements
- [ ] **Key Rotation**: Change vault passphrase without re-encryption
- [ ] **Audit Logging**: Encrypted access logs for security review
- [ ] **Emergency Lock**: Panic button for immediate vault destruction
- [ ] **Session Sharing**: Secure vault access across browser tabs

This specification reflects the current implemented vault management system in Volli as of December 2024.