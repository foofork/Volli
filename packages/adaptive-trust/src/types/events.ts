import type { TrustMode, DecisionSource, TrustDecision } from './trust.js';
import type { IRule } from './rules.js';
import type { IContext } from './context.js';
import type { Connection, ConnectionState } from './connection.js';

export type TrustEvent = 
  | ModeChangedEvent
  | DecisionMadeEvent
  | RuleTriggeredEvent
  | ContextChangedEvent
  | ConnectionEvent
  | ErrorEvent;

export interface BaseEvent {
  type: string;
  timestamp: Date;
  source: string;
}

export interface ModeChangedEvent extends BaseEvent {
  type: 'mode-changed';
  payload: {
    oldMode: TrustMode;
    newMode: TrustMode;
    source: DecisionSource;
    reason?: string;
    temporary?: boolean;
  };
}

export interface DecisionMadeEvent extends BaseEvent {
  type: 'decision-made';
  payload: {
    decision: TrustDecision;
    override?: boolean;
    automatic?: boolean;
  };
}

export interface RuleTriggeredEvent extends BaseEvent {
  type: 'rule-triggered';
  payload: {
    rule: IRule;
    context: IContext;
    applied: boolean;
    reason?: string;
  };
}

export interface ContextChangedEvent extends BaseEvent {
  type: 'context-changed';
  payload: {
    oldContext: IContext;
    newContext: IContext;
    changes: string[];
    significance: 'low' | 'medium' | 'high';
  };
}

export interface ConnectionEvent extends BaseEvent {
  type: 'connection-event';
  payload: {
    connectionId: string;
    peerId: string;
    event: 'created' | 'upgraded' | 'closed' | 'error';
    oldState?: ConnectionState;
    newState?: ConnectionState;
    strategy?: string;
    error?: Error;
  };
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  payload: {
    error: Error;
    component: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
    context?: any;
  };
}

export interface EventEmitter<T extends { type: string } = TrustEvent> {
  on(event: T['type'], handler: (event: T) => void): void;
  once(event: T['type'], handler: (event: T) => void): void;
  off(event: T['type'], handler: (event: T) => void): void;
  emit(event: T): void;
  removeAllListeners(event?: T['type']): void;
}

export interface EventSubscription {
  unsubscribe(): void;
}

export interface EventBus extends EventEmitter<TrustEvent> {
  subscribe(handler: (event: TrustEvent) => void): EventSubscription;
  subscribeToType<T extends TrustEvent>(
    type: T['type'],
    handler: (event: T) => void
  ): EventSubscription;
}