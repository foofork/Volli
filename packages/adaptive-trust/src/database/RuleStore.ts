import Dexie, { Table } from 'dexie';
import type { IRule, RuleFilter } from '../types/index.js';

export class RuleStore {
  private db: Dexie;
  private rules: Table<IRule, string>;

  constructor(dbName: string = 'AdaptiveTrustDB') {
    this.db = new Dexie(dbName);
    this.db.version(1).stores({
      rules: 'id, name, priority, enabled, mandatory, [action.mode]'
    });
    this.rules = this.db.table('rules');
  }

  async save(rule: IRule): Promise<void> {
    await this.rules.put(rule);
  }

  async getById(id: string): Promise<IRule | null> {
    const rule = await this.rules.get(id);
    return rule || null;
  }

  async delete(id: string): Promise<void> {
    await this.rules.delete(id);
  }

  async query(filter?: RuleFilter): Promise<IRule[]> {
    let collection = this.rules.toCollection();

    if (filter) {
      if (filter.enabled !== undefined) {
        collection = collection.filter(rule => rule.enabled === filter.enabled);
      }
      if (filter.mandatory !== undefined) {
        collection = collection.filter(rule => rule.mandatory === filter.mandatory);
      }
      if (filter.mode !== undefined) {
        collection = collection.filter(rule => rule.action.mode === filter.mode);
      }
      if (filter.conditionType !== undefined) {
        collection = collection.filter(rule => rule.condition.type === filter.conditionType);
      }
    }

    const rules = await collection.toArray();

    if (filter?.limit !== undefined) {
      const offset = filter.offset || 0;
      return rules.slice(offset, offset + filter.limit);
    }

    return rules;
  }

  async clear(): Promise<void> {
    await this.rules.clear();
  }
}