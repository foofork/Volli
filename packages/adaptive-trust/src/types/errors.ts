import type { ValidationIssue, RuleConflict } from './rules.js';

export class TrustError extends Error {
  public readonly code: string;
  public readonly details?: any;
  
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'TrustError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, TrustError.prototype);
  }
}

export class ValidationError extends TrustError {
  public readonly errors: ValidationIssue[];
  
  constructor(message: string, errors: ValidationIssue[]) {
    super(message, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ConflictError extends TrustError {
  public readonly conflicts: RuleConflict[];
  
  constructor(message: string, conflicts: RuleConflict[]) {
    super(message, 'CONFLICT_ERROR', { conflicts });
    this.name = 'ConflictError';
    this.conflicts = conflicts;
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class NetworkError extends TrustError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class StorageError extends TrustError {
  constructor(message: string, details?: any) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

export class ConfigurationError extends TrustError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class TimeoutError extends TrustError {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class NotImplementedError extends TrustError {
  constructor(feature: string) {
    super(`Feature not implemented: ${feature}`, 'NOT_IMPLEMENTED', { feature });
    this.name = 'NotImplementedError';
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}