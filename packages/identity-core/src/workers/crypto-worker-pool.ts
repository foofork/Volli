/**
 * Crypto Worker Pool for parallel cryptographic operations
 */

import { KeyPair, EncapsulationResult, EncryptedData } from '../crypto-types';
import { AlgorithmIdentifier } from '../interfaces/algorithm-types';

interface WorkerTask {
  id: string;
  type: WorkerOperationType;
  data: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

enum WorkerOperationType {
  KEY_GEN = 'keyGen',
  ENCAPSULATE = 'encapsulate',
  DECAPSULATE = 'decapsulate',
  SIGN = 'sign',
  VERIFY = 'verify',
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
  BATCH = 'batch'
}

interface WorkerMessage {
  id: string;
  type: WorkerOperationType;
  data: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  metrics?: WorkerMetrics;
}

interface WorkerMetrics {
  operationTime: number;
  queueTime: number;
  workerId: number;
}

export class CryptoWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private workerStatus: boolean[] = [];
  private roundRobinIndex = 0;
  private readonly maxQueueSize: number;
  private readonly taskTimeout: number;
  private metrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageTime: 0
  };
  
  constructor(
    private workerPath: string,
    private poolSize: number = navigator.hardwareConcurrency || 4,
    maxQueueSize: number = 1000,
    taskTimeout: number = 30000
  ) {
    this.maxQueueSize = maxQueueSize;
    this.taskTimeout = taskTimeout;
    this.initializeWorkers();
  }
  
  private initializeWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerPath, { type: 'module' });
      
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        this.handleWorkerResponse(e.data, i);
      };
      
      worker.onerror = (error) => {
        console.error(`Worker ${i} error:`, error);
        this.handleWorkerError(i);
      };
      
      this.workers.push(worker);
      this.workerStatus.push(true);
    }
  }
  
  /**
   * Generate key pair using worker pool
   */
  async generateKeyPair(algorithm: AlgorithmIdentifier): Promise<KeyPair> {
    return this.executeTask(WorkerOperationType.KEY_GEN, { algorithm });
  }
  
  /**
   * Batch generate multiple key pairs
   */
  async batchGenerateKeyPairs(
    algorithm: AlgorithmIdentifier, 
    count: number
  ): Promise<KeyPair[]> {
    const batchSize = Math.ceil(count / this.poolSize);
    const promises: Promise<KeyPair[]>[] = [];
    
    for (let i = 0; i < this.poolSize && i * batchSize < count; i++) {
      const workerCount = Math.min(batchSize, count - i * batchSize);
      promises.push(
        this.executeTask(WorkerOperationType.BATCH, {
          operation: WorkerOperationType.KEY_GEN,
          algorithm,
          count: workerCount
        })
      );
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }
  
  /**
   * Encapsulate using worker pool
   */
  async encapsulate(
    publicKey: Uint8Array, 
    algorithm: AlgorithmIdentifier
  ): Promise<EncapsulationResult> {
    return this.executeTask(WorkerOperationType.ENCAPSULATE, {
      publicKey,
      algorithm
    });
  }
  
  /**
   * Batch encapsulation for multiple public keys
   */
  async batchEncapsulate(
    publicKeys: Uint8Array[], 
    algorithm: AlgorithmIdentifier
  ): Promise<EncapsulationResult[]> {
    // Distribute keys across workers
    const tasksPerWorker = Math.ceil(publicKeys.length / this.poolSize);
    const promises: Promise<EncapsulationResult[]>[] = [];
    
    for (let i = 0; i < this.poolSize; i++) {
      const start = i * tasksPerWorker;
      const end = Math.min(start + tasksPerWorker, publicKeys.length);
      
      if (start < publicKeys.length) {
        const workerKeys = publicKeys.slice(start, end);
        promises.push(
          this.executeTask(WorkerOperationType.BATCH, {
            operation: WorkerOperationType.ENCAPSULATE,
            publicKeys: workerKeys,
            algorithm
          })
        );
      }
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }
  
  /**
   * Execute a task on the worker pool
   */
  private async executeTask(
    type: WorkerOperationType, 
    data: any
  ): Promise<any> {
    // Check queue size
    if (this.taskQueue.length >= this.maxQueueSize) {
      throw new Error('Worker pool queue is full');
    }
    
    const taskId = this.generateTaskId();
    
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: taskId,
        type,
        data,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.cancelTask(taskId);
        reject(new Error(`Task ${taskId} timed out after ${this.taskTimeout}ms`));
      }, this.taskTimeout);
      
      // Store timeout cleanup in resolve/reject
      const originalResolve = task.resolve;
      const originalReject = task.reject;
      
      task.resolve = (value) => {
        clearTimeout(timeoutId);
        originalResolve(value);
      };
      
      task.reject = (error) => {
        clearTimeout(timeoutId);
        originalReject(error);
      };
      
      this.enqueueTask(task);
    });
  }
  
  private enqueueTask(task: WorkerTask): void {
    this.taskQueue.push(task);
    this.metrics.totalTasks++;
    this.processQueue();
  }
  
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const workerIndex = this.getAvailableWorker();
      if (workerIndex === -1) break;
      
      const task = this.taskQueue.shift()!;
      this.assignTaskToWorker(task, workerIndex);
    }
  }
  
  private getAvailableWorker(): number {
    // Round-robin with availability check
    const startIndex = this.roundRobinIndex;
    
    do {
      if (this.workerStatus[this.roundRobinIndex]) {
        const index = this.roundRobinIndex;
        this.roundRobinIndex = (this.roundRobinIndex + 1) % this.poolSize;
        return index;
      }
      
      this.roundRobinIndex = (this.roundRobinIndex + 1) % this.poolSize;
    } while (this.roundRobinIndex !== startIndex);
    
    return -1; // No available workers
  }
  
  private assignTaskToWorker(task: WorkerTask, workerIndex: number): void {
    this.workerStatus[workerIndex] = false;
    this.activeTasks.set(task.id, task);
    
    const message: WorkerMessage = {
      id: task.id,
      type: task.type,
      data: task.data
    };
    
    this.workers[workerIndex].postMessage(message);
  }
  
  private handleWorkerResponse(response: WorkerResponse, workerIndex: number): void {
    const task = this.activeTasks.get(response.id);
    
    if (!task) {
      console.warn(`No task found for response ${response.id}`);
      return;
    }
    
    this.activeTasks.delete(response.id);
    this.workerStatus[workerIndex] = true;
    
    if (response.success) {
      task.resolve(response.result);
      this.metrics.completedTasks++;
      
      // Update average time
      if (response.metrics) {
        const totalTime = response.metrics.operationTime + response.metrics.queueTime;
        this.metrics.averageTime = 
          (this.metrics.averageTime * (this.metrics.completedTasks - 1) + totalTime) / 
          this.metrics.completedTasks;
      }
    } else {
      task.reject(new Error(response.error || 'Unknown worker error'));
      this.metrics.failedTasks++;
    }
    
    // Process next task in queue
    this.processQueue();
  }
  
  private handleWorkerError(workerIndex: number): void {
    // Mark worker as unavailable
    this.workerStatus[workerIndex] = false;
    
    // Restart worker
    setTimeout(() => {
      this.restartWorker(workerIndex);
    }, 1000);
  }
  
  private restartWorker(index: number): void {
    const oldWorker = this.workers[index];
    oldWorker.terminate();
    
    const newWorker = new Worker(this.workerPath, { type: 'module' });
    
    newWorker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      this.handleWorkerResponse(e.data, index);
    };
    
    newWorker.onerror = (error) => {
      console.error(`Worker ${index} error:`, error);
      this.handleWorkerError(index);
    };
    
    this.workers[index] = newWorker;
    this.workerStatus[index] = true;
    
    // Process queue with new worker
    this.processQueue();
  }
  
  private cancelTask(taskId: string): void {
    // Remove from queue
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
    }
    
    // Remove from active tasks
    this.activeTasks.delete(taskId);
  }
  
  private generateTaskId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get pool metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }
  
  /**
   * Get worker status
   */
  getWorkerStatus(): boolean[] {
    return [...this.workerStatus];
  }
  
  /**
   * Terminate all workers
   */
  destroy(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    
    // Reject all pending tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('Worker pool destroyed'));
    }
    
    for (const task of this.activeTasks.values()) {
      task.reject(new Error('Worker pool destroyed'));
    }
    
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
  }
}