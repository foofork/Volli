# Volli Immediate Action Plan

## 🚀 UPDATE: Days 1-3 COMPLETE! ✅

See [INTEGRATION_COMPLETE.md](../INTEGRATION_COMPLETE.md) for details on what's been implemented.

## 🎯 Executive Summary

The core issue: **Web app uses mocks instead of real packages**. This 5-day plan connects them.

## 📅 Day 1-2: Create Integration Bridge ✅ COMPLETE

### Step 1: Create Integration Package
```bash
mkdir -p packages/integration/src
cd packages/integration
npm init -y
```

### Step 2: Create Core Integration
```typescript
// packages/integration/src/index.ts
import { VaultCore } from '@volli/vault-core';
import { IdentityCore } from '@volli/identity-core';
import { MessagingCore } from '@volli/messaging';
import Dexie from 'dexie';

export class VolliCore {
  private db: VolliDB;
  private vault: VaultCore;
  private identity: IdentityCore;
  
  constructor() {
    this.db = new VolliDB();
    this.vault = new VaultCore();
    this.identity = new IdentityCore();
  }
  
  async initialize() {
    await this.db.open();
    return this.db.config.get('initialized');
  }
  
  async createVault(password: string) {
    const identity = await this.identity.createIdentity();
    const vaultKey = await this.vault.deriveKey(password);
    
    await this.db.vaults.add({
      id: identity.id,
      publicKey: identity.publicKey,
      encryptedPrivateKey: await this.vault.encrypt(
        identity.privateKey,
        vaultKey
      ),
      createdAt: Date.now()
    });
    
    return identity.id;
  }
}

// packages/integration/src/database.ts
import Dexie from 'dexie';

export class VolliDB extends Dexie {
  vaults!: Dexie.Table<Vault, string>;
  messages!: Dexie.Table<Message, string>;
  contacts!: Dexie.Table<Contact, string>;
  
  constructor() {
    super('VolliDB');
    
    this.version(1).stores({
      vaults: 'id, publicKey',
      messages: '++id, conversationId, timestamp, [conversationId+timestamp]',
      contacts: 'id, publicKey, displayName'
    });
  }
}
```

## 📅 Day 3: Connect First Feature (Vault Creation) ✅ COMPLETE

### Step 1: Update Web App Stores
```typescript
// apps/web/src/lib/stores/core.ts
import { VolliCore } from '@volli/integration';
import { writable } from 'svelte/store';

// Single instance of core
export const core = new VolliCore();

// Reactive status
export const initialized = writable(false);

// Initialize on app start
export async function initializeCore() {
  const status = await core.initialize();
  initialized.set(true);
  return status;
}
```

### Step 2: Replace Mock Vault Store
```typescript
// apps/web/src/lib/stores/vault.ts
import { writable, derived } from 'svelte/store';
import { core } from './core';

export const currentVaultId = writable<string | null>(null);

export async function createVault(password: string) {
  try {
    const vaultId = await core.createVault(password);
    currentVaultId.set(vaultId);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function unlockVault(password: string) {
  try {
    const unlocked = await core.unlockVault(password);
    if (unlocked) {
      currentVaultId.set(unlocked.id);
    }
    return { success: unlocked };
  } catch (error) {
    return { success: false, error };
  }
}
```

### Step 3: Update UI Component
```svelte
<!-- apps/web/src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { initializeCore } from '$lib/stores/core';
  import { createVault } from '$lib/stores/vault';
  
  let loading = true;
  
  onMount(async () => {
    await initializeCore();
    loading = false;
  });
  
  async function handleCreateVault(event) {
    const password = event.detail.password;
    const result = await createVault(password);
    
    if (result.success) {
      // Navigate to messages
      goto('/messages');
    }
  }
</script>

{#if loading}
  <LoadingSpinner />
{:else}
  <VaultSetup on:create={handleCreateVault} />
{/if}
```

## 📅 Day 4: Add Message Persistence ✅ COMPLETE

### Step 1: Extend Integration
```typescript
// packages/integration/src/messaging.ts
export class MessagingService {
  constructor(
    private db: VolliDB,
    private crypto: VaultCore
  ) {}
  
  async sendMessage(
    conversationId: string,
    content: string,
    senderVault: Vault
  ) {
    // Encrypt content
    const encrypted = await this.crypto.encrypt(
      content,
      senderVault.key
    );
    
    // Store in Dexie
    const message = await this.db.messages.add({
      conversationId,
      content: encrypted,
      senderId: senderVault.id,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    // TODO: Queue for P2P delivery
    return message;
  }
  
  async getMessages(conversationId: string) {
    return this.db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('timestamp');
  }
}
```

### Step 2: Update Message Store
```typescript
// apps/web/src/lib/stores/messages.ts
import { writable, derived } from 'svelte/store';
import { core } from './core';

export const messages = writable<Map<string, Message[]>>(new Map());

export async function sendMessage(conversationId: string, content: string) {
  const message = await core.messaging.sendMessage(conversationId, content);
  
  // Update local store
  messages.update(m => {
    const conv = m.get(conversationId) || [];
    conv.push(message);
    m.set(conversationId, conv);
    return m;
  });
}

export async function loadConversation(conversationId: string) {
  const msgs = await core.messaging.getMessages(conversationId);
  
  messages.update(m => {
    m.set(conversationId, msgs);
    return m;
  });
}
```

## 📅 Day 5: Test & Polish

### Step 1: Add Development Tools
```typescript
// apps/web/src/lib/dev-tools.ts
export async function inspectDatabase() {
  const db = core.db;
  
  console.log('Vaults:', await db.vaults.toArray());
  console.log('Messages:', await db.messages.toArray());
  console.log('Contacts:', await db.contacts.toArray());
}

// Add to window for console access
if (import.meta.env.DEV) {
  window.volli = { inspectDatabase };
}
```

### Step 2: Add Loading States
```svelte
<!-- apps/web/src/components/MessageList.svelte -->
<script>
  export let conversationId;
  
  let loading = true;
  let messages = [];
  
  onMount(async () => {
    loading = true;
    await loadConversation(conversationId);
    messages = $messagesStore.get(conversationId) || [];
    loading = false;
  });
</script>

{#if loading}
  <MessageSkeleton />
{:else if messages.length === 0}
  <EmptyState />
{:else}
  {#each messages as message}
    <Message {message} />
  {/each}
{/if}
```

### Step 3: Verify Persistence
```typescript
// Simple test script
async function testPersistence() {
  // Create vault
  const vaultId = await core.createVault('test123');
  console.log('Created vault:', vaultId);
  
  // Send message
  await core.messaging.sendMessage('conv1', 'Hello persistent world!');
  
  // Refresh page and check if data persists
  window.location.reload();
}
```

## 🚀 Immediate Benefits

After 5 days, you'll have:
1. ✅ **Real data persistence** - survives page refresh
2. ✅ **Actual encryption** - using vault-core crypto
3. ✅ **Proper architecture** - packages connected to UI
4. ✅ **Foundation for P2P** - messages ready to sync

## 🔧 Package.json Updates

### Integration Package
```json
{
  "name": "@volli/integration",
  "version": "0.1.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@volli/vault-core": "workspace:*",
    "@volli/identity-core": "workspace:*",
    "@volli/messaging": "workspace:*",
    "dexie": "^3.2.4"
  }
}
```

### Web App Updates
```json
{
  "dependencies": {
    "@volli/integration": "workspace:*",
    "dexie": "^3.2.4"
  }
}
```

## 🎯 Success Metrics

Day 5 checklist:
- [ ] Can create vault with password
- [ ] Vault persists after page refresh
- [ ] Can send messages to a conversation
- [ ] Messages persist and reload
- [ ] Real encryption used (not mocks)
- [ ] Browser DevTools show IndexedDB data

## 🚧 What's Still Missing (Future Work)

- P2P networking (libp2p integration)
- CRDT sync (Yjs migration)  
- Post-quantum crypto
- Multi-device sync
- Offline queue

But you'll have a **working foundation** instead of a mock!

## 💡 Pro Tips

1. **Start with vaults** - easiest to test
2. **Use DevTools** - Application → IndexedDB to verify
3. **Keep mocks** - temporarily, for unimplemented features
4. **Test incrementally** - one feature at a time

## 📞 When You're Stuck

Common issues:
- **"Module not found"** - Run `npm install` in packages/integration
- **"Cannot find workspace"** - Update root package.json workspaces
- **"Dexie not defined"** - Make sure to import it
- **"Crypto fails"** - Check libsodium is loaded

---

This plan gets Volli from "pretty UI demo" to "working app with persistence" in 5 days. Each day has clear deliverables that can be tested independently.