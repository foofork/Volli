import type {
  IRuleEngine,
  IRule,
  RuleInput,
  IContext,
  RuleMatch,
  RuleConflict,
  ValidationIssue,
  RuleFilter,
  TrustMode
} from '../types/index.js';
import { ValidationError } from '../types/errors.js';
import { RuleStore } from '../database/RuleStore.js';
import { RuleValidator } from './RuleValidator.js';
import { RuleEvaluator } from './RuleEvaluator.js';
import { ConflictDetector } from './ConflictDetector.js';

export class RuleEngine implements IRuleEngine {
  private store: RuleStore;
  private validator: RuleValidator;
  private evaluator: RuleEvaluator;
  private conflictDetector: ConflictDetector;

  constructor(dbName?: string) {
    this.store = new RuleStore(dbName);
    this.validator = new RuleValidator();
    this.evaluator = new RuleEvaluator();
    this.conflictDetector = new ConflictDetector();
  }

  async addRule(rule: RuleInput): Promise<IRule> {
    const validationErrors = this.validateRule(rule);
    const hasErrors = validationErrors.some(e => e.severity === 'error');
    if (hasErrors) {
      throw new ValidationError('Invalid rule input', validationErrors.filter(e => e.severity === 'error'));
    }

    const newRule: IRule = {
      id: this.generateId(),
      name: rule.name,
      condition: rule.condition,
      action: rule.action,
      priority: rule.priority ?? 50,
      enabled: rule.enabled ?? true,
      mandatory: rule.mandatory ?? false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.store.save(newRule);
    return newRule;
  }

  async updateRule(id: string, updates: Partial<RuleInput>): Promise<IRule> {
    const existingRule = await this.store.getById(id);
    if (!existingRule) {
      throw new Error(`Rule with id ${id} not found`);
    }

    const updatedRule: IRule = {
      ...existingRule,
      ...updates,
      id: existingRule.id,
      createdAt: existingRule.createdAt,
      updatedAt: new Date()
    };

    const validationErrors = this.validator.validate(updatedRule);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid rule update', validationErrors);
    }

    await this.store.save(updatedRule);
    return updatedRule;
  }

  async deleteRule(id: string): Promise<void> {
    await this.store.delete(id);
  }

  async getRules(filter?: RuleFilter): Promise<IRule[]> {
    return this.store.query(filter);
  }

  async getRule(id: string): Promise<IRule | null> {
    return this.store.getById(id);
  }

  async evaluate(context: IContext): Promise<RuleMatch | null> {
    const rules = await this.getRules({ enabled: true });
    const matches = await this.evaluator.evaluateRules(rules, context);
    
    if (matches.length === 0) {
      return null;
    }

    // Sort by priority (highest first) and return best match
    matches.sort((a, b) => b.rule.priority - a.rule.priority);
    return matches[0];
  }

  async evaluateAll(context: IContext): Promise<RuleMatch[]> {
    const rules = await this.getRules({ enabled: true });
    const matches = await this.evaluator.evaluateRules(rules, context);
    
    // Sort by priority (highest first)
    matches.sort((a, b) => b.rule.priority - a.rule.priority);
    return matches;
  }

  async detectConflicts(rule: IRule): Promise<RuleConflict[]> {
    const allRules = await this.getRules();
    return this.conflictDetector.detectConflicts(rule, allRules);
  }

  validateRule(rule: RuleInput): ValidationIssue[] {
    return this.validator.validateInput(rule);
  }

  async importRules(rules: RuleInput[]): Promise<IRule[]> {
    const imported: IRule[] = [];
    
    for (const rule of rules) {
      const errors = this.validateRule(rule);
      const hasErrors = errors.some(e => e.severity === 'error');
      if (hasErrors) {
        throw new ValidationError(`Invalid rule: ${rule.name}`, errors.filter(e => e.severity === 'error'));
      }
    }

    for (const rule of rules) {
      const imported_rule = await this.addRule(rule);
      imported.push(imported_rule);
    }

    return imported;
  }

  async exportRules(filter?: RuleFilter): Promise<IRule[]> {
    return this.getRules(filter);
  }

  async clearRules(): Promise<void> {
    await this.store.clear();
  }

  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}