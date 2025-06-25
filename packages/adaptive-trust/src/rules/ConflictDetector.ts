import type { IRule, RuleConflict, RuleCondition } from '../types/index.js';

export class ConflictDetector {
  detectConflicts(rule: IRule, existingRules: IRule[]): RuleConflict[] {
    const conflicts: RuleConflict[] = [];
    const conflictMap = new Map<string, RuleConflict>();

    for (const existingRule of existingRules) {
      if (existingRule.id === rule.id) {
        continue;
      }

      // Check priority conflicts
      const priorityConflict = this.checkPriorityConflict(rule, existingRule);
      if (priorityConflict) {
        const key = `priority_${existingRule.id}`;
        conflictMap.set(key, priorityConflict);
      }

      // Check condition conflicts (only if no priority conflict)
      if (!priorityConflict) {
        const conditionConflict = this.checkConditionConflict(rule, existingRule);
        if (conditionConflict) {
          const key = `condition_${existingRule.id}`;
          conflictMap.set(key, conditionConflict);
        }
      }

      // Check action conflicts (only if we have overlapping conditions)
      if (this.hasOverlappingConditions(rule.condition, existingRule.condition)) {
        const actionConflict = this.checkActionConflict(rule, existingRule);
        if (actionConflict) {
          const key = `action_${existingRule.id}`;
          conflictMap.set(key, actionConflict);
        }
      }
    }

    return Array.from(conflictMap.values());
  }

  private checkPriorityConflict(rule1: IRule, rule2: IRule): RuleConflict | null {
    if (rule1.priority === rule2.priority && this.hasOverlappingConditions(rule1.condition, rule2.condition)) {
      return {
        rule1,
        rule2,
        type: 'priority',
        severity: 'high',
        description: `Rules have same priority (${rule1.priority}) and overlapping conditions`,
        resolution: 'priority'
      };
    }
    return null;
  }

  private checkConditionConflict(rule1: IRule, rule2: IRule): RuleConflict | null {
    if (this.hasOverlappingConditions(rule1.condition, rule2.condition) && 
        rule1.priority !== rule2.priority) {
      const severity = this.determineConflictSeverity(rule1, rule2);
      return {
        rule1,
        rule2,
        type: 'condition',
        severity,
        description: 'Rules have overlapping conditions that may trigger simultaneously',
        resolution: rule1.mandatory ? 'mandatory' : rule2.mandatory ? 'mandatory' : 'priority'
      };
    }
    return null;
  }

  private checkActionConflict(rule1: IRule, rule2: IRule): RuleConflict | null {
    if (rule1.action.mode !== rule2.action.mode && 
        this.hasOverlappingConditions(rule1.condition, rule2.condition)) {
      
      // If one rule is mandatory, it takes precedence
      if (rule1.mandatory && !rule2.mandatory) {
        return {
          rule1,
          rule2,
          type: 'action',
          severity: 'high',
          description: `Mandatory rule conflicts with non-mandatory rule`,
          resolution: 'mandatory'
        };
      }
      
      if (!rule1.mandatory && rule2.mandatory) {
        return {
          rule1,
          rule2,
          type: 'action',
          severity: 'high',
          description: `Non-mandatory rule conflicts with mandatory rule`,
          resolution: 'mandatory'
        };
      }

      return {
        rule1,
        rule2,
        type: 'action',
        severity: 'medium',
        description: `Rules suggest different trust modes (${rule1.action.mode} vs ${rule2.action.mode})`,
        resolution: 'priority'
      };
    }
    return null;
  }

  private hasOverlappingConditions(cond1: RuleCondition, cond2: RuleCondition): boolean {
    // Special cases
    if (cond1.type === 'always' || cond2.type === 'always') {
      return true;
    }

    // Different types generally don't overlap
    if (cond1.type !== cond2.type) {
      return false;
    }

    // Check specific condition types
    switch (cond1.type) {
      case 'network':
        return this.hasNetworkOverlap(cond1, cond2);
      case 'device':
        return this.hasDeviceOverlap(cond1, cond2);
      case 'time':
        return this.hasTimeOverlap(cond1, cond2);
      case 'composite':
        return this.hasCompositeOverlap(cond1, cond2);
      default:
        return false;
    }
  }

  private hasNetworkOverlap(cond1: RuleCondition, cond2: RuleCondition): boolean {
    if (!cond1.network || !cond2.network) {
      return true; // If either has no specific network conditions, they overlap
    }

    // Check trust overlap
    if (cond1.network.trust && cond2.network?.trust) {
      const overlap = cond1.network.trust.some(t => cond2.network!.trust!.includes(t));
      if (!overlap) return false;
    }

    // Check type overlap
    if (cond1.network.type && cond2.network?.type) {
      const overlap = cond1.network.type.some(t => cond2.network!.type!.includes(t));
      if (!overlap) return false;
    }

    return true;
  }

  private hasDeviceOverlap(cond1: RuleCondition, cond2: RuleCondition): boolean {
    if (!cond1.device || !cond2.device) {
      return true;
    }

    // Check device type overlap
    if (cond1.device.type && cond2.device?.type) {
      const overlap = cond1.device.type.some(t => cond2.device!.type!.includes(t));
      if (!overlap) return false;
    }

    // Check battery level overlap
    if (cond1.device.batteryLevel && cond2.device.batteryLevel) {
      const min1 = cond1.device.batteryLevel.min ?? 0;
      const max1 = cond1.device.batteryLevel.max ?? 1;
      const min2 = cond2.device.batteryLevel.min ?? 0;
      const max2 = cond2.device.batteryLevel.max ?? 1;
      
      if (max1 < min2 || max2 < min1) {
        return false;
      }
    }

    return true;
  }

  private hasTimeOverlap(cond1: RuleCondition, cond2: RuleCondition): boolean {
    if (!cond1.time || !cond2.time) {
      return true;
    }

    // Check day overlap
    if (cond1.time.days && cond2.time?.days) {
      const overlap = cond1.time.days.some(d => cond2.time!.days!.includes(d));
      if (!overlap) return false;
    }

    // Time range overlap would be more complex to implement
    return true;
  }

  private hasCompositeOverlap(cond1: RuleCondition, cond2: RuleCondition): boolean {
    // Simplified implementation
    if (!cond1.conditions || !cond2.conditions) {
      return false;
    }

    // For now, assume composite conditions might overlap
    return true;
  }

  private determineConflictSeverity(rule1: IRule, rule2: IRule): 'low' | 'medium' | 'high' {
    if (rule1.mandatory || rule2.mandatory) {
      return 'high';
    }
    if (Math.abs(rule1.priority - rule2.priority) > 100) {
      return 'low';
    }
    return 'medium';
  }
}