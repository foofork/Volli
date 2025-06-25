import type { NetworkTrustLevel } from './trust.js';

export interface IContext {
  network: NetworkContext;
  device: DeviceContext;
  behavior: BehaviorContext;
  temporal: TemporalContext;
  metadata?: ContextMetadata;
}

export interface NetworkContext {
  type: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'unknown';
  trust: NetworkTrustLevel;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  isVPN: boolean;
  isTor: boolean;
  ssid?: string;
  bssid?: string;
  carrier?: string;
  ip?: string;
  dns?: string[];
  latency?: number;
  bandwidth?: number;
}

export interface DeviceContext {
  type: 'mobile' | 'desktop' | 'tablet' | 'watch' | 'other';
  platform: 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'web' | 'other';
  battery: {
    level: number;
    charging: boolean;
    timeRemaining?: number;
  };
  performance: {
    cpu: number;
    memory: number;
    storage: number;
  };
  screen: {
    locked: boolean;
    brightness?: number;
  };
  sensors?: {
    location?: boolean;
    motion?: boolean;
    camera?: boolean;
    microphone?: boolean;
  };
}

export interface BehaviorContext {
  activityLevel: 'active' | 'idle' | 'background';
  messageFrequency: 'high' | 'medium' | 'low' | 'none';
  contactCount: number;
  sessionDuration: number;
  lastActivity: Date;
  patterns?: {
    peakHours?: number[];
    typicalDuration?: number;
    preferredMode?: string;
  };
}

export interface TemporalContext {
  timestamp: Date;
  timezone: string;
  isDaytime: boolean;
  isWeekend: boolean;
  isHoliday?: boolean;
  hour: number;
  dayOfWeek: number;
}

export interface ContextMetadata {
  source: 'detected' | 'manual' | 'cached';
  confidence: number;
  lastUpdated: Date;
  updateCount: number;
}

export interface DetectionOptions {
  includeNetwork?: boolean;
  includeDevice?: boolean;
  includeBehavior?: boolean;
  includeTemporal?: boolean;
  timeout?: number;
  useCache?: boolean;
  cacheTimeout?: number;
}

export interface ContentSignals {
  keywords?: string[];
  participants?: string[];
  attachments?: boolean;
  mediaTypes?: string[];
  location?: boolean;
  timestamps?: Date[];
}

export interface SensitivityResult {
  level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  factors: string[];
  recommendation: string;
}

export type Unsubscribe = () => void;

export interface IContextDetector {
  detect(options?: DetectionOptions): Promise<IContext>;
  detectNetwork(): Promise<NetworkContext>;
  detectDevice(): Promise<DeviceContext>;
  detectBehavior(): Promise<BehaviorContext>;
  detectTemporal(): Promise<TemporalContext>;
  detectSensitivity(signals: ContentSignals): Promise<SensitivityResult>;
  subscribe(handler: (context: IContext) => void): Unsubscribe;
  getCached(): IContext | null;
  clearCache(): void;
}