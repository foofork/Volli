export enum TrustMode {
  CONVENIENCE = 'convenience',
  BALANCED = 'balanced',
  PRIVATE = 'private',
  AIRGAP = 'airgap'
}

export type DecisionSource = 'user-rule' | 'user-choice' | 'adaptive' | 'default';
export type NetworkTrustLevel = 'trusted' | 'public' | 'hostile' | 'unknown';

export interface TrustDecision {
  mode: TrustMode;
  source: DecisionSource;
  confidence: number;
  reasoning: string[];
  timestamp: Date;
  context: IContext;
  ruleId?: string;
}

export interface TrustConfig {
  defaultMode?: TrustMode;
  autoAdapt?: boolean;
  persistDecisions?: boolean;
  dbName?: string;
  features?: {
    networkDetection?: boolean;
    batteryOptimization?: boolean;
    privacyLearning?: boolean;
  };
}

export interface ModeOptions {
  source?: DecisionSource;
  reason?: string;
  temporary?: boolean;
  duration?: number;
}

export interface DecisionOptions {
  skipRules?: boolean;
  skipCache?: boolean;
  context?: Partial<IContext>;
}

export interface ITrustManager {
  initialize(config: TrustConfig): Promise<void>;
  decide(options?: DecisionOptions): Promise<TrustDecision>;
  setMode(mode: TrustMode, options?: ModeOptions): Promise<void>;
  getCurrentMode(): TrustMode;
  getCurrentDecision(): TrustDecision | null;
  on(event: 'mode-changed', handler: (e: ModeChangedEvent) => void): void;
  on(event: 'decision-made', handler: (e: TrustDecision) => void): void;
}

import type { IContext } from './context.js';
import type { ModeChangedEvent } from './events.js';