import { v4 as uuidv4 } from 'uuid';
import { AuditLogEntry } from './types';

/**
 * Audit logging for cap table operations
 */
export class AuditLogger {
  private logs: AuditLogEntry[];
  private maxLogs: number;
  
  constructor(maxLogs: number = 10000) {
    this.logs = [];
    this.maxLogs = maxLogs;
  }
  
  /**
   * Log an action
   */
  logAction(
    action: string,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    performedBy: string,
    changes?: Record<string, any>,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: uuidv4(),
      action,
      entityType,
      entityId,
      changes,
      performedBy,
      performedAt: Date.now(),
      metadata
    };
    
    this.logs.push(entry);
    
    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    return entry;
  }
  
  /**
   * Get audit logs with filters
   */
  getLogs(filters?: {
    entityType?: AuditLogEntry['entityType'];
    entityId?: string;
    performedBy?: string;
    action?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): AuditLogEntry[] {
    let logs = [...this.logs];
    
    if (filters) {
      if (filters.entityType) {
        logs = logs.filter(log => log.entityType === filters.entityType);
      }
      
      if (filters.entityId) {
        logs = logs.filter(log => log.entityId === filters.entityId);
      }
      
      if (filters.performedBy) {
        logs = logs.filter(log => log.performedBy === filters.performedBy);
      }
      
      if (filters.action) {
        logs = logs.filter(log => log.action.includes(filters.action!));
      }
      
      if (filters.startDate) {
        logs = logs.filter(log => log.performedAt >= filters.startDate!);
      }
      
      if (filters.endDate) {
        logs = logs.filter(log => log.performedAt <= filters.endDate!);
      }
    }
    
    // Sort by date descending
    logs.sort((a, b) => b.performedAt - a.performedAt);
    
    // Apply limit
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }
    
    return logs;
  }
  
  /**
   * Get entity history
   */
  getEntityHistory(entityType: AuditLogEntry['entityType'], entityId: string): AuditLogEntry[] {
    return this.getLogs({ entityType, entityId });
  }
  
  /**
   * Get user activity
   */
  getUserActivity(userId: string): AuditLogEntry[] {
    return this.getLogs({ performedBy: userId });
  }
  
  /**
   * Export audit logs
   */
  exportLogs(): AuditLogEntry[] {
    return [...this.logs];
  }
  
  /**
   * Import audit logs
   */
  importLogs(logs: AuditLogEntry[]): void {
    this.logs = logs;
  }
  
  /**
   * Clear old logs
   */
  clearOldLogs(daysToKeep: number): number {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const originalLength = this.logs.length;
    
    this.logs = this.logs.filter(log => log.performedAt >= cutoffDate);
    
    return originalLength - this.logs.length;
  }
}