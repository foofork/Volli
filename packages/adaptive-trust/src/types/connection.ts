import type { TrustMode } from './trust.js';
import type { IContext } from './context.js';

export type ConnectionState = 'connecting' | 'connected' | 'upgrading' | 'disconnected' | 'error';

export interface Connection {
  id: string;
  peerId: string;
  strategy: string;
  state: ConnectionState;
  metadata: ConnectionMetadata;
  
  send(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  getStats(): ConnectionStats;
  
  on(event: 'data', handler: (data: Uint8Array) => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: 'close', handler: (reason?: string) => void): void;
  on(event: 'state', handler: (state: ConnectionState) => void): void;
  
  off(event: string, handler: Function): void;
}

export interface ConnectionMetadata {
  trustMode: TrustMode;
  established: Date;
  lastActivity: Date;
  upgradeHistory: UpgradeEntry[];
  quality: ConnectionQuality;
  isRelay: boolean;
  relayId?: string;
}

export interface UpgradeEntry {
  from: string;
  to: string;
  timestamp: Date;
  reason: string;
  success: boolean;
}

export interface ConnectionQuality {
  latency: number;
  bandwidth: number;
  packetLoss: number;
  jitter: number;
  score: number;
}

export interface ConnectionStats {
  bytesSent: number;
  bytesReceived: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  reconnects: number;
  uptime: number;
}

export interface ConnectionStrategy {
  name: string;
  priority: number;
  trustModes: TrustMode[];
  
  isAvailable(context: IContext): Promise<boolean>;
  connect(peerId: string, options?: ConnectionOptions): Promise<Connection>;
  canUpgrade(from: Connection): boolean;
  upgrade(connection: Connection): Promise<Connection>;
}

export interface ConnectionOptions {
  timeout?: number;
  retries?: number;
  preferredRelays?: string[];
  metadata?: Record<string, any>;
}

export interface IConnectionStrategy {
  name: string;
  priority: number;
  trustModes: TrustMode[];
  
  isAvailable(context: IContext): Promise<boolean>;
  connect(peerId: string, options?: ConnectionOptions): Promise<Connection>;
  canUpgrade(from: Connection): boolean;
  upgrade(connection: Connection): Promise<Connection>;
}

export interface IConnectionManager {
  connect(peerId: string, options?: ConnectionOptions): Promise<Connection>;
  upgrade(connection: Connection, mode: TrustMode): Promise<Connection>;
  disconnect(peerId: string): Promise<void>;
  getConnection(peerId: string): Connection | undefined;
  getConnections(): Map<string, Connection>;
  getStrategies(mode: TrustMode): ConnectionStrategy[];
  registerStrategy(strategy: IConnectionStrategy): void;
  unregisterStrategy(name: string): void;
  setPreferredStrategy(mode: TrustMode, strategyName: string): void;
  getStats(): ManagerStats;
}

export interface ManagerStats {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  totalBandwidth: number;
  averageLatency: number;
  strategyUsage: Record<string, number>;
}