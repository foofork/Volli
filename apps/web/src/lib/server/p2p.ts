// Server-side P2P coordination and signaling
// Handles server-side aspects of peer discovery and connection coordination

import { dev } from '$app/environment';

/**
 * P2P signaling server utilities
 * Manages peer discovery and connection establishment
 */
export class P2PServer {
  private peers: Map<string, PeerInfo> = new Map();
  
  /**
   * Register a peer with the signaling server
   */
  registerPeer(peerId: string, connectionInfo: PeerConnectionInfo): void {
    if (dev) {
      console.log('[P2P Server] Registering peer:', peerId);
    }
    
    this.peers.set(peerId, {
      id: peerId,
      connectionInfo,
      lastSeen: Date.now()
    });
  }
  
  /**
   * Find peers for connection establishment
   */
  findPeers(excludePeer?: string): PeerInfo[] {
    const now = Date.now();
    const activePeers = Array.from(this.peers.values())
      .filter(peer => 
        now - peer.lastSeen < 30000 && // Active in last 30 seconds
        peer.id !== excludePeer
      );
    
    return activePeers.slice(0, 10); // Return up to 10 peers
  }
  
  /**
   * Clean up inactive peers
   */
  cleanup(): void {
    const now = Date.now();
    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > 60000) { // Remove after 1 minute
        this.peers.delete(peerId);
        if (dev) {
          console.log('[P2P Server] Removed inactive peer:', peerId);
        }
      }
    }
  }
}

interface PeerInfo {
  id: string;
  connectionInfo: PeerConnectionInfo;
  lastSeen: number;
}

interface PeerConnectionInfo {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidates: RTCIceCandidateInit[];
}