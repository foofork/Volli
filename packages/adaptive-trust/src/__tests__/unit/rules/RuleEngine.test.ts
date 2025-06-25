import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RuleEngine } from '../../../rules/RuleEngine.js';
import type { 
  IRuleEngine, 
  IRule, 
  RuleInput, 
  IContext, 
  RuleMatch,
  RuleConflict,
  ValidationIssue,
  TrustMode 
} from '../../../types/index.js';

describe('RuleEngine', () => {
  let ruleEngine: IRuleEngine;
  let mockContext: IContext;

  beforeEach(() => {
    ruleEngine = new RuleEngine('test-db');
    
    mockContext = {
      network: {
        type: 'wifi',
        trust: 'public',
        quality: 'good',
        isVPN: false,
        isTor: false
      },
      device: {
        type: 'mobile',
        platform: 'android',
        battery: {
          level: 0.8,
          charging: false
        },
        performance: {
          cpu: 0.3,
          memory: 0.5,
          storage: 0.7
        },
        screen: {
          locked: false
        }
      },
      behavior: {
        activityLevel: 'active',
        messageFrequency: 'medium',
        contactCount: 10,
        sessionDuration: 300000,
        lastActivity: new Date()
      },
      temporal: {
        timestamp: new Date(),
        timezone: 'UTC',
        isDaytime: true,
        isWeekend: false,
        hour: 14,
        dayOfWeek: 2
      }
    };
  });

  describe('Rule Management', () => {
    beforeEach(async () => {
      await ruleEngine.clearRules();
    });

    it('should add a new rule', async () => {
      const ruleInput: RuleInput = {
        name: 'Public WiFi Protection',
        condition: {
          type: 'network',
          network: {
            trust: ['public', 'hostile']
          }
        },
        action: {
          mode: 'private' as TrustMode,
          notify: true,
          reason: 'Connected to untrusted network'
        },
        priority: 100,
        enabled: true,
        mandatory: false
      };

      const rule = await ruleEngine.addRule(ruleInput);
      
      expect(rule).toMatchObject({
        id: expect.any(String),
        name: 'Public WiFi Protection',
        priority: 100,
        enabled: true,
        mandatory: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should validate rule input before adding', async () => {
      const invalidRule: RuleInput = {
        name: '',
        condition: {
          type: 'network' as const
        },
        action: {
          mode: 'invalid-mode' as any
        }
      };

      const errors = ruleEngine.validateRule(invalidRule);
      
      expect(errors).toHaveLength(3);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          severity: 'error'
        })
      );
    });

    it('should update an existing rule', async () => {
      const rule = await ruleEngine.addRule({
        name: 'Test Rule',
        condition: { type: 'always' },
        action: { mode: 'balanced' as TrustMode }
      });

      const updated = await ruleEngine.updateRule(rule.id, {
        name: 'Updated Rule',
        priority: 200
      });

      expect(updated.name).toBe('Updated Rule');
      expect(updated.priority).toBe(200);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(rule.updatedAt.getTime());
    });

    it('should delete a rule', async () => {
      const rule = await ruleEngine.addRule({
        name: 'Test Rule',
        condition: { type: 'always' },
        action: { mode: 'balanced' as TrustMode }
      });

      await ruleEngine.deleteRule(rule.id);
      const found = await ruleEngine.getRule(rule.id);
      
      expect(found).toBeNull();
    });

    it('should retrieve rules with filters', async () => {
      await Promise.all([
        ruleEngine.addRule({
          name: 'Rule 1',
          condition: { type: 'network' },
          action: { mode: 'private' as TrustMode },
          enabled: true
        }),
        ruleEngine.addRule({
          name: 'Rule 2',
          condition: { type: 'time' },
          action: { mode: 'convenience' as TrustMode },
          enabled: false
        }),
        ruleEngine.addRule({
          name: 'Rule 3',
          condition: { type: 'network' },
          action: { mode: 'private' as TrustMode },
          enabled: true,
          mandatory: true
        })
      ]);

      const enabledRules = await ruleEngine.getRules({ enabled: true });
      expect(enabledRules).toHaveLength(2);

      const mandatoryRules = await ruleEngine.getRules({ mandatory: true });
      expect(mandatoryRules).toHaveLength(1);

      const privateRules = await ruleEngine.getRules({ mode: 'private' as TrustMode });
      expect(privateRules).toHaveLength(2);
    });
  });

  describe('Rule Evaluation', () => {
    beforeEach(async () => {
      await ruleEngine.clearRules();
    });

    it('should evaluate rules against context', async () => {
      await ruleEngine.addRule({
        name: 'Public Network Rule',
        condition: {
          type: 'network',
          network: {
            trust: ['public']
          }
        },
        action: {
          mode: 'private' as TrustMode
        },
        priority: 100
      });

      const match = await ruleEngine.evaluate(mockContext);
      
      expect(match).toBeDefined();
      expect(match?.rule.name).toBe('Public Network Rule');
      expect(match?.matchScore).toBeGreaterThan(0);
    });

    it('should respect rule priority order', async () => {
      await ruleEngine.addRule({
        name: 'Low Priority Rule',
        condition: { type: 'always' },
        action: { mode: 'balanced' as TrustMode },
        priority: 10
      });

      await ruleEngine.addRule({
        name: 'High Priority Rule',
        condition: { type: 'always' },
        action: { mode: 'private' as TrustMode },
        priority: 100
      });

      const match = await ruleEngine.evaluate(mockContext);
      expect(match?.rule.name).toBe('High Priority Rule');
    });

    it('should handle composite conditions', async () => {
      await ruleEngine.addRule({
        name: 'Composite Rule',
        condition: {
          type: 'composite',
          operator: 'AND',
          conditions: [
            {
              type: 'network',
              network: { trust: ['public'] }
            },
            {
              type: 'device',
              device: { batteryLevel: { min: 0.5 } }
            }
          ]
        },
        action: { mode: 'private' as TrustMode }
      });

      const match = await ruleEngine.evaluate(mockContext);
      expect(match).toBeDefined();
      expect(match?.matchedConditions).toContain('network');
      expect(match?.matchedConditions).toContain('device');
    });

    it('should skip disabled rules', async () => {
      await ruleEngine.addRule({
        name: 'Disabled Rule',
        condition: { type: 'always' },
        action: { mode: 'airgap' as TrustMode },
        enabled: false
      });

      await ruleEngine.addRule({
        name: 'Enabled Rule',
        condition: { type: 'always' },
        action: { mode: 'balanced' as TrustMode },
        enabled: true
      });

      const match = await ruleEngine.evaluate(mockContext);
      expect(match?.rule.name).toBe('Enabled Rule');
    });

    it('should return all matching rules with evaluateAll', async () => {
      await Promise.all([
        ruleEngine.addRule({
          name: 'Rule 1',
          condition: { type: 'always' },
          action: { mode: 'balanced' as TrustMode },
          priority: 50
        }),
        ruleEngine.addRule({
          name: 'Rule 2',
          condition: {
            type: 'network',
            network: { trust: ['public'] }
          },
          action: { mode: 'private' as TrustMode },
          priority: 100
        }),
        ruleEngine.addRule({
          name: 'Rule 3',
          condition: {
            type: 'device',
            device: { type: ['mobile'] }
          },
          action: { mode: 'balanced' as TrustMode },
          priority: 75
        })
      ]);

      const matches = await ruleEngine.evaluateAll(mockContext);
      
      expect(matches).toHaveLength(3);
      expect(matches[0].rule.name).toBe('Rule 2');
      expect(matches[1].rule.name).toBe('Rule 3');
      expect(matches[2].rule.name).toBe('Rule 1');
    });
  });

  describe('Conflict Detection', () => {
    beforeEach(async () => {
      await ruleEngine.clearRules();
    });

    it('should detect priority conflicts', async () => {
      const rule1 = await ruleEngine.addRule({
        name: 'Rule 1',
        condition: { type: 'always' },
        action: { mode: 'private' as TrustMode },
        priority: 100
      });

      const rule2: IRule = {
        id: 'test-rule-2',
        name: 'Rule 2',
        condition: { type: 'always' },
        action: { mode: 'convenience' as TrustMode },
        priority: 100,
        enabled: true,
        mandatory: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const conflicts = await ruleEngine.detectConflicts(rule2);
      
      expect(conflicts.length).toBeGreaterThan(0);
      const priorityConflict = conflicts.find(c => c.type === 'priority');
      expect(priorityConflict).toBeDefined();
      expect(priorityConflict).toMatchObject({
        type: 'priority',
        severity: 'high',
        description: expect.stringContaining('same priority')
      });
    });

    it('should detect condition overlap conflicts', async () => {
      await ruleEngine.addRule({
        name: 'Broad Network Rule',
        condition: {
          type: 'network',
          network: { trust: ['public', 'hostile'] }
        },
        action: { mode: 'private' as TrustMode }
      });

      const newRule: IRule = {
        id: 'test-rule',
        name: 'Specific Network Rule',
        condition: {
          type: 'network',
          network: { trust: ['public'] }
        },
        action: { mode: 'balanced' as TrustMode },
        priority: 100,
        enabled: true,
        mandatory: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const conflicts = await ruleEngine.detectConflicts(newRule);
      
      expect(conflicts.length).toBeGreaterThan(0);
      // Should get action conflict since modes are different
      const actionConflict = conflicts.find(c => c.type === 'action');
      expect(actionConflict).toBeDefined();
    });

    it('should handle mandatory rule conflicts', async () => {
      await ruleEngine.addRule({
        name: 'Mandatory Rule',
        condition: { type: 'always' },
        action: { mode: 'private' as TrustMode },
        mandatory: true
      });

      const conflictingRule: IRule = {
        id: 'test-rule',
        name: 'Conflicting Rule',
        condition: { type: 'always' },
        action: { mode: 'convenience' as TrustMode },
        priority: 1000,
        enabled: true,
        mandatory: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const conflicts = await ruleEngine.detectConflicts(conflictingRule);
      
      expect(conflicts.length).toBeGreaterThan(0);
      const mandatoryConflict = conflicts.find(c => c.resolution === 'mandatory');
      expect(mandatoryConflict).toBeDefined();
    });
  });

  describe('Import/Export', () => {
    beforeEach(async () => {
      await ruleEngine.clearRules();
    });

    it('should export rules', async () => {
      const rules: RuleInput[] = [
        {
          name: 'Rule 1',
          condition: { type: 'always' },
          action: { mode: 'balanced' as TrustMode }
        },
        {
          name: 'Rule 2',
          condition: { type: 'network' },
          action: { mode: 'private' as TrustMode },
          enabled: false
        }
      ];

      await Promise.all(rules.map(r => ruleEngine.addRule(r)));
      
      const exported = await ruleEngine.exportRules();
      expect(exported).toHaveLength(2);
      expect(exported[0]).toHaveProperty('id');
      expect(exported[0]).toHaveProperty('createdAt');
    });

    it('should import rules', async () => {
      const rulesToImport: RuleInput[] = [
        {
          name: 'Imported Rule 1',
          condition: { type: 'always' },
          action: { mode: 'balanced' as TrustMode }
        },
        {
          name: 'Imported Rule 2',
          condition: { type: 'time' },
          action: { mode: 'private' as TrustMode }
        }
      ];

      const imported = await ruleEngine.importRules(rulesToImport);
      
      expect(imported).toHaveLength(2);
      expect(imported[0].name).toBe('Imported Rule 1');
      expect(imported[1].name).toBe('Imported Rule 2');
      
      const allRules = await ruleEngine.getRules();
      expect(allRules).toHaveLength(2);
    });

    it('should validate rules before importing', async () => {
      const invalidRules: RuleInput[] = [
        {
          name: '',
          condition: { type: 'always' },
          action: { mode: 'balanced' as TrustMode }
        }
      ];

      await expect(ruleEngine.importRules(invalidRules)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await ruleEngine.clearRules();
    });

    it('should handle large numbers of rules efficiently', async () => {
      const rules: RuleInput[] = [];
      for (let i = 0; i < 100; i++) {
        rules.push({
          name: `Rule ${i}`,
          condition: {
            type: 'composite',
            operator: 'OR',
            conditions: [
              { type: 'network', network: { trust: ['public'] } },
              { type: 'time', time: { hour: i % 24 } }
            ]
          },
          action: { mode: (i % 2 ? 'private' : 'balanced') as TrustMode },
          priority: i
        });
      }

      const start = performance.now();
      await ruleEngine.importRules(rules);
      const importTime = performance.now() - start;
      
      expect(importTime).toBeLessThan(1000);

      const evalStart = performance.now();
      await ruleEngine.evaluate(mockContext);
      const evalTime = performance.now() - evalStart;
      
      expect(evalTime).toBeLessThan(100);
    });
  });
});