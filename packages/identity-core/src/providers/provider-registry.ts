/**
 * Provider Registry for managing crypto providers
 */

import { 
  CryptoProvider, 
  ProviderRegistry as IProviderRegistry 
} from '../interfaces/crypto-provider';
import { AlgorithmIdentifier } from '../interfaces/algorithm-types';
import { EventEmitter } from 'eventemitter3';

export class ProviderRegistry extends EventEmitter implements IProviderRegistry {
  private providers = new Map<string, CryptoProvider>();
  private providersByPriority: CryptoProvider[] = [];
  
  /**
   * Register a new crypto provider
   */
  async register(provider: CryptoProvider): Promise<void> {
    // Check if provider is available
    if (!await provider.isAvailable()) {
      throw new Error(`Provider ${provider.name} is not available`);
    }
    
    // Initialize provider if needed
    try {
      await provider.initialize();
    } catch (error) {
      throw new Error(`Failed to initialize provider ${provider.name}: ${error}`);
    }
    
    // Register provider
    this.providers.set(provider.name, provider);
    this.updatePriorityList();
    
    this.emit('provider:registered', provider);
  }
  
  /**
   * Unregister a provider
   */
  unregister(name: string): void {
    const provider = this.providers.get(name);
    if (provider) {
      this.providers.delete(name);
      this.updatePriorityList();
      
      // Cleanup provider
      provider.destroy().catch(error => {
        console.warn(`Error destroying provider ${name}:`, error);
      });
      
      this.emit('provider:removed', name);
    }
  }
  
  /**
   * Get provider by name
   */
  getProvider(name: string): CryptoProvider | undefined {
    return this.providers.get(name);
  }
  
  /**
   * Get all registered providers
   */
  getProviders(): CryptoProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get the best provider for a given algorithm
   */
  getBestProvider(algorithm: AlgorithmIdentifier): CryptoProvider | undefined {
    // Return highest priority provider that supports the algorithm
    for (const provider of this.providersByPriority) {
      if (provider.supportsAlgorithm(algorithm)) {
        return provider;
      }
    }
    
    return undefined;
  }
  
  /**
   * Get all providers that support an algorithm, sorted by priority
   */
  getProvidersForAlgorithm(algorithm: AlgorithmIdentifier): CryptoProvider[] {
    return this.providersByPriority.filter(
      provider => provider.supportsAlgorithm(algorithm)
    );
  }
  
  /**
   * Check if any provider supports the algorithm
   */
  isAlgorithmSupported(algorithm: AlgorithmIdentifier): boolean {
    return this.providersByPriority.some(
      provider => provider.supportsAlgorithm(algorithm)
    );
  }
  
  /**
   * Get provider status information
   */
  async getProviderStatus(): Promise<Map<string, ProviderStatus>> {
    const status = new Map<string, ProviderStatus>();
    
    for (const [name, provider] of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        const capabilities = provider.getCapabilities();
        
        status.set(name, {
          name,
          available: isAvailable,
          priority: provider.priority,
          capabilities,
          error: null
        });
      } catch (error) {
        status.set(name, {
          name,
          available: false,
          priority: provider.priority,
          capabilities: null,
          error: error instanceof Error ? error.message : String(error)
        });
        
        this.emit('provider:error', name, error);
      }
    }
    
    return status;
  }
  
  /**
   * Cleanup all providers
   */
  async destroy(): Promise<void> {
    const destroyPromises = Array.from(this.providers.values())
      .map(provider => provider.destroy().catch(error => {
        console.warn(`Error destroying provider ${provider.name}:`, error);
      }));
    
    await Promise.all(destroyPromises);
    
    this.providers.clear();
    this.providersByPriority = [];
    this.removeAllListeners();
  }
  
  private updatePriorityList(): void {
    this.providersByPriority = Array.from(this.providers.values())
      .sort((a, b) => b.priority - a.priority);
  }
}

interface ProviderStatus {
  name: string;
  available: boolean;
  priority: number;
  capabilities: any;
  error: string | null;
}