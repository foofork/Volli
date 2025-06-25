import type { IRule, RuleInput, ValidationIssue, TrustMode } from '../types/index.js';

export class RuleValidator {
  private validTrustModes = ['convenience', 'balanced', 'private', 'airgap'];
  private validConditionTypes = ['network', 'contact', 'time', 'location', 'device', 'composite', 'always'];

  validateInput(rule: RuleInput): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate name
    if (!rule.name || rule.name.trim().length === 0) {
      issues.push({
        field: 'name',
        message: 'Rule name is required',
        severity: 'error'
      });
    }

    // Validate condition
    if (!rule.condition) {
      issues.push({
        field: 'condition',
        message: 'Rule condition is required',
        severity: 'error'
      });
    } else {
      const conditionIssues = this.validateCondition(rule.condition);
      issues.push(...conditionIssues);
    }

    // Validate action
    if (!rule.action) {
      issues.push({
        field: 'action',
        message: 'Rule action is required',
        severity: 'error'
      });
    } else {
      const actionIssues = this.validateAction(rule.action);
      issues.push(...actionIssues);
    }

    // Validate priority
    if (rule.priority !== undefined) {
      if (typeof rule.priority !== 'number' || rule.priority < 0 || rule.priority > 1000) {
        issues.push({
          field: 'priority',
          message: 'Priority must be a number between 0 and 1000',
          severity: 'error'
        });
      }
    }

    return issues;
  }

  validate(rule: IRule): ValidationIssue[] {
    return this.validateInput(rule);
  }

  private validateCondition(condition: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!condition.type) {
      issues.push({
        field: 'condition.type',
        message: 'Condition type is required',
        severity: 'error'
      });
      return issues;
    }

    if (!this.validConditionTypes.includes(condition.type)) {
      issues.push({
        field: 'condition.type',
        message: `Invalid condition type: ${condition.type}`,
        severity: 'error'
      });
      return issues;
    }

    // Validate type-specific fields
    switch (condition.type) {
      case 'network':
        if (!condition.network) {
          issues.push({
            field: 'condition.network',
            message: 'Network condition requires network properties',
            severity: 'warning'
          });
        }
        break;

      case 'composite':
        if (!condition.operator || !['AND', 'OR'].includes(condition.operator)) {
          issues.push({
            field: 'condition.operator',
            message: 'Composite condition requires AND or OR operator',
            severity: 'error'
          });
        }
        if (!condition.conditions || !Array.isArray(condition.conditions) || condition.conditions.length === 0) {
          issues.push({
            field: 'condition.conditions',
            message: 'Composite condition requires array of conditions',
            severity: 'error'
          });
        } else {
          // Recursively validate sub-conditions
          condition.conditions.forEach((subCondition: any, index: number) => {
            const subIssues = this.validateCondition(subCondition);
            subIssues.forEach(issue => {
              issues.push({
                ...issue,
                field: `condition.conditions[${index}].${issue.field}`
              });
            });
          });
        }
        break;

      case 'time':
        if (!condition.time) {
          issues.push({
            field: 'condition.time',
            message: 'Time condition requires time properties',
            severity: 'warning'
          });
        }
        break;

      case 'device':
        if (!condition.device) {
          issues.push({
            field: 'condition.device',
            message: 'Device condition requires device properties',
            severity: 'warning'
          });
        }
        break;

      case 'contact':
        if (!condition.contact) {
          issues.push({
            field: 'condition.contact',
            message: 'Contact condition requires contact properties',
            severity: 'warning'
          });
        }
        break;

      case 'location':
        if (!condition.location) {
          issues.push({
            field: 'condition.location',
            message: 'Location condition requires location properties',
            severity: 'warning'
          });
        }
        break;
    }

    return issues;
  }

  private validateAction(action: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!action.mode) {
      issues.push({
        field: 'action.mode',
        message: 'Action mode is required',
        severity: 'error'
      });
    } else if (!this.validTrustModes.includes(action.mode)) {
      issues.push({
        field: 'action.mode',
        message: `Invalid trust mode: ${action.mode}`,
        severity: 'error'
      });
    }

    if (action.notify !== undefined && typeof action.notify !== 'boolean') {
      issues.push({
        field: 'action.notify',
        message: 'Action notify must be a boolean',
        severity: 'warning'
      });
    }

    if (action.reason !== undefined && typeof action.reason !== 'string') {
      issues.push({
        field: 'action.reason',
        message: 'Action reason must be a string',
        severity: 'warning'
      });
    }

    return issues;
  }
}