import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { generateKeyPair, decapsulate } from '@volly/crypto-wasm';

/**
 * E2E Test Suite for Post-Quantum Signaling Server
 *
 * Validates:
 * - PQ-enhanced JWT token generation and validation
 * - ML-KEM-768 key exchange during WebSocket handshake
 * - Session establishment and encrypted messaging
 * - Multi-client coordination
 */

describe('Volly Signaling Server - Post-Quantum Integration', () => {
  const SIGNALING_URL = 'ws://localhost:7880';
  const API_KEY = 'volly-test-key';
  const API_SECRET = 'volly-test-secret';

  // Start signaling server before tests
  beforeAll(async () => {
    spawn('docker-compose', ['-f', 'docker-compose.signaling.yml', 'up', '-d']);

    // Wait for server to be ready
    await waitForServer(SIGNALING_URL.replace('ws://', 'http://') + '/healthz');
  });

  // Stop signaling server after tests
  afterAll(async () => {
    spawn('docker-compose', ['-f', 'docker-compose.signaling.yml', 'down']);
  });

  test('PQ-enhanced JWT token generation', async () => {
    // Generate ML-KEM-768 keypair
    const { publicKey } = await generateKeyPair('ML-KEM-768');

    // Create enhanced JWT with PQ public key
    const token = jwt.sign(
      {
        iss: API_KEY,
        sub: 'test-user-1',
        video: {
          roomJoin: true,
          room: 'test-room-1',
        },
        pqPublicKey: publicKey.toString('base64'),
        pqAlgorithm: 'ML-KEM-768',
        pqKeyExpiry: Date.now() + 3600000, // 1 hour
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      API_SECRET
    );

    // Verify token structure
    const decoded = jwt.verify(token, API_SECRET) as Record<string, unknown>;
    expect(decoded.pqPublicKey).toBeTruthy();
    expect(decoded.pqAlgorithm).toBe('ML-KEM-768');
    expect(decoded.pqKeyExpiry).toBeGreaterThan(Date.now());
  });

  test('WebSocket connection with PQ handshake', async () => {
    // Generate client keypair
    const { publicKey, secretKey } = await generateKeyPair('ML-KEM-768');

    // Create token
    const token = createPQToken('test-user-2', 'test-room-2', publicKey);

    // Connect to signaling server
    const ws = new WebSocket(`${SIGNALING_URL}?access_token=${token}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        // Send PQ handshake request
        ws.send(
          JSON.stringify({
            type: 'pq_handshake',
            algorithm: 'ML-KEM-768',
            client_public_key: publicKey.toString('base64'),
            session_id: 'test-session-1',
            timestamp: Date.now(),
          })
        );
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'pq_handshake_response') {
          // Verify handshake response
          expect(message.algorithm).toBe('ML-KEM-768');
          expect(message.kem_ciphertext).toBeTruthy();
          expect(message.session_id).toBe('test-session-1');

          // Decapsulate to get shared secret
          const sharedSecret = decapsulate(
            Buffer.from(message.kem_ciphertext, 'base64'),
            secretKey
          );

          expect(sharedSecret).toHaveLength(32); // 256-bit shared secret

          ws.close();
          resolve();
        }
      });

      ws.on('error', reject);
    });
  });

  test('Multi-client PQ session establishment', async () => {
    const room = 'test-room-multi';
    const clients: WebSocket[] = [];
    const sharedSecrets: Map<string, Buffer> = new Map();

    // Create 3 clients
    for (let i = 1; i <= 3; i++) {
      const { publicKey, secretKey } = await generateKeyPair('ML-KEM-768');
      const token = createPQToken(`user-${i}`, room, publicKey);
      const ws = new WebSocket(`${SIGNALING_URL}?access_token=${token}`);

      clients.push(ws);

      // Handle PQ handshake for each client
      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              type: 'pq_handshake',
              algorithm: 'ML-KEM-768',
              client_public_key: publicKey.toString('base64'),
              session_id: `session-${i}`,
              timestamp: Date.now(),
            })
          );
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'pq_handshake_response') {
            const sharedSecret = decapsulate(
              Buffer.from(message.kem_ciphertext, 'base64'),
              secretKey
            );
            sharedSecrets.set(`user-${i}`, sharedSecret);
            resolve();
          }
        });
      });
    }

    // Verify all clients have established PQ sessions
    expect(sharedSecrets.size).toBe(3);

    // Test encrypted message relay
    const testMessage = { type: 'chat', content: 'Hello from user-1' };

    // User 1 sends encrypted message
    clients[0].send(
      JSON.stringify({
        type: 'pq_encrypted_message',
        payload: encrypt(JSON.stringify(testMessage), sharedSecrets.get('user-1')!),
      })
    );

    // Verify other clients receive the message
    await Promise.all([
      expectMessage(clients[1], 'pq_encrypted_message'),
      expectMessage(clients[2], 'pq_encrypted_message'),
    ]);

    // Cleanup
    clients.forEach((ws) => ws.close());
  });

  test('Session expiry and renewal', async () => {
    const { publicKey, secretKey } = await generateKeyPair('ML-KEM-768');

    // Create token with short expiry
    const token = jwt.sign(
      {
        iss: API_KEY,
        sub: 'test-user-expiry',
        video: { roomJoin: true, room: 'test-room-expiry' },
        pqPublicKey: publicKey.toString('base64'),
        pqAlgorithm: 'ML-KEM-768',
        pqKeyExpiry: Date.now() + 5000, // 5 seconds
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      API_SECRET
    );

    const ws = new WebSocket(`${SIGNALING_URL}?access_token=${token}`);

    // Establish initial session
    await establishPQSession(ws, publicKey, secretKey);

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 6000));

    // Attempt to use expired session
    ws.send(
      JSON.stringify({
        type: 'pq_encrypted_message',
        payload: 'test-message',
      })
    );

    // Should receive session expired status
    const response = await expectMessage(ws, 'pq_session_status');
    expect(response.state).toBe('EXPIRED');

    ws.close();
  });

  test('Performance: Concurrent PQ handshakes', async () => {
    const startTime = Date.now();
    const concurrentClients = 50;
    const handshakePromises: Promise<void>[] = [];

    for (let i = 0; i < concurrentClients; i++) {
      handshakePromises.push(
        (async () => {
          const { publicKey, secretKey } = await generateKeyPair('ML-KEM-768');
          const token = createPQToken(`perf-user-${i}`, 'perf-room', publicKey);
          const ws = new WebSocket(`${SIGNALING_URL}?access_token=${token}`);

          await establishPQSession(ws, publicKey, secretKey);
          ws.close();
        })()
      );
    }

    await Promise.all(handshakePromises);
    const duration = Date.now() - startTime;

    // Performance threshold: avg < 100ms per handshake
    expect(duration / concurrentClients).toBeLessThan(100);
  });
});

// Helper functions

async function waitForServer(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Server failed to start');
}

function createPQToken(identity: string, room: string, publicKey: Buffer): string {
  return jwt.sign(
    {
      iss: API_KEY,
      sub: identity,
      video: { roomJoin: true, room },
      pqPublicKey: publicKey.toString('base64'),
      pqAlgorithm: 'ML-KEM-768',
      pqKeyExpiry: Date.now() + 3600000,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    API_SECRET
  );
}

async function establishPQSession(
  ws: WebSocket,
  publicKey: Buffer,
  secretKey: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          type: 'pq_handshake',
          algorithm: 'ML-KEM-768',
          client_public_key: publicKey.toString('base64'),
          session_id: `session-${Date.now()}`,
          timestamp: Date.now(),
        })
      );
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'pq_handshake_response') {
        const sharedSecret = decapsulate(Buffer.from(message.kem_ciphertext, 'base64'), secretKey);
        resolve(sharedSecret);
      }
    });

    ws.on('error', reject);
  });
}

async function expectMessage(
  ws: WebSocket,
  expectedType: string
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const handler = (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === expectedType) {
        ws.off('message', handler);
        resolve(message);
      }
    };
    ws.on('message', handler);
  });
}

// Placeholder for actual encryption (would use XChaCha20-Poly1305)
function encrypt(data: string, _key: Buffer): string {
  // In real implementation, use key to encrypt data
  return Buffer.from(data).toString('base64');
}
