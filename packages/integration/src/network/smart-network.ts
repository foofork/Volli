/**
 * Smart Network Manager - Adds automatic reconnection, server selection, and reliability features
 */

import { networkStore } from './network-store';

export interface SmartNetworkConfig {
  // Auto-reconnect settings
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  initialReconnectDelay: number; // ms
  maxReconnectDelay: number; // ms
  reconnectBackoffMultiplier: number;
  
  // Server selection
  servers: string[];
  pingTimeout: number; // ms
  
  // Circuit breaker
  circuitBreakerThreshold: number; // failures before opening
  circuitBreakerResetTime: number; // ms
}

const DEFAULT_CONFIG: SmartNetworkConfig = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000, // 1 second
  maxReconnectDelay: 30000, // 30 seconds
  reconnectBackoffMultiplier: 1.5,
  
  servers: [
    'wss://localhost:3001', // Development server
    'wss://signal.volly.app', // Production server
  ],
  pingTimeout: 5000,
  
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 60000 // 1 minute
};

interface ServerHealth {
  url: string;
  latency: number;
  failures: number;
  lastCheck: number;
  circuitOpen: boolean;
}

export class SmartNetworkManager {
  private config: SmartNetworkConfig;
  private reconnectAttempt = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private currentReconnectDelay: number;
  private serverHealth: Map<string, ServerHealth> = new Map();
  private currentServer?: string;
  private isReconnecting = false;
  private userId?: string;
  private publicKey?: string;
  private connectionWatcher?: () => void;
  
  constructor(config: Partial<SmartNetworkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentReconnectDelay = this.config.initialReconnectDelay;
    
    // Initialize server health tracking
    this.config.servers.forEach(server => {
      this.serverHealth.set(server, {
        url: server,
        latency: Infinity,
        failures: 0,
        lastCheck: 0,
        circuitOpen: false
      });
    });
    
    // Watch for connection status changes
    this.setupConnectionWatcher();
  }
  
  private setupConnectionWatcher(): void {
    // Subscribe to network store status
    this.connectionWatcher = networkStore.subscribe(state => {
      if (state.signalingStatus === 'disconnected' && 
          this.config.autoReconnect && 
          !this.isReconnecting &&
          this.userId) {
        console.log('Connection lost, initiating auto-reconnect');
        this.scheduleReconnect();
      }
    });
  }
  
  /**
   * Connect with automatic server selection and reconnection
   */
  async connect(userId: string, publicKey: string): Promise<void> {
    this.userId = userId;
    this.publicKey = publicKey;
    
    // Find best server
    const bestServer = await this.selectBestServer();
    if (!bestServer) {
      throw new Error('No available servers');
    }
    
    try {
      console.log(`Connecting to ${bestServer}...`);
      await networkStore.connectToSignaling(bestServer, userId, publicKey);
      this.currentServer = bestServer;
      this.reconnectAttempt = 0;
      this.currentReconnectDelay = this.config.initialReconnectDelay;
      
      // Reset server health on successful connection
      const health = this.serverHealth.get(bestServer);
      if (health) {
        health.failures = 0;
        health.circuitOpen = false;
      }
      
      console.log(`Connected successfully to ${bestServer}`);
    } catch (error) {
      console.error('Connection failed:', error);
      this.handleConnectionFailure(bestServer);
      
      if (this.config.autoReconnect) {
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }
  
  /**
   * Select the best server based on latency and health
   */
  private async selectBestServer(): Promise<string | null> {
    const availableServers = this.config.servers.filter(server => {
      const health = this.serverHealth.get(server);
      return !health?.circuitOpen;
    });
    
    if (availableServers.length === 0) {
      // All circuits are open, try to reset the oldest one
      const oldestCircuit = Array.from(this.serverHealth.entries())
        .filter(([_, health]) => health.circuitOpen)
        .sort((a, b) => a[1].lastCheck - b[1].lastCheck)[0];
        
      if (oldestCircuit && Date.now() - oldestCircuit[1].lastCheck > this.config.circuitBreakerResetTime) {
        console.log(`Resetting circuit breaker for ${oldestCircuit[0]}`);
        oldestCircuit[1].circuitOpen = false;
        oldestCircuit[1].failures = 0;
        availableServers.push(oldestCircuit[0]);
      } else {
        return null;
      }
    }
    
    // For development, just use the first available server
    // In production, this would ping all servers and select the best
    if (availableServers.length === 1 || process.env.NODE_ENV === 'development') {
      return availableServers[0];
    }
    
    // Simple ping test - try to connect and measure time
    const pingResults = await Promise.all(
      availableServers.map(async server => {
        const start = Date.now();
        try {
          await this.pingServer(server);
          const latency = Date.now() - start;
          
          const health = this.serverHealth.get(server)!;
          health.latency = latency;
          health.lastCheck = Date.now();
          
          return { server, latency };
        } catch {
          return { server, latency: Infinity };
        }
      })
    );
    
    // Select server with lowest latency
    const best = pingResults
      .filter(result => result.latency !== Infinity)
      .sort((a, b) => a.latency - b.latency)[0];
      
    return best?.server || availableServers[0];
  }
  
  /**
   * Ping a server to check availability
   */
  private async pingServer(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Ping timeout'));
      }, this.config.pingTimeout);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      };
      
      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Connection failed'));
      };
    });
  }
  
  /**
   * Handle connection failure with circuit breaker pattern
   */
  private handleConnectionFailure(server: string): void {
    const health = this.serverHealth.get(server);
    if (!health) return;
    
    health.failures++;
    health.lastCheck = Date.now();
    
    // Open circuit if threshold reached
    if (health.failures >= this.config.circuitBreakerThreshold) {
      health.circuitOpen = true;
      console.warn(`Circuit breaker opened for ${server} after ${health.failures} failures`);
    }
  }
  
  /**
   * Schedule automatic reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempt >= this.config.maxReconnectAttempts) {
      if (this.reconnectAttempt >= this.config.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
      return;
    }
    
    this.isReconnecting = true;
    this.reconnectAttempt++;
    
    console.log(`Reconnecting in ${this.currentReconnectDelay}ms (attempt ${this.reconnectAttempt}/${this.config.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(this.userId!, this.publicKey!);
        console.log('Reconnection successful');
        this.isReconnecting = false;
      } catch (error) {
        console.error('Reconnection failed:', error);
        
        // Increase delay with exponential backoff
        this.currentReconnectDelay = Math.min(
          this.currentReconnectDelay * this.config.reconnectBackoffMultiplier,
          this.config.maxReconnectDelay
        );
        
        this.isReconnecting = false;
        this.scheduleReconnect();
      }
    }, this.currentReconnectDelay);
  }
  
  /**
   * Disconnect and clean up
   */
  async disconnect(): Promise<void> {
    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    // Unsubscribe from connection watcher
    if (this.connectionWatcher) {
      this.connectionWatcher();
      this.connectionWatcher = undefined;
    }
    
    // Reset state
    this.isReconnecting = false;
    this.reconnectAttempt = 0;
    this.currentReconnectDelay = this.config.initialReconnectDelay;
    this.userId = undefined;
    this.publicKey = undefined;
    
    // Disconnect from network
    await networkStore.disconnectFromSignaling();
  }
  
  /**
   * Get current connection health status
   */
  getHealthStatus(): {
    currentServer: string | undefined;
    serverHealth: ServerHealth[];
    reconnectAttempts: number;
    isReconnecting: boolean;
  } {
    return {
      currentServer: this.currentServer,
      serverHealth: Array.from(this.serverHealth.values()),
      reconnectAttempts: this.reconnectAttempt,
      isReconnecting: this.isReconnecting
    };
  }
  
  /**
   * Force reconnect to a different server
   */
  async forceReconnect(): Promise<void> {
    // Mark current server as failed if connected
    if (this.currentServer) {
      this.handleConnectionFailure(this.currentServer);
    }
    
    // Disconnect and reconnect
    await networkStore.disconnectFromSignaling();
    
    if (this.userId && this.publicKey) {
      await this.connect(this.userId, this.publicKey);
    }
  }
}

// Export singleton instance
export const smartNetwork = new SmartNetworkManager();

// Also export the underlying network store for direct access if needed
export { networkStore };