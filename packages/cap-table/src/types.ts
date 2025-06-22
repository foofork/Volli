/**
 * Type definitions for Volli cap table management
 */

import { Decimal } from 'decimal.js';

/**
 * Share class types
 */
export enum ShareClassType {
  COMMON = 'common',
  PREFERRED = 'preferred',
  OPTIONS = 'options',
  WARRANTS = 'warrants',
  SAFE = 'safe',
  CONVERTIBLE_NOTE = 'convertible_note'
}

/**
 * Share class definition
 */
export interface ShareClass {
  id: string;
  name: string;
  type: ShareClassType;
  authorizedShares: Decimal;
  parValue: Decimal;
  preferences?: SharePreferences;
  votingRights: number; // Votes per share
  createdAt: number;
  updatedAt?: number;
}

/**
 * Preferred share preferences
 */
export interface SharePreferences {
  liquidationPreference: Decimal;
  liquidationMultiple: number;
  participationRights: boolean;
  dividendRate?: Decimal;
  conversionRatio?: Decimal;
  antidilutionProtection?: 'none' | 'weighted-average' | 'full-ratchet';
}

/**
 * Shareholder information
 */
export interface Shareholder {
  id: string;
  name: string;
  email?: string;
  type: 'individual' | 'entity';
  taxId?: string;
  address?: Address;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Address information
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Share ownership record
 */
export interface ShareholderEquity {
  id: string;
  shareholderId: string;
  shareClassId: string;
  shares: Decimal;
  pricePerShare: Decimal;
  issuedAt: number;
  vestingScheduleId?: string;
  metadata?: Record<string, any>;
}

/**
 * Vesting schedule
 */
export interface VestingSchedule {
  id: string;
  name: string;
  type: 'time-based' | 'milestone-based' | 'hybrid';
  cliffMonths?: number;
  vestingMonths?: number;
  vestingStartDate: number;
  milestones?: VestingMilestone[];
  createdAt: number;
}

/**
 * Vesting milestone
 */
export interface VestingMilestone {
  id: string;
  description: string;
  percentVested: Decimal;
  targetDate?: number;
  completedAt?: number;
}

/**
 * Transaction types
 */
export enum TransactionType {
  ISSUANCE = 'issuance',
  TRANSFER = 'transfer',
  CANCELLATION = 'cancellation',
  CONVERSION = 'conversion',
  EXERCISE = 'exercise',
  REPURCHASE = 'repurchase',
  SPLIT = 'split',
  DIVIDEND = 'dividend'
}

/**
 * Equity transaction
 */
export interface EquityTransaction {
  id: string;
  type: TransactionType;
  fromShareholderId?: string;
  toShareholderId?: string;
  shareClassId: string;
  shares: Decimal;
  pricePerShare?: Decimal;
  executedAt: number;
  documentIds?: string[];
  metadata?: Record<string, any>;
  signature?: TransactionSignature;
}

/**
 * Transaction signature
 */
export interface TransactionSignature {
  signedBy: string;
  signature: string;
  signedAt: number;
  publicKey: string;
}

/**
 * Company information
 */
export interface Company {
  id: string;
  name: string;
  incorporationDate: number;
  incorporationState: string;
  taxId: string;
  address: Address;
  shareClasses: ShareClass[];
  authorizedShares: Decimal;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Cap table summary
 */
export interface CapTableSummary {
  company: Company;
  shareholders: Shareholder[];
  equity: ShareholderEquity[];
  totalSharesIssued: Decimal;
  totalSharesAuthorized: Decimal;
  fullyDilutedShares: Decimal;
  ownership: OwnershipSummary[];
  valuation?: ValuationInfo;
  generatedAt: number;
}

/**
 * Ownership summary per shareholder
 */
export interface OwnershipSummary {
  shareholderId: string;
  shareholderName: string;
  shares: SharesByClass[];
  totalShares: Decimal;
  percentOwnership: Decimal;
  fullyDilutedPercent: Decimal;
  vestedShares: Decimal;
  unvestedShares: Decimal;
}

/**
 * Shares by class
 */
export interface SharesByClass {
  shareClassId: string;
  shareClassName: string;
  shares: Decimal;
  percentOfClass: Decimal;
}

/**
 * Valuation information
 */
export interface ValuationInfo {
  pricePerShare: Decimal;
  preMoneyValuation: Decimal;
  postMoneyValuation: Decimal;
  valuationDate: number;
  methodology?: string;
}

/**
 * Document types
 */
export enum DocumentType {
  STOCK_PURCHASE_AGREEMENT = 'stock_purchase_agreement',
  OPTION_AGREEMENT = 'option_agreement',
  WARRANT = 'warrant',
  SAFE = 'safe',
  CONVERTIBLE_NOTE = 'convertible_note',
  BOARD_RESOLUTION = 'board_resolution',
  SHAREHOLDER_CONSENT = 'shareholder_consent',
  OTHER = 'other'
}

/**
 * Legal document
 */
export interface LegalDocument {
  id: string;
  type: DocumentType;
  title: string;
  fileHash: string;
  encryptedContent?: string;
  parties: string[]; // Shareholder IDs
  executedDate?: number;
  expirationDate?: number;
  metadata?: Record<string, any>;
  signatures?: DocumentSignature[];
  createdAt: number;
}

/**
 * Document signature
 */
export interface DocumentSignature {
  shareholderId: string;
  signature: string;
  signedAt: number;
  ipAddress?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: 'company' | 'shareholder' | 'equity' | 'transaction' | 'document';
  entityId: string;
  changes?: Record<string, any>;
  performedBy: string;
  performedAt: number;
  metadata?: Record<string, any>;
}

/**
 * Cap table events
 */
export interface CapTableEvents {
  'shareholder:created': (shareholder: Shareholder) => void;
  'shareholder:updated': (shareholder: Shareholder) => void;
  'equity:issued': (equity: ShareholderEquity) => void;
  'equity:transferred': (transaction: EquityTransaction) => void;
  'equity:cancelled': (equity: ShareholderEquity) => void;
  'transaction:completed': (transaction: EquityTransaction) => void;
  'document:signed': (document: LegalDocument) => void;
  'vesting:updated': (equity: ShareholderEquity, vestedShares: Decimal) => void;
}