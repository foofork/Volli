// Crypto Worker Pool Management
// Manages a pool of crypto workers for parallel operations

import { browser } from '$app/environment';

interface WorkerTask {
  id: string;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

interface CryptoWorkerMessage {
  id: string;
  type: string;
  payload: any;
}

interface CryptoWorkerResponse {
  id: string;
  type: 'SUCCESS' | 'ERROR';
  payload: any;
}

/**
 * Pool of crypto workers for parallel cryptographic operations
 */
export class CryptoWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private tasks: Map<string, WorkerTask> = new Map();
  private readonly maxWorkers: number;
  private readonly workerTimeout: number;
  
  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4, workerTimeout: number = 30000) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap at 8 workers
    this.workerTimeout = workerTimeout;
    
    if (browser) {
      this.initializeWorkers();
    }
  }
  
  /**
   * Initialize the worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
  }
  
  /**
   * Create a new crypto worker
   */
  private createWorker(): Worker {
    const worker = new Worker(
      new URL('../workers/crypto-worker.js', import.meta.url),
      { type: 'module' }
    );
    
    worker.addEventListener('message', this.handleWorkerMessage.bind(this));
    worker.addEventListener('error', this.handleWorkerError.bind(this));
    
    this.workers.push(worker);
    this.availableWorkers.push(worker);
    
    return worker;
  }
  
  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(event: MessageEvent<CryptoWorkerResponse>): void {
    const { id, type, payload } = event.data;
    
    if (id === 'WORKER_READY') {
      // Worker initialization complete
      return;
    }
    
    const task = this.tasks.get(id);
    if (!task) {
      console.warn('[CryptoWorkerPool] Received response for unknown task:', id);
      return;
    }
    
    // Clear timeout
    if (task.timeout) {
      clearTimeout(task.timeout);
    }
    
    // Remove task
    this.tasks.delete(id);
    
    // Return worker to available pool
    const worker = event.target as Worker;
    this.availableWorkers.push(worker);
    
    // Resolve or reject the task
    if (type === 'SUCCESS') {
      task.resolve(payload);
    } else {
      task.reject(new Error(payload.message || 'Worker operation failed'));
    }
  }
  
  /**
   * Handle worker errors
   */
  private handleWorkerError(event: ErrorEvent): void {
    console.error('[CryptoWorkerPool] Worker error:', event.error);
    
    const worker = event.target as Worker;
    
    // Find and reject any tasks for this worker
    for (const [taskId, task] of this.tasks.entries()) {
      task.reject(new Error('Worker crashed during operation'));
      this.tasks.delete(taskId);
    }
    
    // Remove worker from pools
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
    }
    
    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
    
    // Create replacement worker
    this.createWorker();
  }
  
  /**
   * Execute a task on an available worker
   */
  private async executeTask<T>(type: string, payload: any): Promise<T> {
    if (!browser) {
      throw new Error('CryptoWorkerPool can only be used in browser environment');
    }
    
    return new Promise<T>((resolve, reject) => {
      // Generate unique task ID
      const taskId = crypto.randomUUID();
      
      // Get available worker
      const worker = this.availableWorkers.pop();
      if (!worker) {
        reject(new Error('No available workers'));
        return;
      }
      
      // Set up timeout
      const timeout = setTimeout(() => {
        this.tasks.delete(taskId);
        this.availableWorkers.push(worker); // Return worker to pool
        reject(new Error('Worker operation timed out'));
      }, this.workerTimeout);
      
      // Store task
      this.tasks.set(taskId, { id: taskId, resolve, reject, timeout });
      
      // Send message to worker
      const message: CryptoWorkerMessage = {
        id: taskId,
        type,
        payload
      };
      
      worker.postMessage(message);
    });
  }
  
  /**
   * Generate hybrid key pair
   */
  async generateHybridKeyPair(): Promise<any> {
    return this.executeTask('GENERATE_HYBRID_KEYPAIR', {});
  }
  
  /**
   * Perform hybrid encapsulation
   */
  async hybridEncapsulate(publicKey: any): Promise<any> {
    return this.executeTask('HYBRID_ENCAPSULATE', { publicKey });
  }
  
  /**
   * Generate post-quantum key pair
   */
  async generatePQKeyPair(algorithm: string): Promise<any> {
    return this.executeTask('PQ_KEYGEN', { algorithm });
  }
  
  /**
   * Sign message with post-quantum algorithm
   */
  async signPQ(message: Uint8Array, privateKey: Uint8Array, algorithm: string): Promise<Uint8Array> {
    return this.executeTask('PQ_SIGN', { message, privateKey, algorithm });
  }
  
  /**
   * Verify post-quantum signature
   */
  async verifyPQ(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array, algorithm: string): Promise<boolean> {
    return this.executeTask('PQ_VERIFY', { message, signature, publicKey, algorithm });
  }
  
  /**
   * Terminate all workers and cleanup
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    
    this.workers.length = 0;
    this.availableWorkers.length = 0;
    
    // Reject any pending tasks
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.timeout) {
        clearTimeout(task.timeout);
      }
      task.reject(new Error('Worker pool terminated'));
    }
    
    this.tasks.clear();
  }
}

// Global worker pool instance
let globalWorkerPool: CryptoWorkerPool | null = null;

/**
 * Get the global crypto worker pool
 */
export function getCryptoWorkerPool(): CryptoWorkerPool {
  if (!globalWorkerPool) {
    globalWorkerPool = new CryptoWorkerPool();
  }
  return globalWorkerPool;
}