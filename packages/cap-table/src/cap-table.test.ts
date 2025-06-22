import { describe, it, expect, beforeEach } from 'vitest';
import { CapTable } from './cap-table';
import type { Company, ShareClass, Shareholder, EquityTransaction } from './types';
import { ShareClassType, TransactionType } from './types';

describe('CapTable', () => {
  let capTable: CapTable;
  let company: Company;
  
  beforeEach(() => {
    company = {
      id: 'test-company',
      name: 'Test Corp',
      incorporationDate: new Date('2025-01-01'),
      jurisdiction: 'Delaware',
      authorizedShares: {
        common: 10000000,
        preferred: 5000000
      },
      fiscalYearEnd: 'December 31'
    };
    
    capTable = new CapTable(company);
  });
  
  describe('initialization', () => {
    it('should initialize with company details', () => {
      expect(capTable).toBeDefined();
      expect(capTable.getCompany()).toEqual(company);
    });
  });
  
  describe('share classes', () => {
    it('should create share class', () => {
      const shareClass: ShareClass = {
        id: 'common-a',
        type: ShareClassType.COMMON,
        name: 'Common Stock Class A',
        authorizedShares: 5000000,
        parValue: 0.0001,
        votingRights: 1,
        liquidationPreference: 1,
        conversionRatio: 1
      };
      
      capTable.createShareClass(shareClass);
      const classes = capTable.getShareClasses();
      
      expect(classes).toHaveLength(1);
      expect(classes[0]).toEqual(shareClass);
    });
    
    it('should not allow duplicate share classes', () => {
      const shareClass: ShareClass = {
        id: 'common-a',
        type: ShareClassType.COMMON,
        name: 'Common Stock',
        authorizedShares: 1000000,
        parValue: 0.001
      };
      
      capTable.createShareClass(shareClass);
      
      expect(() => {
        capTable.createShareClass(shareClass);
      }).toThrow('Share class already exists');
    });
  });
  
  describe('equity issuance', () => {
    beforeEach(() => {
      const shareClass: ShareClass = {
        id: 'common-a',
        type: ShareClassType.COMMON,
        name: 'Common Stock',
        authorizedShares: 5000000,
        parValue: 0.0001
      };
      capTable.createShareClass(shareClass);
    });
    
    it('should issue equity to shareholder', () => {
      const shareholder: Shareholder = {
        id: 'sh-1',
        name: 'John Doe',
        email: 'john@example.com',
        type: 'individual',
        taxId: '123-45-6789'
      };
      
      const transaction: EquityTransaction = {
        id: 'tx-1',
        type: TransactionType.ISSUANCE,
        date: new Date(),
        shareholderId: shareholder.id,
        shareClassId: 'common-a',
        shares: 100000,
        pricePerShare: 1.00,
        documents: []
      };
      
      capTable.addShareholder(shareholder);
      capTable.issueEquity(transaction);
      
      const equity = capTable.getShareholderEquity(shareholder.id);
      expect(equity.size).toBe(1);
      expect(equity.get('common-a')?.shares).toBe(100000);
    });
    
    it('should track vesting schedules', () => {
      const shareholder: Shareholder = {
        id: 'sh-1',
        name: 'Employee',
        email: 'employee@example.com',
        type: 'individual'
      };
      
      capTable.addShareholder(shareholder);
      
      const vestingSchedule = capTable.createVestingSchedule({
        shareholderId: shareholder.id,
        shareClassId: 'common-a',
        totalShares: 48000,
        startDate: new Date('2025-01-01'),
        cliffMonths: 12,
        vestingMonths: 48,
        vestingType: 'monthly'
      });
      
      // Test vesting calculation
      const vestedShares = capTable.calculateVestedShares(
        vestingSchedule.id,
        new Date('2026-01-01') // 1 year later
      );
      
      expect(vestedShares).toBe(12000); // 25% after cliff
    });
  });
  
  describe('cap table calculations', () => {
    beforeEach(() => {
      // Set up share classes
      capTable.createShareClass({
        id: 'common',
        type: ShareClassType.COMMON,
        name: 'Common Stock',
        authorizedShares: 5000000,
        parValue: 0.0001
      });
      
      capTable.createShareClass({
        id: 'preferred',
        type: ShareClassType.PREFERRED,
        name: 'Series A Preferred',
        authorizedShares: 2000000,
        parValue: 0.0001,
        liquidationPreference: 1.5,
        conversionRatio: 1
      });
      
      // Add shareholders
      const founders = [
        { id: 'founder-1', name: 'Founder 1', type: 'individual' as const },
        { id: 'founder-2', name: 'Founder 2', type: 'individual' as const }
      ];
      
      const investor = {
        id: 'investor-1',
        name: 'VC Fund',
        type: 'entity' as const
      };
      
      founders.forEach(f => capTable.addShareholder(f));
      capTable.addShareholder(investor);
      
      // Issue equity
      capTable.issueEquity({
        id: 'tx-1',
        type: TransactionType.ISSUANCE,
        date: new Date(),
        shareholderId: 'founder-1',
        shareClassId: 'common',
        shares: 400000,
        pricePerShare: 0.0001
      });
      
      capTable.issueEquity({
        id: 'tx-2',
        type: TransactionType.ISSUANCE,
        date: new Date(),
        shareholderId: 'founder-2',
        shareClassId: 'common',
        shares: 400000,
        pricePerShare: 0.0001
      });
      
      capTable.issueEquity({
        id: 'tx-3',
        type: TransactionType.ISSUANCE,
        date: new Date(),
        shareholderId: 'investor-1',
        shareClassId: 'preferred',
        shares: 200000,
        pricePerShare: 5.00
      });
    });
    
    it('should calculate ownership percentages', () => {
      const ownership = capTable.calculateOwnership();
      
      expect(ownership.totalShares).toBe(1000000);
      expect(ownership.shareholderOwnership.get('founder-1')).toBeCloseTo(0.4, 2);
      expect(ownership.shareholderOwnership.get('founder-2')).toBeCloseTo(0.4, 2);
      expect(ownership.shareholderOwnership.get('investor-1')).toBeCloseTo(0.2, 2);
    });
    
    it('should calculate fully diluted ownership', () => {
      // Add options pool
      capTable.createShareClass({
        id: 'options',
        type: ShareClassType.OPTIONS,
        name: 'Stock Options',
        authorizedShares: 200000,
        parValue: 0
      });
      
      const ownership = capTable.calculateOwnership(true);
      
      // Total should include unissued options
      expect(ownership.totalShares).toBe(1200000);
      expect(ownership.shareholderOwnership.get('founder-1')).toBeCloseTo(0.333, 2);
    });
  });
});