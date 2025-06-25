# Phase 2 Implementation Plan: Advanced Features

## Overview

Phase 2 focuses on making Volli truly decentralized and user-friendly by implementing:
1. Decentralized peer discovery (no single point of failure)
2. CRDT-based conflict resolution for multi-device sync
3. File sharing with encryption
4. Post-quantum cryptography preparation

## Sprint 2.1: Basic Peer Discovery (Week 1-2)

### Goal: Enable peer connections without manual offer/answer exchange

#### Task 1: QR Code Connection (3 days)
```typescript
// packages/identity-core/src/invite.ts
export class InviteLink {
  static generate(identity: Identity): string {
    const payload = {
      version: 1,
      peerId: identity.peerId,
      publicKey: identity.publicKey,
      endpoints: getLocalEndpoints(),
      timestamp: Date.now(),
      signature: sign(data, identity.privateKey)
    };
    
    return `volli://invite/${base64url(payload)}`;
  }
  
  static async accept(link: string): Promise<PeerInfo> {
    const payload = parseInviteLink(link);
    if (!verifySignature(payload)) throw new Error('Invalid invite');
    
    return {
      peerId: payload.peerId,
      publicKey: payload.publicKey,
      endpoints: payload.endpoints
    };
  }
}

// apps/web/src/routes/connect/+page.svelte
<QRCode value={inviteLink} />
<QRScanner on:scan={handleInviteLink} />
```

#### Task 2: mDNS Local Discovery (2 days)
```typescript
// packages/integration/src/network/mdns-discovery.ts
import { Bonjour } from 'bonjour-service';

export class MDNSDiscovery {
  private bonjour = new Bonjour();
  
  async advertise(peerInfo: PeerInfo) {
    this.bonjour.publish({
      name: `volli-${peerInfo.peerId.slice(0, 8)}`,
      type: 'volli',
      port: 0, // WebRTC doesn't need ports
      txt: {
        id: peerInfo.peerId,
        pk: peerInfo.publicKey,
        v: '1.0'
      }
    });
  }
  
  async discover(): Promise<PeerInfo[]> {
    return new Promise((resolve) => {
      const peers: PeerInfo[] = [];
      const browser = this.bonjour.find({ type: 'volli' });
      
      browser.on('up', (service) => {
        peers.push(parsePeerInfo(service.txt));
      });
      
      setTimeout(() => {
        browser.stop();
        resolve(peers);
      }, 5000);
    });
  }
}
```

#### Task 3: Connection Manager Refactor (3 days)
```typescript
// packages/integration/src/network/connection-manager.ts
export class ConnectionManager {
  private discoveries: Map<string, Discovery> = new Map();
  
  constructor() {
    // Register discovery methods
    this.discoveries.set('mdns', new MDNSDiscovery());
    this.discoveries.set('manual', new ManualDiscovery());
    // Future: DHT, Rendezvous, etc.
  }
  
  async discoverPeers(): Promise<PeerInfo[]> {
    const allPeers: PeerInfo[] = [];
    
    // Try all discovery methods in parallel
    const discoveries = Array.from(this.discoveries.values());
    const results = await Promise.allSettled(
      discoveries.map(d => d.discover())
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allPeers.push(...result.value);
      }
    }
    
    return deduplicatePeers(allPeers);
  }
  
  async connectToPeer(peerInfo: PeerInfo) {
    // Existing WebRTC connection logic
    // But now with automatic discovery!
  }
}
```

## Sprint 2.2: DHT Network (Week 3-4)

### Goal: Implement distributed hash table for global peer discovery

#### Task 1: DHT Library Integration (3 days)
```typescript
// Evaluate options:
// - webtorrent/bittorrent-dht (simple, battle-tested)
// - libp2p (comprehensive but complex)
// - hyperswarm (modern, good for our use case)

// packages/integration/src/network/dht-discovery.ts
import DHT from 'bittorrent-dht';

export class DHTDiscovery {
  private dht: DHT;
  
  constructor() {
    this.dht = new DHT({
      nodeId: generateNodeId(), // From public key
      bootstrap: [
        'router.bittorrent.com:6881',
        'dht.transmissionbt.com:6881',
        // Add Volli community nodes
      ]
    });
  }
  
  async announce(peerInfo: PeerInfo) {
    const infoHash = sha1(peerInfo.publicKey);
    
    this.dht.announce(infoHash, {
      port: 0, // WebRTC doesn't use ports
      implied_port: false
    });
  }
  
  async findPeer(publicKey: string): Promise<PeerInfo[]> {
    const infoHash = sha1(publicKey);
    
    return new Promise((resolve) => {
      const peers: PeerInfo[] = [];
      
      this.dht.lookup(infoHash, (err, num) => {
        if (err) return resolve([]);
        resolve(peers);
      });
      
      this.dht.on('peer', (peer, infoHash, from) => {
        // Handle peer discovery
        peers.push(parsePeerInfo(peer));
      });
    });
  }
}
```

#### Task 2: Friend Relay System (4 days)
```typescript
// packages/integration/src/relay/friend-relay.ts
export class FriendRelay {
  private trustedRelays: Set<string> = new Set();
  private messageStore: MessageStore;
  
  async relayMessage(
    message: EncryptedMessage,
    recipientId: string
  ): Promise<RelayReceipt[]> {
    // Find mutual contacts who are online
    const mutualFriends = await this.findMutualFriends(recipientId);
    const onlineFriends = mutualFriends.filter(f => f.isOnline);
    
    const receipts: RelayReceipt[] = [];
    
    for (const friend of onlineFriends) {
      try {
        const receipt = await this.sendToRelay(friend, {
          type: 'RELAY_REQUEST',
          recipientId,
          message,
          ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
          proof: this.generateProofOfRelationship(recipientId)
        });
        
        receipts.push(receipt);
        
        // Store 3 copies for redundancy
        if (receipts.length >= 3) break;
      } catch (e) {
        console.warn(`Relay failed for ${friend.id}:`, e);
      }
    }
    
    return receipts;
  }
  
  async retrieveRelayedMessages(): Promise<Message[]> {
    const messages: Message[] = [];
    
    for (const relayId of this.trustedRelays) {
      try {
        const relayMessages = await this.queryRelay(relayId);
        messages.push(...relayMessages);
      } catch (e) {
        console.warn(`Query failed for ${relayId}:`, e);
      }
    }
    
    return deduplicateMessages(messages);
  }
}
```

## Sprint 2.3: CRDT Integration (Week 5-6)

### Goal: Enable conflict-free multi-device synchronization

#### Task 1: CRDT Library Selection (2 days)
```typescript
// Evaluate:
// - Yjs (mature, good for text/data)
// - Automerge (simpler API, Rust-based)
// - GUN (includes networking)
// - OrbitDB (IPFS-based)

// packages/vault-core/src/crdt/index.ts
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export class CRDTVault {
  private doc: Y.Doc;
  private persistence: IndexeddbPersistence;
  
  constructor(vaultId: string) {
    this.doc = new Y.Doc();
    
    // Persist to IndexedDB
    this.persistence = new IndexeddbPersistence(
      `vault-${vaultId}`,
      this.doc
    );
    
    // Define CRDT types
    this.messages = this.doc.getArray('messages');
    this.contacts = this.doc.getMap('contacts');
    this.settings = this.doc.getMap('settings');
  }
  
  // Sync with another device
  async syncWith(peer: Peer) {
    const state = Y.encodeStateAsUpdate(this.doc);
    const encryptedState = await this.encrypt(state);
    
    await peer.send({
      type: 'CRDT_SYNC',
      state: encryptedState
    });
    
    peer.on('CRDT_UPDATE', async (update) => {
      const decrypted = await this.decrypt(update);
      Y.applyUpdate(this.doc, decrypted);
    });
  }
}
```

#### Task 2: Multi-Device Pairing (3 days)
```typescript
// packages/integration/src/pairing/device-pairing.ts
export class DevicePairing {
  async pairNewDevice(identity: Identity): Promise<PairingCode> {
    // Generate pairing code
    const pairingData = {
      primaryDevice: await getDeviceFingerprint(),
      timestamp: Date.now(),
      permissions: ['messages', 'contacts', 'settings'],
      expiry: Date.now() + 15 * 60 * 1000 // 15 minutes
    };
    
    const pairingCode = await generatePairingCode(pairingData);
    
    // Show QR code on primary device
    return {
      code: pairingCode,
      qrData: `volli://pair/${pairingCode}`,
      expiry: pairingData.expiry
    };
  }
  
  async completePairing(pairingCode: string) {
    const pairingData = await verifyPairingCode(pairingCode);
    
    // Exchange device keys
    const deviceKeys = await this.deriveDeviceKeys(
      this.identity.masterKey,
      pairingData.primaryDevice
    );
    
    // Initial sync
    await this.syncVault(pairingData.primaryDevice);
    
    return {
      deviceId: await getDeviceFingerprint(),
      pairedWith: pairingData.primaryDevice,
      permissions: pairingData.permissions
    };
  }
}
```

## Sprint 2.4: File Sharing (Week 7-8)

### Goal: Encrypted file transfer between peers

#### Task 1: Chunked File Transfer (4 days)
```typescript
// packages/messaging/src/file-transfer.ts
export class FileTransfer {
  private chunkSize = 64 * 1024; // 64KB chunks
  
  async sendFile(
    file: File,
    recipient: Peer
  ): Promise<TransferHandle> {
    // Generate file key
    const fileKey = generateSymmetricKey();
    
    // Encrypt file metadata
    const metadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      chunks: Math.ceil(file.size / this.chunkSize),
      hash: await calculateHash(file)
    };
    
    const encryptedMeta = await encryptWithKey(
      metadata,
      fileKey
    );
    
    // Send file announcement
    const handle = generateTransferHandle();
    await recipient.send({
      type: 'FILE_OFFER',
      handle,
      metadata: encryptedMeta,
      key: await encryptForRecipient(fileKey, recipient.publicKey)
    });
    
    // Stream chunks on acceptance
    recipient.once(`FILE_ACCEPT:${handle}`, async () => {
      await this.streamChunks(file, fileKey, recipient, handle);
    });
    
    return handle;
  }
  
  private async streamChunks(
    file: File,
    key: CryptoKey,
    recipient: Peer,
    handle: string
  ) {
    const reader = file.stream().getReader();
    let chunkIndex = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const encryptedChunk = await encryptWithKey(value, key);
      
      await recipient.send({
        type: 'FILE_CHUNK',
        handle,
        index: chunkIndex++,
        data: encryptedChunk,
        final: done
      });
      
      // Flow control
      await recipient.waitForAck(handle, chunkIndex);
    }
  }
}
```

## Implementation Timeline

### Week 1-2: Basic Discovery
- [x] QR code generation/scanning
- [x] mDNS local network discovery
- [x] Connection manager refactor

### Week 3-4: DHT Network
- [ ] DHT library integration
- [ ] Friend relay system
- [ ] Offline message queuing

### Week 5-6: CRDT Sync
- [ ] CRDT library integration
- [ ] Multi-device pairing
- [ ] Conflict resolution

### Week 7-8: File Sharing
- [ ] Chunked file transfer
- [ ] Progress tracking
- [ ] Resume capability

### Week 9-10: Post-Quantum Prep
- [ ] Research and select PQ libraries
- [ ] Implement hybrid encryption
- [ ] Performance optimization

## Success Metrics

1. **Peer Discovery**: < 5 seconds to find local peers
2. **DHT Join**: < 30 seconds to join global network
3. **Message Relay**: 95%+ delivery rate
4. **CRDT Sync**: < 2 seconds for typical sync
5. **File Transfer**: 80%+ of network speed
6. **Battery Impact**: < 5% additional drain

## Risk Mitigation

1. **DHT Blocked**: Fallback to rendezvous servers
2. **NAT Issues**: Optional TURN servers
3. **Battery Drain**: Adaptive sync intervals
4. **Network Abuse**: Rate limiting and PoW
5. **Storage Bloat**: Automatic cleanup policies

## Conclusion

Phase 2 transforms Volli from a working P2P messenger into a truly decentralized, resilient communication platform. No single points of failure, multiple discovery methods, and user choice at every level.