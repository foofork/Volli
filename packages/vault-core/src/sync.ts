import * as Automerge from '@automerge/automerge';
import { SyncChange, CRDTState, SyncStatus } from './types';
import { randomBytes } from './crypto';

/**
 * CRDT synchronization for vault documents
 */
export class VaultSync {
  private actorId: string;
  private clock: number;
  private pendingChanges: SyncChange[];
  private syncState: Map<string, CRDTState>;
  private isInitialized = false;
  private lastSyncTime?: number;
  private currentSyncStatus: SyncStatus;
  
  constructor() {
    this.actorId = this.generateActorId();
    this.clock = 0;
    this.pendingChanges = [];
    this.syncState = new Map();
    this.currentSyncStatus = SyncStatus.LOCAL;
  }
  
  /**
   * Initialize sync system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
  }
  
  /**
   * Queue a change for synchronization
   */
  async queueChange(change: SyncChange): Promise<void> {
    this.ensureInitialized();
    
    // Increment logical clock
    this.clock++;
    
    // Add to pending changes
    this.pendingChanges.push({
      ...change,
      timestamp: this.clock
    });
    
    // Update sync status
    this.currentSyncStatus = SyncStatus.LOCAL;
  }
  
  /**
   * Synchronize with remote peers
   */
  async synchronize(): Promise<SyncChange[]> {
    this.ensureInitialized();
    
    if (this.pendingChanges.length === 0) {
      return [];
    }
    
    this.currentSyncStatus = SyncStatus.SYNCING;
    
    try {
      // In a real implementation, this would:
      // 1. Connect to IPFS or other distributed storage
      // 2. Exchange changes with peers
      // 3. Resolve conflicts using CRDT merge
      // 4. Apply remote changes locally
      
      // For now, simulate sync completion
      const syncedChanges = [...this.pendingChanges];
      this.pendingChanges = [];
      this.lastSyncTime = Date.now();
      this.currentSyncStatus = SyncStatus.SYNCED;
      
      return syncedChanges;
    } catch (error) {
      this.currentSyncStatus = SyncStatus.ERROR;
      throw error;
    }
  }
  
  /**
   * Merge changes from remote peer
   */
  async mergeRemoteChanges(remoteChanges: SyncChange[]): Promise<SyncChange[]> {
    this.ensureInitialized();
    
    const conflicts: SyncChange[] = [];
    
    for (const remoteChange of remoteChanges) {
      // Check for conflicts with local changes
      const localChange = this.pendingChanges.find(
        change => change.id === remoteChange.id && change.hash !== remoteChange.hash
      );
      
      if (localChange) {
        // Conflict detected - resolve using timestamp
        if (remoteChange.timestamp > localChange.timestamp) {
          // Remote change wins
          this.applyRemoteChange(remoteChange);
          this.removeLocalChange(localChange);
        } else {
          // Local change wins
          conflicts.push(remoteChange);
        }
      } else {
        // No conflict - apply remote change
        this.applyRemoteChange(remoteChange);
      }
    }
    
    return conflicts;
  }
  
  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.currentSyncStatus;
  }
  
  /**
   * Get last sync time
   */
  getLastSyncTime(): number | undefined {
    return this.lastSyncTime;
  }
  
  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.pendingChanges.length;
  }
  
  /**
   * Get CRDT state for an actor
   */
  getCRDTState(actorId: string): CRDTState | undefined {
    return this.syncState.get(actorId);
  }
  
  /**
   * Set CRDT state for an actor
   */
  setCRDTState(actorId: string, state: CRDTState): void {
    this.syncState.set(actorId, state);
  }
  
  /**
   * Create Automerge document for CRDT operations
   */
  createAutomergeDoc<T>(initialData: T): Automerge.Doc<T> {
    return Automerge.from(initialData as Record<string, unknown>, this.actorId) as Automerge.Doc<T>;
  }
  
  /**
   * Merge Automerge documents
   */
  mergeAutomergeDocs<T>(doc1: Automerge.Doc<T>, doc2: Automerge.Doc<T>): Automerge.Doc<T> {
    return Automerge.merge(doc1, doc2);
  }
  
  /**
   * Get changes since a specific state
   */
  getChangesSince<T>(doc: Automerge.Doc<T>, heads: Automerge.Heads): Uint8Array[] {
    return Automerge.getChanges(doc as any, heads) as Uint8Array[];
  }
  
  /**
   * Apply changes to document
   */
  applyChanges<T>(doc: Automerge.Doc<T>, changes: Uint8Array[]): Automerge.Doc<T> {
    return (Automerge.applyChanges(doc, changes) as unknown) as Automerge.Doc<T>;
  }
  
  /**
   * Force sync with remote peers
   */
  async forcSync(): Promise<void> {
    this.currentSyncStatus = SyncStatus.SYNCING;
    
    try {
      await this.synchronize();
    } catch (error) {
      this.currentSyncStatus = SyncStatus.ERROR;
      throw error;
    }
  }
  
  /**
   * Reset sync state
   */
  async resetSyncState(): Promise<void> {
    this.pendingChanges = [];
    this.syncState.clear();
    this.clock = 0;
    this.lastSyncTime = undefined;
    this.currentSyncStatus = SyncStatus.LOCAL;
  }
  
  /**
   * Close sync system
   */
  async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    this.isInitialized = false;
    this.pendingChanges = [];
    this.syncState.clear();
  }
  
  /**
   * Generate unique actor ID
   */
  private generateActorId(): string {
    const bytes = randomBytes(16);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * Apply remote change locally
   */
  private applyRemoteChange(change: SyncChange): void {
    // In a real implementation, this would:
    // 1. Validate the change
    // 2. Apply it to the local database
    // 3. Update local indexes
    
    // For now, just update our local clock
    if (change.timestamp > this.clock) {
      this.clock = change.timestamp;
    }
  }
  
  /**
   * Remove local change from pending queue
   */
  private removeLocalChange(change: SyncChange): void {
    const index = this.pendingChanges.findIndex(
      c => c.id === change.id && c.timestamp === change.timestamp
    );
    
    if (index !== -1) {
      this.pendingChanges.splice(index, 1);
    }
  }
  
  /**
   * Ensure sync is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Sync not initialized. Call initialize() first.');
    }
  }
}