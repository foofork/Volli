import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { SignalingServer } from '../SignalingServer.js';
import type { SignalingMessage, RegisterMessage, DiscoverMessage, OfferMessage, AnswerMessage, IceCandidateMessage } from '../types/index.js';

describe('SignalingServer', () => {
  let server: SignalingServer;
  let client1: WebSocket;
  let client2: WebSocket;
  const PORT = 8081;

  beforeEach(async () => {
    server = new SignalingServer({ port: PORT });
    await server.start();
  });

  afterEach(async () => {
    if (client1?.readyState === WebSocket.OPEN) client1.close();
    if (client2?.readyState === WebSocket.OPEN) client2.close();
    await server.stop();
  });

  const connectClient = (): Promise<WebSocket> => {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`);
      ws.on('open', () => resolve(ws));
    });
  };

  const waitForMessage = (ws: WebSocket): Promise<any> => {
    return new Promise((resolve) => {
      ws.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
  };

  describe('Registration', () => {
    it('should register a user with public key', async () => {
      client1 = await connectClient();
      
      const registerMsg: RegisterMessage = {
        type: 'register',
        userId: 'alice@volli.app',
        publicKey: 'alice-public-key-base64'
      };

      client1.send(JSON.stringify(registerMsg));
      
      const response = await waitForMessage(client1);
      expect(response).toEqual({
        type: 'registered',
        success: true,
        userId: 'alice@volli.app'
      });
    });

    it('should update registration for existing user', async () => {
      client1 = await connectClient();
      
      // First registration
      const registerMsg: RegisterMessage = {
        type: 'register',
        userId: 'alice@volli.app',
        publicKey: 'alice-public-key-v1'
      };
      client1.send(JSON.stringify(registerMsg));
      await waitForMessage(client1);

      // Update registration
      const updateMsg: RegisterMessage = {
        type: 'register',
        userId: 'alice@volli.app',
        publicKey: 'alice-public-key-v2'
      };
      client1.send(JSON.stringify(updateMsg));
      
      const response = await waitForMessage(client1);
      expect(response.success).toBe(true);
    });
  });

  describe('User Discovery', () => {
    it('should find online user', async () => {
      // Alice registers
      client1 = await connectClient();
      const aliceRegister: RegisterMessage = {
        type: 'register',
        userId: 'alice@volli.app',
        publicKey: 'alice-public-key'
      };
      client1.send(JSON.stringify(aliceRegister));
      await waitForMessage(client1);

      // Bob looks for Alice
      client2 = await connectClient();
      const discoverMsg: DiscoverMessage = {
        type: 'discover',
        userId: 'alice@volli.app'
      };
      client2.send(JSON.stringify(discoverMsg));

      const response = await waitForMessage(client2);
      expect(response).toEqual({
        type: 'discover-response',
        userId: 'alice@volli.app',
        online: true,
        publicKey: 'alice-public-key'
      });
    });

    it('should report offline for non-existent user', async () => {
      client1 = await connectClient();
      
      const discoverMsg: DiscoverMessage = {
        type: 'discover',
        userId: 'ghost@volli.app'
      };
      client1.send(JSON.stringify(discoverMsg));

      const response = await waitForMessage(client1);
      expect(response).toEqual({
        type: 'discover-response',
        userId: 'ghost@volli.app',
        online: false
      });
    });

    it('should report offline when user disconnects', async () => {
      // Alice connects and registers
      client1 = await connectClient();
      const aliceRegister: RegisterMessage = {
        type: 'register',
        userId: 'alice@volli.app',
        publicKey: 'alice-public-key'
      };
      client1.send(JSON.stringify(aliceRegister));
      await waitForMessage(client1);

      // Alice disconnects
      client1.close();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Bob looks for Alice
      client2 = await connectClient();
      const discoverMsg: DiscoverMessage = {
        type: 'discover',
        userId: 'alice@volli.app'
      };
      client2.send(JSON.stringify(discoverMsg));

      const response = await waitForMessage(client2);
      expect(response.online).toBe(false);
    });
  });

  describe('Offer/Answer Relay', () => {
    beforeEach(async () => {
      // Setup: Alice and Bob both register
      client1 = await connectClient();
      client2 = await connectClient();

      const aliceRegister: RegisterMessage = {
        type: 'register',
        userId: 'alice@volli.app',
        publicKey: 'alice-public-key'
      };
      client1.send(JSON.stringify(aliceRegister));
      await waitForMessage(client1);

      const bobRegister: RegisterMessage = {
        type: 'register',
        userId: 'bob@volli.app',
        publicKey: 'bob-public-key'
      };
      client2.send(JSON.stringify(bobRegister));
      await waitForMessage(client2);
    });

    it('should relay offer from Alice to Bob', async () => {
      const offerMsg: OfferMessage = {
        type: 'offer',
        from: 'alice@volli.app',
        to: 'bob@volli.app',
        offer: {
          type: 'offer',
          sdp: 'mock-sdp-content'
        }
      };

      // Alice sends offer
      client1.send(JSON.stringify(offerMsg));

      // Bob receives offer
      const received = await waitForMessage(client2);
      expect(received).toEqual({
        type: 'offer',
        from: 'alice@volli.app',
        to: 'bob@volli.app',
        offer: {
          type: 'offer',
          sdp: 'mock-sdp-content'
        }
      });
    });

    it('should relay answer from Bob to Alice', async () => {
      const answerMsg: AnswerMessage = {
        type: 'answer',
        from: 'bob@volli.app',
        to: 'alice@volli.app',
        answer: {
          type: 'answer',
          sdp: 'mock-answer-sdp'
        }
      };

      // Bob sends answer
      client2.send(JSON.stringify(answerMsg));

      // Alice receives answer
      const received = await waitForMessage(client1);
      expect(received).toEqual({
        type: 'answer',
        from: 'bob@volli.app',
        to: 'alice@volli.app',
        answer: {
          type: 'answer',
          sdp: 'mock-answer-sdp'
        }
      });
    });

    it('should relay ICE candidate from Alice to Bob', async () => {
      const candidateMsg: IceCandidateMessage = {
        type: 'ice-candidate',
        from: 'alice@volli.app',
        to: 'bob@volli.app',
        candidate: {
          candidate: 'candidate:1 1 UDP 2113667326 192.168.1.100 54400 typ host',
          sdpMLineIndex: 0,
          sdpMid: 'data'
        }
      };

      // Alice sends ICE candidate
      client1.send(JSON.stringify(candidateMsg));

      // Bob receives ICE candidate
      const received = await waitForMessage(client2);
      expect(received).toEqual({
        type: 'ice-candidate',
        from: 'alice@volli.app',
        to: 'bob@volli.app',
        candidate: {
          candidate: 'candidate:1 1 UDP 2113667326 192.168.1.100 54400 typ host',
          sdpMLineIndex: 0,
          sdpMid: 'data'
        }
      });
    });

    it('should relay ICE candidate from Bob to Alice', async () => {
      const candidateMsg: IceCandidateMessage = {
        type: 'ice-candidate',
        from: 'bob@volli.app',
        to: 'alice@volli.app',
        candidate: {
          candidate: 'candidate:2 1 TCP 2105458942 192.168.1.101 9 typ host tcptype active',
          sdpMLineIndex: 0,
          sdpMid: 'data'
        }
      };

      // Bob sends ICE candidate
      client2.send(JSON.stringify(candidateMsg));

      // Alice receives ICE candidate
      const received = await waitForMessage(client1);
      expect(received).toEqual({
        type: 'ice-candidate',
        from: 'bob@volli.app',
        to: 'alice@volli.app',
        candidate: {
          candidate: 'candidate:2 1 TCP 2105458942 192.168.1.101 9 typ host tcptype active',
          sdpMLineIndex: 0,
          sdpMid: 'data'
        }
      });
    });

    it('should handle ICE candidate relay to offline user', async () => {
      const candidateMsg: IceCandidateMessage = {
        type: 'ice-candidate',
        from: 'alice@volli.app',
        to: 'charlie@volli.app', // Not online
        candidate: {
          candidate: 'candidate:1 1 UDP 2113667326 192.168.1.100 54400 typ host',
          sdpMLineIndex: 0,
          sdpMid: 'data'
        }
      };

      client1.send(JSON.stringify(candidateMsg));

      const response = await waitForMessage(client1);
      expect(response).toEqual({
        type: 'error',
        message: 'User charlie@volli.app is not online'
      });
    });

    it('should handle relay to offline user', async () => {
      const offerMsg: OfferMessage = {
        type: 'offer',
        from: 'alice@volli.app',
        to: 'charlie@volli.app', // Not online
        offer: {
          type: 'offer',
          sdp: 'mock-sdp'
        }
      };

      client1.send(JSON.stringify(offerMsg));

      const response = await waitForMessage(client1);
      expect(response).toEqual({
        type: 'error',
        message: 'User charlie@volli.app is not online'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON', async () => {
      client1 = await connectClient();
      client1.send('invalid json');

      const response = await waitForMessage(client1);
      expect(response.type).toBe('error');
      expect(response.message).toContain('Invalid message format');
    });

    it('should handle unknown message type', async () => {
      client1 = await connectClient();
      client1.send(JSON.stringify({ type: 'unknown' }));

      const response = await waitForMessage(client1);
      expect(response.type).toBe('error');
      expect(response.message).toContain('Unknown message type');
    });

    it('should handle missing required fields', async () => {
      client1 = await connectClient();
      client1.send(JSON.stringify({ type: 'register' })); // Missing userId and publicKey

      const response = await waitForMessage(client1);
      expect(response.type).toBe('error');
      expect(response.message).toContain('Missing required fields');
    });
  });

  describe('Connection Management', () => {
    it('should handle multiple simultaneous connections', async () => {
      const clients = await Promise.all(
        Array(5).fill(0).map(() => connectClient())
      );

      // All register
      await Promise.all(
        clients.map((client, i) => {
          const msg: RegisterMessage = {
            type: 'register',
            userId: `user${i}@volli.app`,
            publicKey: `key-${i}`
          };
          client.send(JSON.stringify(msg));
          return waitForMessage(client);
        })
      );

      expect(server.getOnlineUsers()).toBe(5);

      // Cleanup
      clients.forEach(c => c.close());
    });

    it('should clean up on disconnect', async () => {
      client1 = await connectClient();
      
      const registerMsg: RegisterMessage = {
        type: 'register',
        userId: 'alice@volli.app',
        publicKey: 'alice-key'
      };
      client1.send(JSON.stringify(registerMsg));
      await waitForMessage(client1);

      expect(server.getOnlineUsers()).toBe(1);

      client1.close();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(server.getOnlineUsers()).toBe(0);
    });
  });
});