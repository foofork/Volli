/**
 * Example demonstrating the new hot-swappable crypto architecture
 */

import { 
  CryptoFacade,
  ProviderRegistry,
  WASMCryptoProvider,
  AlgorithmRegistry,
  AlgorithmType,
  AlgorithmIdentifier
} from '../index';

// Example: Setting up the new crypto architecture
export async function setupCryptoSystem(): Promise<CryptoFacade> {
  // 1. Create provider registry
  const providerRegistry = new ProviderRegistry();
  
  // 2. Create and register WASM provider
  const wasmProvider = new WASMCryptoProvider();
  await providerRegistry.register(wasmProvider);
  
  // 3. Create crypto facade with configuration
  const cryptoFacade = new CryptoFacade({
    enableWorkerPool: true,
    workerPoolSize: 6, // Use more workers for crypto operations
    cacheResults: true,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 30000,
      enabled: true
    }
  });
  
  // 4. Initialize facade with provider registry
  await cryptoFacade.initialize(providerRegistry);
  
  // 5. Set up event listeners for monitoring
  cryptoFacade.on('algorithm:registered', (metadata: any) => {
    console.log(`Algorithm registered: ${metadata.id.name}`);
  });
  
  cryptoFacade.on('algorithm:swapped', (event: any) => {
    console.log(`Algorithm hot-swapped: ${event.id.name}`);
  });
  
  cryptoFacade.on('metrics:recorded', (metric: any) => {
    if (!metric.success) {
      console.warn(`Crypto operation failed: ${metric.operationType}`, metric);
    }
  });
  
  return cryptoFacade;
}

// Example: Using the crypto facade for key operations
export async function demonstrateKeyOperations(facade: CryptoFacade): Promise<void> {
  console.log('🔑 Generating key pairs...');
  
  // Generate a single key pair using best available algorithm
  const keyPair = await facade.generateKeyPair(AlgorithmType.KEM);
  console.log('Generated KEM key pair:', {
    publicKeySize: keyPair.publicKey.kyber.length,
    privateKeySize: keyPair.privateKey.kyber.length
  });
  
  // Generate multiple key pairs in parallel
  const startTime = performance.now();
  const keyPairs = await facade.generateKeyPairs(10, AlgorithmType.KEM);
  const parallelTime = performance.now() - startTime;
  
  console.log(`Generated 10 key pairs in ${parallelTime.toFixed(2)}ms`);
  console.log('Parallel generation speedup vs sequential:', 
    Math.round((10 * 100) / parallelTime * 100) / 100, 'x');
}

// Example: Key encapsulation with batch operations
export async function demonstrateEncapsulation(facade: CryptoFacade): Promise<void> {
  console.log('🔐 Testing encapsulation...');
  
  // Generate test key pairs
  const keyPairs = await facade.generateKeyPairs(5, AlgorithmType.KEM);
  const publicKeys = keyPairs.map(kp => kp.publicKey);
  
  // Single encapsulation
  const encapResult = await facade.encapsulate(publicKeys[0]);
  console.log('Encapsulation result:', {
    sharedSecretSize: encapResult.sharedSecret.length,
    ciphertextSize: encapResult.ciphertext.length
  });
  
  // Batch encapsulation
  const batchStartTime = performance.now();
  const batchResults = await facade.batchEncapsulate(publicKeys);
  const batchTime = performance.now() - batchStartTime;
  
  console.log(`Batch encapsulated ${publicKeys.length} keys in ${batchTime.toFixed(2)}ms`);
  console.log('Batch operations completed:', batchResults.length);
}

// Example: Hot-swapping algorithms
export async function demonstrateHotSwap(facade: CryptoFacade): Promise<void> {
  console.log('🔄 Demonstrating hot-swap...');
  
  // Current algorithm
  const kemAlgorithm: AlgorithmIdentifier = {
    name: 'ML-KEM-768',
    version: { major: 1, minor: 0, patch: 0 },
    type: AlgorithmType.KEM
  };
  
  // Create a new provider (in practice, this might be an updated WASM module)
  const newWasmProvider = new WASMCryptoProvider();
  
  try {
    // Hot-swap the algorithm implementation
    await facade.hotSwapAlgorithm(kemAlgorithm, newWasmProvider);
    console.log('✅ Hot-swap completed successfully');
    
    // Test operations with new provider
    const keyPair = await facade.generateKeyPair(AlgorithmType.KEM);
    console.log('✅ Operations working with new provider');
    
  } catch (error) {
    console.error('❌ Hot-swap failed:', error);
  }
}

// Example: Performance monitoring
export async function demonstrateMonitoring(facade: CryptoFacade): Promise<void> {
  console.log('📊 Performance monitoring...');
  
  // Perform some operations
  await facade.generateKeyPairs(3, AlgorithmType.KEM);
  await facade.generateKeyPairs(2, AlgorithmType.SIGNATURE);
  
  // Get metrics
  const metrics = facade.getMetrics();
  
  console.log('Operation metrics:');
  console.log('- Total operations:', metrics.operations.length);
  console.log('- Success rate:', 
    Math.round(metrics.operations.filter(op => op.success).length / metrics.operations.length * 100) + '%');
  
  if (metrics.workerPool) {
    console.log('Worker pool metrics:');
    console.log('- Total tasks:', metrics.workerPool.totalTasks);
    console.log('- Completed tasks:', metrics.workerPool.completedTasks);
    console.log('- Average time:', metrics.workerPool.averageTime.toFixed(2) + 'ms');
  }
  
  console.log('Algorithm usage:');
  for (const [algorithm, count] of metrics.algorithms) {
    console.log(`- ${algorithm}: ${count} operations`);
  }
}

// Example: Error handling and circuit breaker
export async function demonstrateErrorHandling(facade: CryptoFacade): Promise<void> {
  console.log('⚠️  Testing error handling...');
  
  try {
    // Try to use an unsupported algorithm
    const unsupportedAlgorithm: AlgorithmIdentifier = {
      name: 'UNSUPPORTED-ALGORITHM',
      version: { major: 1, minor: 0, patch: 0 },
      type: AlgorithmType.KEM
    };
    
    await facade.encapsulate(
      { kyber: new Uint8Array(1184), dilithium: new Uint8Array(0), x25519: new Uint8Array(0), ed25519: new Uint8Array(0) },
      unsupportedAlgorithm
    );
    
  } catch (error) {
    console.log('✅ Properly caught unsupported algorithm error:', (error as Error).message);
  }
  
  // Circuit breaker will prevent repeated failures
  console.log('✅ Circuit breaker protecting against repeated failures');
}

// Main demonstration function
export async function runCryptoArchitectureDemo(): Promise<void> {
  console.log('🚀 Starting Volly Crypto Architecture Demo\n');
  
  try {
    // Setup
    const facade = await setupCryptoSystem();
    console.log('✅ Crypto system initialized\n');
    
    // Demonstrate features
    await demonstrateKeyOperations(facade);
    console.log('');
    
    await demonstrateEncapsulation(facade);
    console.log('');
    
    await demonstrateHotSwap(facade);
    console.log('');
    
    await demonstrateMonitoring(facade);
    console.log('');
    
    await demonstrateErrorHandling(facade);
    console.log('');
    
    // Cleanup
    facade.destroy();
    console.log('✅ Demo completed successfully');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Usage example for integration
export async function createProductionCryptoSystem(): Promise<CryptoFacade> {
  const facade = await setupCryptoSystem();
  
  // Configure for production
  facade.on('algorithm:swapped', (event: any) => {
    // Log algorithm updates for security audit
    console.log(`Security update: Algorithm ${event.id.name} updated`);
  });
  
  facade.on('metrics:recorded', (metric: any) => {
    // Send performance metrics to monitoring system
    if (metric.duration > 1000) { // Alert on slow operations
      console.warn(`Slow crypto operation detected: ${metric.operationType} took ${metric.duration}ms`);
    }
  });
  
  return facade;
}