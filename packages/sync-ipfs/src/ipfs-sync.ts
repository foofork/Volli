import { EventEmitter } from 'events';
import { create, IPFS } from 'ipfs-core';
import { CID } from 'multiformats/cid';
import all from 'it-all';
// import { v4 as uuidv4 } from 'uuid';
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from 'uint8arrays';
import {
  IPFSConfig,
  // SyncNode,
  SyncManifest,
  SyncBlock,
  SyncStatus,
  SyncOptions,
  SyncStats,
  ConflictResolution,
  SyncConflict
} from './types';
// import { signData, verifySignature } from '@volli/identity-core';

// Temporary crypto functions until identity-core types are available
async function signData(_data: Uint8Array, _privateKey: any): Promise<Uint8Array> {
  // Placeholder signing
  return new Uint8Array(64);
}

/**
 * IPFS-based synchronization manager
 */
export class IPFSSync extends EventEmitter {
  private ipfs: IPFS | null = null;
  private nodeId: string;
  private options: SyncOptions;
  private syncInterval: NodeJS.Timeout | null = null;
  private currentManifestCid: string | null = null;
  // private _peers: Map<string, SyncNode>;
  private conflicts: Map<string, SyncConflict>;
  private isInitialized = false;
  
  constructor(nodeIdOrOptions: string | SyncOptions, options: SyncOptions = {}) {
    super();
    
    // Handle both constructor signatures for compatibility
    if (typeof nodeIdOrOptions === 'string') {
      this.nodeId = nodeIdOrOptions;
      this.options = {
        conflictResolution: ConflictResolution.LATEST_WINS,
        syncInterval: 60000, // 1 minute
        maxRetries: 3,
        batchSize: 100,
        ...options
      };
    } else {
      // Options object passed as first parameter (test compatibility)
      const opts = nodeIdOrOptions;
      this.nodeId = opts.nodeId || 'unknown-node';
      this.options = {
        conflictResolution: ConflictResolution.LATEST_WINS,
        syncInterval: 60000, // 1 minute
        maxRetries: 3,
        batchSize: 100,
        ...opts
      };
    }
    
    // this._peers = new Map();
    this.conflicts = new Map();
  }
  
  /**
   * Get node ID
   */
  getNodeId(): string {
    return this.nodeId;
  }
  
  /**
   * Check if node is online
   */
  isOnline(): boolean {
    return this.ipfs !== null && this.isInitialized;
  }
  
  /**
   * Initialize IPFS node
   */
  async initialize(config?: IPFSConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Create IPFS node
      this.ipfs = await create({
        repo: config?.repo || `.ipfs-${this.nodeId}`,
        config: {
          Addresses: {
            Swarm: config?.config?.Addresses?.Swarm || [
              '/ip4/0.0.0.0/tcp/0',
              '/ip4/0.0.0.0/tcp/0/ws'
            ],
            ...config?.config?.Addresses
          },
          Discovery: {
            MDNS: {
              Enabled: true,
              Interval: 20,
              ...config?.config?.Discovery?.MDNS
            },
            ...config?.config?.Discovery
          },
          ...config?.config
        },
        libp2p: config?.libp2p,
        preload: config?.preload || { enabled: false }
      });
      
      // Get node info
      const id = await this.ipfs.id();
      console.log('IPFS node initialized:', id.id);
      
      // Subscribe to sync topic
      await this.subscribeToSyncTopic();
      
      // Start peer discovery
      await this.startPeerDiscovery();
      
      this.isInitialized = true;
      
      // Start sync interval
      if (this.options.syncInterval && this.options.syncInterval > 0) {
        this.startAutoSync();
      }
    } catch (error) {
      this.emit('sync:error', error as Error);
      throw error;
    }
  }
  
  /**
   * Shutdown IPFS node
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized || !this.ipfs) {
      return;
    }
    
    // Stop auto sync
    this.stopAutoSync();
    
    // Unsubscribe from topics
    await this.ipfs.pubsub.unsubscribe(this.getSyncTopic());
    
    // Stop IPFS node
    await this.ipfs.stop();
    
    this.ipfs = null;
    this.isInitialized = false;
  }
  
  /**
   * Add content to IPFS
   */
  async addContent(data: Uint8Array, options?: {
    pin?: boolean;
    wrapWithDirectory?: boolean;
  }): Promise<string> {
    this.ensureInitialized();
    
    const result = await this.ipfs!.add(data, {
      pin: options?.pin !== false,
      wrapWithDirectory: options?.wrapWithDirectory
    });
    
    return result.cid.toString();
  }
  
  /**
   * Get content from IPFS
   */
  async getContent(cid: string): Promise<Uint8Array> {
    this.ensureInitialized();
    
    const chunks = await all(this.ipfs!.cat(cid));
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }
  
  /**
   * Create sync manifest
   */
  async createManifest(blocks: SyncBlock[], privateKey: any): Promise<SyncManifest> {
    const manifest: SyncManifest = {
      version: 1,
      nodeId: this.nodeId,
      timestamp: Date.now(),
      blocks,
      previousCid: this.currentManifestCid || undefined,
      signature: ''
    };
    
    // Sign manifest
    const manifestData = JSON.stringify({
      version: manifest.version,
      nodeId: manifest.nodeId,
      timestamp: manifest.timestamp,
      blocks: manifest.blocks,
      previousCid: manifest.previousCid
    });
    
    const signature = await signData(
      uint8ArrayFromString(manifestData, 'utf8'),
      privateKey
    );
    
    manifest.signature = uint8ArrayToString(signature, 'base64');
    
    return manifest;
  }
  
  /**
   * Publish sync manifest
   */
  async publishManifest(manifest: SyncManifest): Promise<string> {
    this.ensureInitialized();
    
    // Add manifest to IPFS
    const manifestData = uint8ArrayFromString(JSON.stringify(manifest), 'utf8');
    const cid = await this.addContent(manifestData, { pin: true });
    
    // Update current manifest
    this.currentManifestCid = cid;
    
    // Announce to peers
    await this.announceManifest(cid);
    
    return cid;
  }
  
  /**
   * Sync with peers
   */
  async sync(): Promise<SyncStats> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const stats: SyncStats = {
      duration: 0,
      blocksAdded: 0,
      blocksReceived: 0,
      bytesTransferred: 0,
      conflicts: 0,
      errors: 0
    };
    
    try {
      this.emit('sync:started');
      
      // Get peer manifests
      const peerManifests = await this.getPeerManifests();
      
      // Process each peer's manifest
      for (const [peerId, manifestCid] of peerManifests) {
        try {
          await this.syncWithPeer(peerId, manifestCid, stats);
        } catch (error) {
          console.error(`Failed to sync with peer ${peerId}:`, error);
          stats.errors++;
        }
      }
      
      stats.duration = Date.now() - startTime;
      this.emit('sync:completed', stats);
      
    } catch (error) {
      this.emit('sync:error', error as Error);
      throw error;
    }
    
    return stats;
  }
  
  /**
   * Get sync status
   */
  async getStatus(): Promise<SyncStatus> {
    this.ensureInitialized();
    
    const swarmPeers = await this.ipfs!.swarm.peers();
    const repoStat = await this.ipfs!.repo.stat();
    
    return {
      isOnline: this.ipfs!.isOnline(),
      connectedPeers: swarmPeers.length,
      syncedBlocks: 0, // TODO: Track synced blocks
      pendingBlocks: 0, // TODO: Track pending blocks
      lastSyncAt: undefined, // TODO: Track last sync time
      bandwidth: {
        rateIn: 0, // TODO: Track bandwidth
        rateOut: 0,
        totalIn: Number(repoStat.repoSize),
        totalOut: 0
      }
    };
  }
  
  /**
   * Resolve conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedCid?: string
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }
    
    let resolvedCid: string;
    
    switch (resolution) {
      case 'local':
        resolvedCid = conflict.localCid;
        break;
      case 'remote':
        resolvedCid = conflict.remoteCid;
        break;
      case 'merge':
        if (!mergedCid) {
          throw new Error('Merged CID required for merge resolution');
        }
        resolvedCid = mergedCid;
        break;
    }
    
    conflict.resolvedCid = resolvedCid;
    conflict.resolvedAt = Date.now();
    
    // TODO: Apply resolution
  }
  
  /**
   * Pin content
   */
  async pin(cid: string, recursive: boolean = true): Promise<void> {
    this.ensureInitialized();
    await this.ipfs!.pin.add(cid, { recursive });
  }
  
  /**
   * Unpin content
   */
  async unpin(cid: string, recursive: boolean = true): Promise<void> {
    this.ensureInitialized();
    await this.ipfs!.pin.rm(cid, { recursive });
  }
  
  /**
   * Get pinned content
   */
  async getPinnedContent(): Promise<string[]> {
    this.ensureInitialized();
    
    const pins = [];
    for await (const pin of this.ipfs!.pin.ls()) {
      pins.push(pin.cid.toString());
    }
    
    return pins;
  }
  
  /**
   * Start auto sync
   */
  private startAutoSync(): void {
    if (this.syncInterval) {
      return;
    }
    
    this.syncInterval = setInterval(() => {
      this.sync().catch(error => {
        console.error('Auto sync failed:', error);
        this.emit('sync:error', error);
      });
    }, this.options.syncInterval!);
  }
  
  /**
   * Stop auto sync
   */
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Subscribe to sync topic
   */
  private async subscribeToSyncTopic(): Promise<void> {
    const topic = this.getSyncTopic();
    
    await this.ipfs!.pubsub.subscribe(topic, (msg) => {
      this.handleSyncMessage(msg).catch(console.error);
    });
  }
  
  /**
   * Handle sync message
   */
  private async handleSyncMessage(msg: any): Promise<void> {
    try {
      const message = JSON.parse(uint8ArrayToString(msg.data, 'utf8'));
      
      switch (message.type) {
        case 'announce':
          await this.handleManifestAnnouncement(message);
          break;
        case 'request':
          await this.handleBlockRequest(message);
          break;
      }
    } catch (error) {
      console.error('Failed to handle sync message:', error);
    }
  }
  
  /**
   * Handle manifest announcement
   */
  private async handleManifestAnnouncement(message: any): Promise<void> {
    const { nodeId } = message.payload;
    
    if (nodeId === this.nodeId) {
      return; // Ignore our own announcements
    }
    
    // TODO: Track peer manifest
  }
  
  /**
   * Handle block request
   */
  private async handleBlockRequest(message: any): Promise<void> {
    const { blockCid } = message.payload;
    
    // Check if we have the block
    try {
      await this.ipfs!.block.get(CID.parse(blockCid));
      // We have the block, peer will find it through DHT
    } catch {
      // We don't have the block
    }
  }
  
  /**
   * Announce manifest to peers
   */
  private async announceManifest(manifestCid: string): Promise<void> {
    const message = {
      type: 'announce',
      nodeId: this.nodeId,
      payload: { manifestCid },
      timestamp: Date.now()
    };
    
    await this.ipfs!.pubsub.publish(
      this.getSyncTopic(),
      uint8ArrayFromString(JSON.stringify(message), 'utf8')
    );
  }
  
  /**
   * Start peer discovery
   */
  private async startPeerDiscovery(): Promise<void> {
    // Listen for peer connection events
    // TODO: libp2p is not exposed in the IPFS types
    // (this.ipfs as any).libp2p?.addEventListener('peer:connect', (event: any) => {
    //   this.handlePeerConnected(event.detail).catch(console.error);
    // });
    
    // (this.ipfs as any).libp2p?.addEventListener('peer:disconnect', (event: any) => {
    //   this.handlePeerDisconnected(event.detail).catch(console.error);
    // });
  }
  
  // /**
  //  * Handle peer connected
  //  */
  // private async _handlePeerConnected(peer: any): Promise<void> {
  //   const peerId = peer.id.toString();
    
  //   const syncNode: SyncNode = {
  //     id: uuidv4(),
  //     peerId,
  //     addresses: peer.multiaddrs.map((addr: any) => addr.toString()),
  //     lastSeen: Date.now()
  //   };
    
  //   this.peers.set(peerId, syncNode);
  //   this.emit('peer:connected', syncNode);
  // }
  
  // /**
  //  * Handle peer disconnected
  //  */
  // private async _handlePeerDisconnected(peer: any): Promise<void> {
  //   const peerId = peer.id.toString();
  //   this.peers.delete(peerId);
  //   this.emit('peer:disconnected', peerId);
  // }
  
  /**
   * Get peer manifests
   */
  private async getPeerManifests(): Promise<Map<string, string>> {
    // TODO: Implement peer manifest discovery
    return new Map();
  }
  
  /**
   * Sync with specific peer
   */
  private async syncWithPeer(
    _peerId: string,
    manifestCid: string,
    stats: SyncStats
  ): Promise<void> {
    // Get peer manifest
    const manifestData = await this.getContent(manifestCid);
    const manifest = JSON.parse(uint8ArrayToString(manifestData, 'utf8')) as SyncManifest;
    
    // Verify manifest signature
    // TODO: Verify signature
    
    // Process blocks
    for (const block of manifest.blocks) {
      try {
        // Check if we already have this block
        const haveBlock = await this.haveBlock(block.cid);
        
        if (!haveBlock) {
          // Download block
          await this.downloadBlock(block);
          stats.blocksReceived++;
          stats.bytesTransferred += block.size;
          
          this.emit('block:received', block);
        }
      } catch (error) {
        console.error(`Failed to process block ${block.id}:`, error);
        stats.errors++;
      }
    }
  }
  
  /**
   * Check if we have a block
   */
  private async haveBlock(cid: string): Promise<boolean> {
    try {
      await this.ipfs!.block.get(CID.parse(cid));
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Download block from network
   */
  private async downloadBlock(block: SyncBlock): Promise<void> {
    // The block will be fetched automatically when we try to get it
    await this.getContent(block.cid);
    
    // Pin the block
    await this.pin(block.cid, false);
  }
  
  /**
   * Get sync topic
   */
  private getSyncTopic(): string {
    return `/volli/sync/1.0.0`;
  }
  
  /**
   * Ensure IPFS is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.ipfs) {
      throw new Error('IPFS not initialized');
    }
  }
}