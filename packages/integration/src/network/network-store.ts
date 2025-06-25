import { writable, get } from 'svelte/store';
import type { Message } from '../types';

export interface NetworkState {
  isOnline: boolean;
  peers: Map<string, RTCPeerConnection>;
  dataChannels: Map<string, RTCDataChannel>;
  signalingStatus: 'disconnected' | 'connecting' | 'connected';
}

export interface SyncEndpoint {
  getMessages: (since?: number) => Promise<Message[]>;
  sendMessage: (message: Message) => Promise<boolean>;
}

class NetworkStore {
  private store = writable<NetworkState>({
    isOnline: false,
    peers: new Map(),
    dataChannels: new Map(),
    signalingStatus: 'disconnected'
  });

  private messageHandlers: Set<(message: Message) => void> = new Set();
  private pendingMessages: Map<string, Message[]> = new Map();

  constructor() {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.updateOnlineStatus(true));
      window.addEventListener('offline', () => this.updateOnlineStatus(false));
      this.updateOnlineStatus(navigator.onLine);
    }
  }

  subscribe = this.store.subscribe;

  private updateOnlineStatus(isOnline: boolean) {
    this.store.update(state => ({ ...state, isOnline }));
  }

  get isOnline(): boolean {
    return get(this.store).isOnline;
  }

  async getSyncEndpoint(): Promise<SyncEndpoint> {
    // Return endpoint that can send/receive messages
    return {
      getMessages: async (since?: number) => {
        // In a real implementation, this would fetch from peers
        // For now, return pending messages
        const messages: Message[] = [];
        for (const [_, msgs] of this.pendingMessages) {
          messages.push(...msgs.filter(m => !since || m.timestamp > since));
        }
        return messages;
      },
      
      sendMessage: async (message: Message) => {
        try {
          // Try to send via data channel if peer is connected
          const channel = this.getDataChannel(message.conversationId);
          if (channel && channel.readyState === 'open') {
            channel.send(JSON.stringify({
              type: 'message',
              data: message
            }));
            return true;
          }
          
          // Otherwise queue for later delivery
          this.queueMessage(message.conversationId, message);
          return false;
        } catch (error) {
          console.error('Failed to send message:', error);
          this.queueMessage(message.conversationId, message);
          return false;
        }
      }
    };
  }

  private queueMessage(peerId: string, message: Message) {
    const queue = this.pendingMessages.get(peerId) || [];
    queue.push(message);
    this.pendingMessages.set(peerId, queue);
  }

  private getDataChannel(peerId: string): RTCDataChannel | undefined {
    return get(this.store).dataChannels.get(peerId);
  }

  async connectToPeer(peerId: string, offer?: RTCSessionDescriptionInit): Promise<void> {
    const state = get(this.store);
    
    // Create peer connection if it doesn't exist
    let peerConnection = state.peers.get(peerId);
    if (!peerConnection) {
      peerConnection = this.createPeerConnection(peerId);
      state.peers.set(peerId, peerConnection);
    }

    if (offer) {
      // Answer an incoming offer
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      // In real implementation, send answer back via signaling
    } else {
      // Create an offer
      const dataChannel = peerConnection.createDataChannel('messages');
      this.setupDataChannel(peerId, dataChannel);
      
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      // In real implementation, send offer via signaling
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // In real implementation, send candidate via signaling
        console.log('New ICE candidate:', event.candidate);
      }
    };

    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.deliverQueuedMessages(peerId);
      }
    };

    return pc;
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    const state = get(this.store);
    state.dataChannels.set(peerId, channel);

    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
      this.deliverQueuedMessages(peerId);
    };

    channel.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'message') {
          // Notify all message handlers
          this.messageHandlers.forEach(handler => handler(payload.data));
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      state.dataChannels.delete(peerId);
    };
  }

  private async deliverQueuedMessages(peerId: string) {
    const queued = this.pendingMessages.get(peerId);
    if (!queued || queued.length === 0) return;

    const channel = this.getDataChannel(peerId);
    if (!channel || channel.readyState !== 'open') return;

    // Send all queued messages
    for (const message of queued) {
      try {
        channel.send(JSON.stringify({
          type: 'message',
          data: message
        }));
      } catch (error) {
        console.error('Failed to deliver queued message:', error);
        break;
      }
    }

    // Clear the queue
    this.pendingMessages.delete(peerId);
  }

  onMessage(handler: (message: Message) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  async disconnect() {
    const state = get(this.store);
    
    // Close all data channels
    for (const [_, channel] of state.dataChannels) {
      channel.close();
    }
    state.dataChannels.clear();

    // Close all peer connections
    for (const [_, peer] of state.peers) {
      peer.close();
    }
    state.peers.clear();

    this.store.set({
      isOnline: navigator.onLine,
      peers: new Map(),
      dataChannels: new Map(),
      signalingStatus: 'disconnected'
    });
  }
}

export const networkStore = new NetworkStore();