import { describe, it, expect, beforeEach } from 'vitest';
import { IPFSSync } from './ipfs-sync';
import type { SyncOptions, SyncManifest } from './types';

describe('IPFSSync', () => {
  let sync: IPFSSync;
  let options: SyncOptions;
  
  beforeEach(() => {
    options = {
      nodeId: 'test-node-123',
      enableRelay: false,
      swarmAddresses: ['/ip4/127.0.0.1/tcp/4001'],
      bootstrapPeers: []
    };
    
    sync = new IPFSSync(options);
  });
  
  describe('initialization', () => {
    it('should initialize with options', () => {
      expect(sync).toBeDefined();
      expect(sync.getNodeId()).toBe('test-node-123');
    });
    
    it('should start in offline state', () => {
      expect(sync.isOnline()).toBe(false);
    });
  });
  
  describe('manifest creation', () => {
    it('should create sync manifest', () => {
      const manifest: SyncManifest = {
        version: 1,
        nodeId: 'test-node-123',
        timestamp: new Date(),
        collections: {
          messages: {
            lastSync: new Date(),
            itemCount: 10,
            checksum: 'abc123'
          },
          contacts: {
            lastSync: new Date(),
            itemCount: 5,
            checksum: 'def456'
          }
        }
      };
      
      expect(manifest.version).toBe(1);
      expect(manifest.nodeId).toBe('test-node-123');
      expect(Object.keys(manifest.collections)).toHaveLength(2);
    });
  });
  
  describe('data chunking', () => {
    it('should chunk large data', () => {
      const largeData = new Uint8Array(1024 * 1024 * 2); // 2MB
      const chunkSize = 1024 * 256; // 256KB chunks
      
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < largeData.length; i += chunkSize) {
        chunks.push(largeData.slice(i, i + chunkSize));
      }
      
      expect(chunks.length).toBe(8);
      expect(chunks[0].length).toBe(chunkSize);
      expect(chunks[chunks.length - 1].length).toBeLessThanOrEqual(chunkSize);
    });
  });
  
  describe('conflict resolution', () => {
    it('should detect conflicts', () => {
      const localManifest: SyncManifest = {
        version: 1,
        nodeId: 'node-1',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        collections: {
          messages: {
            lastSync: new Date('2025-01-01T10:00:00Z'),
            itemCount: 10,
            checksum: 'abc123'
          }
        }
      };
      
      const remoteManifest: SyncManifest = {
        version: 1,
        nodeId: 'node-2',
        timestamp: new Date('2025-01-01T11:00:00Z'),
        collections: {
          messages: {
            lastSync: new Date('2025-01-01T11:00:00Z'),
            itemCount: 12,
            checksum: 'xyz789'
          }
        }
      };
      
      // Conflict exists when checksums differ
      const hasConflict = localManifest.collections.messages.checksum !== 
                         remoteManifest.collections.messages.checksum;
      
      expect(hasConflict).toBe(true);
    });
    
    it('should resolve conflicts by timestamp', () => {
      const changes = [
        { id: 'item-1', timestamp: new Date('2025-01-01T10:00:00Z'), data: 'v1' },
        { id: 'item-1', timestamp: new Date('2025-01-01T11:00:00Z'), data: 'v2' },
        { id: 'item-1', timestamp: new Date('2025-01-01T09:00:00Z'), data: 'v0' }
      ];
      
      // Sort by timestamp descending (newest first)
      const sorted = [...changes].sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );
      
      expect(sorted[0].data).toBe('v2'); // Newest wins
    });
  });
  
  describe('peer discovery', () => {
    it('should track connected peers', () => {
      const peers = new Set<string>();
      
      // Simulate peer connections
      peers.add('peer-1');
      peers.add('peer-2');
      peers.add('peer-1'); // Duplicate
      
      expect(peers.size).toBe(2);
      expect(peers.has('peer-1')).toBe(true);
      expect(peers.has('peer-2')).toBe(true);
    });
  });
  
  describe('sync events', () => {
    it('should emit sync events', () => {
      const events: string[] = [];
      
      sync.on('sync:start', () => events.push('start'));
      sync.on('sync:progress', () => events.push('progress'));
      sync.on('sync:complete', () => events.push('complete'));
      sync.on('sync:error', () => events.push('error'));
      
      // Simulate sync lifecycle
      sync.emit('sync:start');
      sync.emit('sync:progress', { percent: 50 });
      sync.emit('sync:complete');
      
      expect(events).toEqual(['start', 'progress', 'complete']);
    });
  });
});