import { Document, QueryBuilder as IQueryBuilder } from './types';
import { VaultStorage } from './storage';

/**
 * Query builder for vault documents
 */
export class VaultQueryBuilder implements IQueryBuilder {
  private conditions: string[] = [];
  private parameters: any[] = [];
  private orderByClause = '';
  private limitClause = '';
  private offsetClause = '';
  
  constructor(private storage: VaultStorage) {}
  
  /**
   * Add WHERE condition
   */
  where(field: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE', value: any): VaultQueryBuilder {
    const placeholder = this.addParameter(value);
    this.conditions.push(`${this.getFieldMapping(field)} ${operator} ${placeholder}`);
    return this;
  }
  
  /**
   * Add AND condition
   */
  and(field: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE', value: any): VaultQueryBuilder {
    if (this.conditions.length === 0) {
      throw new Error('Cannot use AND without a previous WHERE condition');
    }
    
    const placeholder = this.addParameter(value);
    this.conditions.push(`AND ${this.getFieldMapping(field)} ${operator} ${placeholder}`);
    return this;
  }
  
  /**
   * Add OR condition
   */
  or(field: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE', value: any): VaultQueryBuilder {
    if (this.conditions.length === 0) {
      throw new Error('Cannot use OR without a previous WHERE condition');
    }
    
    const placeholder = this.addParameter(value);
    this.conditions.push(`OR ${this.getFieldMapping(field)} ${operator} ${placeholder}`);
    return this;
  }
  
  /**
   * Add ORDER BY clause
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): VaultQueryBuilder {
    this.orderByClause = `ORDER BY ${this.getFieldMapping(field)} ${direction}`;
    return this;
  }
  
  /**
   * Add LIMIT clause
   */
  limit(count: number): VaultQueryBuilder {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }
  
  /**
   * Add OFFSET clause
   */
  offset(count: number): VaultQueryBuilder {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }
  
  /**
   * Execute the query
   */
  async execute(): Promise<Document[]> {
    const sql = this.buildSQL();
    return this.executeSQL(sql, this.parameters);
  }
  
  /**
   * Get SQL query string (for debugging)
   */
  toSQL(): { sql: string; parameters: any[] } {
    return {
      sql: this.buildSQL(),
      parameters: [...this.parameters]
    };
  }
  
  /**
   * Build the complete SQL query
   */
  private buildSQL(): string {
    let sql = `
      SELECT id, type, encrypted_data, nonce, checksum, size, created_at, updated_at, version, sync_status
      FROM documents
    `;
    
    if (this.conditions.length > 0) {
      sql += ` WHERE ${this.conditions.join(' ')}`;
    }
    
    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }
    
    if (this.limitClause) {
      sql += ` ${this.limitClause}`;
    }
    
    if (this.offsetClause) {
      sql += ` ${this.offsetClause}`;
    }
    
    return sql.trim();
  }
  
  /**
   * Execute SQL query and return decrypted documents
   */
  private async executeSQL(_sql: string, _parameters: any[]): Promise<Document[]> {
    // This is a simplified implementation
    // In the real VaultStorage class, we'd need to expose a query method
    // For now, we'll throw an error to indicate this needs to be implemented
    throw new Error('QueryBuilder.executeSQL() requires VaultStorage.query() method to be implemented');
  }
  
  /**
   * Add parameter and return placeholder
   */
  private addParameter(value: any): string {
    this.parameters.push(value);
    return '?';
  }
  
  /**
   * Map document fields to database columns
   */
  private getFieldMapping(field: string): string {
    const fieldMappings: Record<string, string> = {
      'id': 'id',
      'type': 'type',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'version': 'version',
      'syncStatus': 'sync_status'
    };
    
    return fieldMappings[field] || field;
  }
}

/**
 * Create a new query builder instance
 */
export function createQuery(storage: VaultStorage): VaultQueryBuilder {
  return new VaultQueryBuilder(storage);
}

/**
 * Predefined query helpers
 */
export class QueryHelpers {
  /**
   * Query for documents created after a specific date
   */
  static createdAfter(storage: VaultStorage, date: Date): VaultQueryBuilder {
    return new VaultQueryBuilder(storage).where('createdAt', '>', date.getTime());
  }
  
  /**
   * Query for documents updated after a specific date
   */
  static updatedAfter(storage: VaultStorage, date: Date): VaultQueryBuilder {
    return new VaultQueryBuilder(storage).where('updatedAt', '>', date.getTime());
  }
  
  /**
   * Query for documents of a specific type
   */
  static byType(storage: VaultStorage, type: string): VaultQueryBuilder {
    return new VaultQueryBuilder(storage).where('type', '=', type);
  }
  
  /**
   * Query for recently created documents
   */
  static recent(storage: VaultStorage, hours: number = 24): VaultQueryBuilder {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return new VaultQueryBuilder(storage)
      .where('createdAt', '>', cutoff)
      .orderBy('createdAt', 'DESC');
  }
  
  /**
   * Query for documents with specific sync status
   */
  static bySyncStatus(storage: VaultStorage, status: string): VaultQueryBuilder {
    return new VaultQueryBuilder(storage).where('syncStatus', '=', status);
  }
  
  /**
   * Query for documents that need syncing
   */
  static needsSync(storage: VaultStorage): VaultQueryBuilder {
    return new VaultQueryBuilder(storage)
      .where('syncStatus', '=', 'local')
      .or('syncStatus', '=', 'error');
  }
  
  /**
   * Query for documents by version range
   */
  static byVersionRange(storage: VaultStorage, minVersion: number, maxVersion?: number): VaultQueryBuilder {
    const query = new VaultQueryBuilder(storage).where('version', '>=', minVersion);
    
    if (maxVersion !== undefined) {
      query.and('version', '<=', maxVersion);
    }
    
    return query;
  }
}