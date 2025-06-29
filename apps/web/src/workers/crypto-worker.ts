// Crypto Web Worker
// Performs heavy cryptographic operations off the main thread

import { HybridKEM } from '../lib/crypto/hybrid-kem.js';
import { createPQKEM, createPQDSA, PQAlgorithm } from '../lib/crypto/pq-crypto.js';

// Worker message types
interface CryptoWorkerMessage {
  id: string;
  type: 'GENERATE_HYBRID_KEYPAIR' | 'HYBRID_ENCAPSULATE' | 'PQ_KEYGEN' | 'PQ_SIGN' | 'PQ_VERIFY';
  payload: any;
}

interface CryptoWorkerResponse {
  id: string;
  type: 'SUCCESS' | 'ERROR';
  payload: any;
}

// Initialize crypto operations
const hybridKEM = new HybridKEM();

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<CryptoWorkerMessage>) => {
  const { id, type, payload } = event.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'GENERATE_HYBRID_KEYPAIR':
        result = await hybridKEM.generateKeyPair();
        break;
        
      case 'HYBRID_ENCAPSULATE':
        result = await hybridKEM.encapsulate(payload.publicKey);
        break;
        
      case 'PQ_KEYGEN':
        const kem = createPQKEM(payload.algorithm);
        result = await kem.generateKeyPair();
        break;
        
      case 'PQ_SIGN':
        const dsa = createPQDSA(payload.algorithm);
        result = await dsa.sign(payload.message, payload.privateKey);
        break;
        
      case 'PQ_VERIFY':
        const verifyDsa = createPQDSA(payload.algorithm);
        result = await verifyDsa.verify(payload.message, payload.signature, payload.publicKey);
        break;
        
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
    
    const response: CryptoWorkerResponse = {
      id,
      type: 'SUCCESS',
      payload: result
    };
    
    self.postMessage(response);
    
  } catch (error) {
    const response: CryptoWorkerResponse = {
      id,
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    };
    
    self.postMessage(response);
  }
});

// Signal that worker is ready
self.postMessage({
  id: 'WORKER_READY',
  type: 'SUCCESS',
  payload: { ready: true }
});