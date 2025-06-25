import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignalingClient } from '../SignalingClient';
import type { 
  RegisteredMessage, 
  DiscoverResponseMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  ErrorMessage 
} from '@volli/signaling-server';

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen?: (event: Event) => void;
  onmessage?: (event: MessageEvent) => void;
  onclose?: (event: CloseEvent) => void;
  onerror?: (event: Event) => void;
  
  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }
  
  send(data: string) {
    // Mock implementation
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket as any;

describe('SignalingClient', () => {
  let client: SignalingClient;
  let mockWebSocket: MockWebSocket;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Capture WebSocket instance on creation
    const OriginalWebSocket = global.WebSocket;
    global.WebSocket = vi.fn().mockImplementation((url: string) => {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket;
    }) as any;
  });
  
  afterEach(() => {
    client?.disconnect();
  });
  
  describe('Connection', () => {
    it('should connect to signaling server', async () => {
      client = new SignalingClient('ws://localhost:8080');
      
      await client.connect();
      
      expect(mockWebSocket.url).toBe('ws://localhost:8080');
      expect(client.isConnected()).toBe(true);
    });
    
    it('should handle connection errors', async () => {
      client = new SignalingClient('ws://localhost:8080');
      
      // Prevent error event from being unhandled
      client.on('error', () => {});
      
      const connectPromise = client.connect();
      
      // Simulate connection error
      mockWebSocket.readyState = WebSocket.CLOSED;
      mockWebSocket.onerror?.(new Event('error'));
      
      await expect(connectPromise).rejects.toThrow('Failed to connect');
    });
    
    it('should reconnect on disconnect', async () => {
      const reconnectSpy = vi.fn();
      client = new SignalingClient('ws://localhost:8080', {
        reconnect: true,
        reconnectDelay: 10
      });
      
      client.on('reconnecting', reconnectSpy);
      await client.connect();
      
      // Simulate disconnect
      mockWebSocket.close();
      
      // Wait for reconnect attempt
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(reconnectSpy).toHaveBeenCalled();
    });
  });
  
  describe('Registration', () => {
    beforeEach(async () => {
      client = new SignalingClient('ws://localhost:8080');
      await client.connect();
    });
    
    it('should register user with server', async () => {
      const sendSpy = vi.spyOn(mockWebSocket, 'send');
      
      const registerPromise = client.register('alice@volli.app', 'alice-public-key');
      
      // Simulate server response
      const response: RegisteredMessage = {
        type: 'registered',
        success: true,
        userId: 'alice@volli.app'
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(response)
      }));
      
      await registerPromise;
      
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'register',
        userId: 'alice@volli.app',
        publicKey: 'alice-public-key'
      }));
    });
    
    it('should handle registration failure', async () => {
      // Handle the error event that will be emitted
      client.on('error', () => {});
      
      const registerPromise = client.register('alice@volli.app', 'alice-public-key');
      
      // Simulate registration failure response
      const response: RegisteredMessage = {
        type: 'registered',
        success: false,
        userId: 'alice@volli.app'
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(response)
      }));
      
      await expect(registerPromise).rejects.toThrow('Registration failed');
    });
  });
  
  describe('User Discovery', () => {
    beforeEach(async () => {
      client = new SignalingClient('ws://localhost:8080');
      await client.connect();
      
      // Register and simulate server response
      const registerPromise = client.register('alice@volli.app', 'alice-public-key');
      
      // Simulate successful registration
      setTimeout(() => {
        const response: RegisteredMessage = {
          type: 'registered',
          success: true,
          userId: 'alice@volli.app'
        };
        mockWebSocket.onmessage?.(new MessageEvent('message', {
          data: JSON.stringify(response)
        }));
      }, 0);
      
      await registerPromise;
    });
    
    it('should discover online user', async () => {
      const discoverPromise = client.discoverUser('bob@volli.app');
      
      // Simulate server response
      const response: DiscoverResponseMessage = {
        type: 'discover-response',
        userId: 'bob@volli.app',
        online: true,
        publicKey: 'bob-public-key'
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(response)
      }));
      
      const result = await discoverPromise;
      
      expect(result).toEqual({
        online: true,
        publicKey: 'bob-public-key'
      });
    });
    
    it('should handle offline user', async () => {
      const discoverPromise = client.discoverUser('charlie@volli.app');
      
      // Simulate server response
      const response: DiscoverResponseMessage = {
        type: 'discover-response',
        userId: 'charlie@volli.app',
        online: false
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(response)
      }));
      
      const result = await discoverPromise;
      
      expect(result).toEqual({
        online: false
      });
    });
  });
  
  describe('Offer/Answer Exchange', () => {
    beforeEach(async () => {
      client = new SignalingClient('ws://localhost:8080');
      await client.connect();
      
      // Register and simulate server response
      const registerPromise = client.register('alice@volli.app', 'alice-public-key');
      
      // Simulate successful registration
      setTimeout(() => {
        const response: RegisteredMessage = {
          type: 'registered',
          success: true,
          userId: 'alice@volli.app'
        };
        mockWebSocket.onmessage?.(new MessageEvent('message', {
          data: JSON.stringify(response)
        }));
      }, 0);
      
      await registerPromise;
    });
    
    it('should send offer to peer', async () => {
      const sendSpy = vi.spyOn(mockWebSocket, 'send');
      
      const offer: RTCSessionDescriptionInit = {
        type: 'offer',
        sdp: 'mock-offer-sdp'
      };
      
      await client.sendOffer('bob@volli.app', offer);
      
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'offer',
        from: 'alice@volli.app',
        to: 'bob@volli.app',
        offer
      }));
    });
    
    it('should receive offer from peer', async () => {
      const offerHandler = vi.fn();
      client.on('offer', offerHandler);
      
      // Simulate incoming offer
      const offerMessage: OfferMessage = {
        type: 'offer',
        from: 'bob@volli.app',
        to: 'alice@volli.app',
        offer: {
          type: 'offer',
          sdp: 'mock-offer-sdp'
        }
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(offerMessage)
      }));
      
      expect(offerHandler).toHaveBeenCalledWith({
        from: 'bob@volli.app',
        offer: offerMessage.offer
      });
    });
    
    it('should send answer to peer', async () => {
      const sendSpy = vi.spyOn(mockWebSocket, 'send');
      
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: 'mock-answer-sdp'
      };
      
      await client.sendAnswer('bob@volli.app', answer);
      
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'answer',
        from: 'alice@volli.app',
        to: 'bob@volli.app',
        answer
      }));
    });
    
    it('should receive answer from peer', async () => {
      const answerHandler = vi.fn();
      client.on('answer', answerHandler);
      
      // Simulate incoming answer
      const answerMessage: AnswerMessage = {
        type: 'answer',
        from: 'bob@volli.app',
        to: 'alice@volli.app',
        answer: {
          type: 'answer',
          sdp: 'mock-answer-sdp'
        }
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(answerMessage)
      }));
      
      expect(answerHandler).toHaveBeenCalledWith({
        from: 'bob@volli.app',
        answer: answerMessage.answer
      });
    });
    
    it('should send ICE candidate to peer', async () => {
      const sendSpy = vi.spyOn(mockWebSocket, 'send');
      
      const candidate: RTCIceCandidateInit = {
        candidate: 'candidate:1 1 UDP 2113667326 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: 'data'
      };
      
      await client.sendIceCandidate('bob@volli.app', candidate);
      
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'ice-candidate',
        from: 'alice@volli.app',
        to: 'bob@volli.app',
        candidate
      }));
    });
    
    it('should receive ICE candidate from peer', async () => {
      const candidateHandler = vi.fn();
      client.on('ice-candidate', candidateHandler);
      
      // Simulate incoming ICE candidate
      const candidateMessage: IceCandidateMessage = {
        type: 'ice-candidate',
        from: 'bob@volli.app',
        to: 'alice@volli.app',
        candidate: {
          candidate: 'candidate:2 1 TCP 2105458942 192.168.1.101 9 typ host tcptype active',
          sdpMLineIndex: 0,
          sdpMid: 'data'
        }
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(candidateMessage)
      }));
      
      expect(candidateHandler).toHaveBeenCalledWith({
        from: 'bob@volli.app',
        candidate: candidateMessage.candidate
      });
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(async () => {
      client = new SignalingClient('ws://localhost:8080');
      await client.connect();
    });
    
    it('should emit error events', async () => {
      const errorHandler = vi.fn();
      client.on('error', errorHandler);
      
      // Simulate error message
      const errorMessage: ErrorMessage = {
        type: 'error',
        message: 'Something went wrong'
      };
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(errorMessage)
      }));
      
      expect(errorHandler).toHaveBeenCalledWith(new Error('Something went wrong'));
    });
    
    it('should handle malformed messages', async () => {
      const errorHandler = vi.fn();
      client.on('error', errorHandler);
      
      // Send malformed JSON
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: 'invalid json'
      }));
      
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });
  
  describe('Cleanup', () => {
    it('should clean up on disconnect', async () => {
      client = new SignalingClient('ws://localhost:8080');
      await client.connect();
      
      const closeSpy = vi.spyOn(mockWebSocket, 'close');
      
      client.disconnect();
      
      expect(closeSpy).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);
    });
    
    it('should remove all event listeners', async () => {
      client = new SignalingClient('ws://localhost:8080');
      await client.connect();
      
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      client.on('offer', handler1);
      client.on('answer', handler2);
      
      client.removeAllListeners();
      
      // Simulate messages - handlers should not be called
      mockWebSocket.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ type: 'offer', from: 'bob', to: 'alice', offer: {} })
      }));
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});