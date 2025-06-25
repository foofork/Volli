import type { IRule, IContext, RuleMatch, RuleCondition } from '../types/index.js';

export class RuleEvaluator {
  async evaluateRules(rules: IRule[], context: IContext): Promise<RuleMatch[]> {
    const matches: RuleMatch[] = [];

    for (const rule of rules) {
      const result = await this.evaluateRule(rule, context);
      if (result) {
        matches.push(result);
      }
    }

    return matches;
  }

  private async evaluateRule(rule: IRule, context: IContext): Promise<RuleMatch | null> {
    const { isMatch, matchedConditions, score } = await this.evaluateCondition(rule.condition, context);
    
    if (isMatch) {
      return {
        rule,
        matchScore: score,
        matchedConditions
      };
    }

    return null;
  }

  private async evaluateCondition(
    condition: RuleCondition, 
    context: IContext
  ): Promise<{ isMatch: boolean; matchedConditions: string[]; score: number }> {
    switch (condition.type) {
      case 'always':
        return { isMatch: true, matchedConditions: ['always'], score: 1.0 };

      case 'network':
        return this.evaluateNetworkCondition(condition, context);

      case 'device':
        return this.evaluateDeviceCondition(condition, context);

      case 'time':
        return this.evaluateTimeCondition(condition, context);

      case 'contact':
        return this.evaluateContactCondition(condition, context);

      case 'location':
        return this.evaluateLocationCondition(condition, context);

      case 'composite':
        return this.evaluateCompositeCondition(condition, context);

      default:
        return { isMatch: false, matchedConditions: [], score: 0 };
    }
  }

  private async evaluateNetworkCondition(
    condition: RuleCondition,
    context: IContext
  ): Promise<{ isMatch: boolean; matchedConditions: string[]; score: number }> {
    if (!condition.network) {
      return { isMatch: false, matchedConditions: [], score: 0 };
    }

    let score = 0;
    let matches = 0;
    let total = 0;

    if (condition.network.type) {
      total++;
      if (condition.network.type.includes(context.network.type)) {
        matches++;
        score += 0.3;
      }
    }

    if (condition.network.trust) {
      total++;
      if (condition.network.trust.includes(context.network.trust)) {
        matches++;
        score += 0.4;
      }
    }

    if (condition.network.quality) {
      total++;
      if (condition.network.quality.includes(context.network.quality)) {
        matches++;
        score += 0.2;
      }
    }

    if (condition.network.isVPN !== undefined) {
      total++;
      if (condition.network.isVPN === context.network.isVPN) {
        matches++;
        score += 0.05;
      }
    }

    if (condition.network.isTor !== undefined) {
      total++;
      if (condition.network.isTor === context.network.isTor) {
        matches++;
        score += 0.05;
      }
    }

    const isMatch = total > 0 && matches === total;
    return { 
      isMatch, 
      matchedConditions: isMatch ? ['network'] : [], 
      score: isMatch ? score : 0 
    };
  }

  private async evaluateDeviceCondition(
    condition: RuleCondition,
    context: IContext
  ): Promise<{ isMatch: boolean; matchedConditions: string[]; score: number }> {
    if (!condition.device) {
      return { isMatch: false, matchedConditions: [], score: 0 };
    }

    let score = 0;
    let matches = 0;
    let total = 0;

    if (condition.device.type) {
      total++;
      if (condition.device.type.includes(context.device.type)) {
        matches++;
        score += 0.3;
      }
    }

    if (condition.device.batteryLevel) {
      total++;
      const batteryLevel = context.device.battery.level;
      const min = condition.device.batteryLevel.min ?? 0;
      const max = condition.device.batteryLevel.max ?? 1;
      if (batteryLevel >= min && batteryLevel <= max) {
        matches++;
        score += 0.4;
      }
    }

    if (condition.device.isCharging !== undefined) {
      total++;
      if (condition.device.isCharging === context.device.battery.charging) {
        matches++;
        score += 0.3;
      }
    }

    const isMatch = total > 0 && matches === total;
    return { 
      isMatch, 
      matchedConditions: isMatch ? ['device'] : [], 
      score: isMatch ? score : 0 
    };
  }

  private async evaluateTimeCondition(
    condition: RuleCondition,
    context: IContext
  ): Promise<{ isMatch: boolean; matchedConditions: string[]; score: number }> {
    if (!condition.time) {
      return { isMatch: false, matchedConditions: [], score: 0 };
    }

    let matches = 0;
    let total = 0;

    if (condition.time.days) {
      total++;
      if (condition.time.days.includes(context.temporal.dayOfWeek)) {
        matches++;
      }
    }

    if (condition.time.startTime && condition.time.endTime) {
      total++;
      const currentHour = context.temporal.hour;
      const startHour = parseInt(condition.time.startTime.split(':')[0]);
      const endHour = parseInt(condition.time.endTime.split(':')[0]);
      
      if (startHour <= endHour) {
        if (currentHour >= startHour && currentHour <= endHour) {
          matches++;
        }
      } else {
        // Handle overnight times
        if (currentHour >= startHour || currentHour <= endHour) {
          matches++;
        }
      }
    }

    const isMatch = total > 0 && matches === total;
    return { 
      isMatch, 
      matchedConditions: isMatch ? ['time'] : [], 
      score: isMatch ? 1.0 : 0 
    };
  }

  private async evaluateContactCondition(
    condition: RuleCondition,
    context: IContext
  ): Promise<{ isMatch: boolean; matchedConditions: string[]; score: number }> {
    // Simplified for now - would need contact context
    return { isMatch: false, matchedConditions: [], score: 0 };
  }

  private async evaluateLocationCondition(
    condition: RuleCondition,
    context: IContext
  ): Promise<{ isMatch: boolean; matchedConditions: string[]; score: number }> {
    // Simplified for now - would need location context
    return { isMatch: false, matchedConditions: [], score: 0 };
  }

  private async evaluateCompositeCondition(
    condition: RuleCondition,
    context: IContext
  ): Promise<{ isMatch: boolean; matchedConditions: string[]; score: number }> {
    if (!condition.conditions || !Array.isArray(condition.conditions)) {
      return { isMatch: false, matchedConditions: [], score: 0 };
    }

    const results = await Promise.all(
      condition.conditions.map(c => this.evaluateCondition(c, context))
    );

    const matchedConditions: string[] = [];
    let totalScore = 0;

    results.forEach(result => {
      if (result.isMatch) {
        matchedConditions.push(...result.matchedConditions);
        totalScore += result.score;
      }
    });

    const operator = condition.operator || 'AND';
    const isMatch = operator === 'AND' 
      ? results.every(r => r.isMatch)
      : results.some(r => r.isMatch);

    const avgScore = totalScore / results.length;

    return { 
      isMatch, 
      matchedConditions: isMatch ? matchedConditions : [], 
      score: isMatch ? avgScore : 0 
    };
  }
}