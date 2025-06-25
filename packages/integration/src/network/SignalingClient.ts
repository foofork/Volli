import { EventEmitter } from 'events';
import type {
  SignalingMessage,
  RegisterMessage,
  DiscoverMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  RegisteredMessage,
  DiscoverResponseMessage,
  ErrorMessage
} from '@volli/signaling-server';

export interface SignalingClientOptions {
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface DiscoveryResult {
  online: boolean;
  publicKey?: string;
}

export interface OfferEvent {
  from: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerEvent {
  from: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidateEvent {
  from: string;
  candidate: RTCIceCandidateInit;
}

export class SignalingClient extends EventEmitter {
  private ws?: WebSocket;
  private url: string;
  private options: SignalingClientOptions;
  private connected: boolean = false;
  private userId?: string;
  private reconnectAttempts: number = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  
  constructor(url: string, options: SignalingClientOptions = {}) {
    super();
    this.url = url;
    this.options = {
      reconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      ...options
    };
  }
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.ws.onerror = (error) => {
          this.connected = false;
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            reject(new Error('Failed to connect to signaling server'));
          }
          this.emit('error', new Error('WebSocket error'));
        };
        
        this.ws.onclose = () => {
          this.connected = false;
          this.emit('disconnected');
          
          if (this.options.reconnect && this.reconnectAttempts < this.options.maxReconnectAttempts!) {
            this.scheduleReconnect();
          }
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    this.options.reconnect = false; // Prevent auto-reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    
    this.connected = false;
    this.pendingRequests.clear();
  }
  
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
  
  async register(userId: string, publicKey: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to signaling server');
    }
    
    this.userId = userId;
    
    const message: RegisterMessage = {
      type: 'register',
      userId,
      publicKey
    };
    
    return new Promise((resolve, reject) => {
      // Store pending request using userId as key
      this.pendingRequests.set(`register-${userId}`, { resolve, reject });
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(`register-${userId}`)) {
          this.pendingRequests.delete(`register-${userId}`);
          reject(new Error('Registration timeout'));
        }
      }, 5000);
      
      this.send(message);
    });
  }
  
  async discoverUser(userId: string): Promise<DiscoveryResult> {
    if (!this.isConnected()) {
      throw new Error('Not connected to signaling server');
    }
    
    const message: DiscoverMessage = {
      type: 'discover',
      userId
    };
    
    return new Promise((resolve, reject) => {
      // Store pending request using userId as key
      this.pendingRequests.set(`discover-${userId}`, { resolve, reject });
      
      setTimeout(() => {
        if (this.pendingRequests.has(`discover-${userId}`)) {
          this.pendingRequests.delete(`discover-${userId}`);
          reject(new Error('Discovery timeout'));
        }
      }, 5000);
      
      this.send(message);
    });
  }
  
  async sendOffer(to: string, offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.isConnected() || !this.userId) {
      throw new Error('Not connected or not registered');
    }
    
    const message: OfferMessage = {
      type: 'offer',
      from: this.userId,
      to,
      offer
    };
    
    this.send(message);
  }
  
  async sendAnswer(to: string, answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.isConnected() || !this.userId) {
      throw new Error('Not connected or not registered');
    }
    
    const message: AnswerMessage = {
      type: 'answer',
      from: this.userId,
      to,
      answer
    };
    
    this.send(message);
  }
  
  async sendIceCandidate(to: string, candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.isConnected() || !this.userId) {
      throw new Error('Not connected or not registered');
    }
    
    const message: IceCandidateMessage = {
      type: 'ice-candidate',
      from: this.userId,
      to,
      candidate
    };
    
    this.send(message);
  }
  
  private send(message: SignalingMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not ready');
    }
    
    this.ws.send(JSON.stringify(message));
  }
  
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as SignalingMessage;
      
      switch (message.type) {
        case 'registered':
          this.handleRegistered(message as RegisteredMessage);
          break;
          
        case 'discover-response':
          this.handleDiscoverResponse(message as DiscoverResponseMessage);
          break;
          
        case 'offer':
          this.handleOffer(message as OfferMessage);
          break;
          
        case 'answer':
          this.handleAnswer(message as AnswerMessage);
          break;
          
        case 'ice-candidate':
          this.handleIceCandidate(message as IceCandidateMessage);
          break;
          
        case 'error':
          this.handleError(message as ErrorMessage);
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      this.emit('error', new Error('Failed to parse message'));
    }
  }
  
  private handleRegistered(message: RegisteredMessage): void {
    const requestKey = `register-${message.userId}`;
    if (this.pendingRequests.has(requestKey)) {
      const { resolve, reject } = this.pendingRequests.get(requestKey)!;
      this.pendingRequests.delete(requestKey);
      
      if (message.success) {
        resolve();
      } else {
        reject(new Error('Registration failed'));
      }
    }
  }
  
  private handleDiscoverResponse(message: DiscoverResponseMessage): void {
    const requestKey = `discover-${message.userId}`;
    if (this.pendingRequests.has(requestKey)) {
      const { resolve } = this.pendingRequests.get(requestKey)!;
      this.pendingRequests.delete(requestKey);
      
      const result: DiscoveryResult = {
        online: message.online,
        publicKey: message.publicKey
      };
      
      resolve(result);
    }
  }
  
  private handleOffer(message: OfferMessage): void {
    const event: OfferEvent = {
      from: message.from,
      offer: message.offer
    };
    this.emit('offer', event);
  }
  
  private handleAnswer(message: AnswerMessage): void {
    const event: AnswerEvent = {
      from: message.from,
      answer: message.answer
    };
    this.emit('answer', event);
  }
  
  private handleIceCandidate(message: IceCandidateMessage): void {
    const event: IceCandidateEvent = {
      from: message.from,
      candidate: message.candidate
    };
    this.emit('ice-candidate', event);
  }
  
  private handleError(message: ErrorMessage): void {
    this.emit('error', new Error(message.message));
  }
  
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.options.reconnectDelay! * this.reconnectAttempts);
  }
}