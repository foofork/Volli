/**
 * Type definitions for IPFS synchronization
 */

/**
 * IPFS node configuration
 */
export interface IPFSConfig {
  repo?: string;
  config?: {
    Addresses?: {
      Swarm?: string[];
      API?: string;
      Gateway?: string;
    };
    Bootstrap?: string[];
    Discovery?: {
      MDNS?: {
        Enabled?: boolean;
        Interval?: number;
      };
      webRTCStar?: {
        Enabled?: boolean;
      };
    };
  };
  libp2p?: any;
  preload?: {
    enabled?: boolean;
  };
}

/**
 * Sync node information
 */
export interface SyncNode {
  id: string;
  peerId: string;
  addresses: string[];
  lastSeen: number;
  metadata?: Record<string, any>;
}

/**
 * Sync manifest
 */
export interface SyncManifest {
  version: number;
  nodeId: string;
  timestamp: number;
  blocks: SyncBlock[];
  previousCid?: string;
  signature: string;
}

/**
 * Sync block reference
 */
export interface SyncBlock {
  id: string;
  type: 'document' | 'identity' | 'message' | 'file';
  cid: string;
  size: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Sync status
 */
export interface SyncStatus {
  isOnline: boolean;
  connectedPeers: number;
  syncedBlocks: number;
  pendingBlocks: number;
  lastSyncAt?: number;
  bandwidth: {
    rateIn: number;
    rateOut: number;
    totalIn: number;
    totalOut: number;
  };
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  id: string;
  type: 'document' | 'identity' | 'message';
  localCid: string;
  remoteCid: string;
  localTimestamp: number;
  remoteTimestamp: number;
  resolvedCid?: string;
  resolvedAt?: number;
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolution {
  LATEST_WINS = 'latest_wins',
  EARLIEST_WINS = 'earliest_wins',
  LOCAL_WINS = 'local_wins',
  REMOTE_WINS = 'remote_wins',
  MANUAL = 'manual',
  MERGE = 'merge'
}

/**
 * Sync options
 */
export interface SyncOptions {
  nodeId?: string;
  enableRelay?: boolean;
  swarmAddresses?: string[];
  bootstrapPeers?: string[];
  conflictResolution?: ConflictResolution;
  syncInterval?: number;
  maxRetries?: number;
  batchSize?: number;
  bandwidth?: {
    maxUpload?: number;
    maxDownload?: number;
  };
}

/**
 * Pin status
 */
export interface PinStatus {
  cid: string;
  type: 'direct' | 'recursive' | 'indirect';
  pinned: boolean;
  size?: number;
}

/**
 * Replication policy
 */
export interface ReplicationPolicy {
  minReplicas: number;
  maxReplicas: number;
  preferredNodes?: string[];
  excludeNodes?: string[];
  geoDistribution?: boolean;
}

/**
 * Sync events
 */
export interface SyncEvents {
  'sync:started': () => void;
  'sync:completed': (stats: SyncStats) => void;
  'sync:progress': (progress: SyncProgress) => void;
  'sync:error': (error: Error) => void;
  'sync:conflict': (conflict: SyncConflict) => void;
  'peer:connected': (peer: SyncNode) => void;
  'peer:disconnected': (peerId: string) => void;
  'block:added': (block: SyncBlock) => void;
  'block:received': (block: SyncBlock) => void;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  duration: number;
  blocksAdded: number;
  blocksReceived: number;
  bytesTransferred: number;
  conflicts: number;
  errors: number;
}

/**
 * Sync progress
 */
export interface SyncProgress {
  phase: 'discovery' | 'download' | 'upload' | 'verify' | 'complete';
  current: number;
  total: number;
  percentage: number;
  bytesTransferred: number;
  estimatedTimeRemaining?: number;
}

/**
 * IPFS file metadata
 */
export interface IPFSFileMetadata {
  cid: string;
  name?: string;
  size: number;
  type?: string;
  chunks?: string[]; // CIDs of chunks for large files
  encrypted: boolean;
  createdAt: number;
  modifiedAt?: number;
}

/**
 * Pubsub message
 */
export interface PubsubMessage {
  type: 'manifest' | 'block' | 'request' | 'announce';
  nodeId: string;
  payload: any;
  timestamp: number;
  signature: string;
}

/**
 * Swarm connection info
 */
export interface SwarmPeer {
  addr: string;
  peer: string;
  latency?: string;
  muxer?: string;
  streams?: string[];
}