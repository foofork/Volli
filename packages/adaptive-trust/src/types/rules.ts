import type { TrustMode } from './trust.js';
import type { IContext } from './context.js';

export interface IRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
  mandatory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleInput {
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority?: number;
  enabled?: boolean;
  mandatory?: boolean;
}

export interface RuleCondition {
  type: 'network' | 'contact' | 'time' | 'location' | 'device' | 'composite' | 'always';
  operator?: 'AND' | 'OR';
  conditions?: RuleCondition[];
  network?: {
    type?: string[];
    trust?: string[];
    quality?: string[];
    isVPN?: boolean;
    isTor?: boolean;
  };
  contact?: {
    id?: string[];
    group?: string[];
    trustLevel?: string[];
  };
  time?: {
    days?: number[];
    startTime?: string;
    endTime?: string;
    timezone?: string;
  };
  location?: {
    lat?: number;
    lon?: number;
    radius?: number;
    country?: string[];
    region?: string[];
  };
  device?: {
    type?: string[];
    batteryLevel?: { min?: number; max?: number };
    isCharging?: boolean;
  };
}

export interface RuleAction {
  mode: TrustMode;
  notify?: boolean;
  reason?: string;
  persist?: boolean;
}

export interface RuleFilter {
  enabled?: boolean;
  mandatory?: boolean;
  mode?: TrustMode;
  conditionType?: string;
  limit?: number;
  offset?: number;
}

export interface RuleMatch {
  rule: IRule;
  matchScore: number;
  matchedConditions: string[];
}

export interface RuleConflict {
  rule1: IRule;
  rule2: IRule;
  type: 'priority' | 'condition' | 'action';
  severity: 'low' | 'medium' | 'high';
  resolution?: 'priority' | 'mandatory' | 'user-choice';
  description: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface IRuleEngine {
  addRule(rule: RuleInput): Promise<IRule>;
  updateRule(id: string, updates: Partial<RuleInput>): Promise<IRule>;
  deleteRule(id: string): Promise<void>;
  getRules(filter?: RuleFilter): Promise<IRule[]>;
  getRule(id: string): Promise<IRule | null>;
  evaluate(context: IContext): Promise<RuleMatch | null>;
  evaluateAll(context: IContext): Promise<RuleMatch[]>;
  detectConflicts(rule: IRule): Promise<RuleConflict[]>;
  validateRule(rule: RuleInput): ValidationIssue[];
  importRules(rules: RuleInput[]): Promise<IRule[]>;
  exportRules(filter?: RuleFilter): Promise<IRule[]>;
  clearRules(): Promise<void>;
}