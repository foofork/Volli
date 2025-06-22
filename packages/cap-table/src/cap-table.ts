import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js';
import { 
  Company, 
  Shareholder, 
  ShareholderEquity, 
  EquityTransaction,
  TransactionType,
  CapTableSummary,
  OwnershipSummary,
  SharesByClass,
  VestingSchedule,
  ShareClassType
} from './types';

/**
 * Cap table management for equity tracking
 */
export class CapTable extends EventEmitter {
  private company: Company;
  private shareholders: Map<string, Shareholder>;
  private equity: Map<string, ShareholderEquity>;
  private transactions: EquityTransaction[];
  private vestingSchedules: Map<string, VestingSchedule>;
  
  constructor(company: Company) {
    super();
    this.company = company;
    // Initialize shareClasses if not provided
    if (!this.company.shareClasses) {
      this.company.shareClasses = [];
    }
    this.shareholders = new Map();
    this.equity = new Map();
    this.transactions = [];
    this.vestingSchedules = new Map();
  }
  
  /**
   * Get company details
   */
  getCompany(): Company {
    return this.company;
  }
  
  /**
   * Create a new share class
   */
  createShareClass(shareClass: any): void {
    // Check if share class already exists
    if (this.company.shareClasses.some(sc => sc.id === shareClass.id)) {
      throw new Error('Share class already exists');
    }
    // Add to company's share classes
    this.company.shareClasses.push(shareClass);
    this.emit('shareClass:created', shareClass);
  }
  
  /**
   * Get all share classes
   */
  getShareClasses(): any[] {
    return this.company.shareClasses;
  }
  
  /**
   * Get all shareholders
   */
  getShareholders(): Shareholder[] {
    return Array.from(this.shareholders.values());
  }
  
  /**
   * Add a new shareholder
   */
  addShareholder(shareholder: Shareholder): void {
    if (this.shareholders.has(shareholder.id)) {
      throw new Error(`Shareholder ${shareholder.id} already exists`);
    }
    
    this.shareholders.set(shareholder.id, shareholder);
    this.emit('shareholder:created', shareholder);
  }
  
  /**
   * Update shareholder information
   */
  updateShareholder(shareholderId: string, updates: Partial<Shareholder>): void {
    const shareholder = this.shareholders.get(shareholderId);
    if (!shareholder) {
      throw new Error(`Shareholder ${shareholderId} not found`);
    }
    
    const updated = {
      ...shareholder,
      ...updates,
      id: shareholder.id, // Prevent ID changes
      updatedAt: Date.now()
    };
    
    this.shareholders.set(shareholderId, updated);
    this.emit('shareholder:updated', updated);
  }
  
  /**
   * Issue new shares
   */
  async issueShares(
    shareholderId: string,
    shareClassId: string,
    shares: Decimal,
    pricePerShare: Decimal,
    vestingScheduleId?: string
  ): Promise<ShareholderEquity> {
    // Validate shareholder
    const shareholder = this.shareholders.get(shareholderId);
    if (!shareholder) {
      throw new Error(`Shareholder ${shareholderId} not found`);
    }
    
    // Validate share class
    const shareClass = this.company.shareClasses.find(sc => sc.id === shareClassId);
    if (!shareClass) {
      throw new Error(`Share class ${shareClassId} not found`);
    }
    
    // Check authorized shares
    const totalIssued = this.getTotalSharesIssued(shareClassId);
    if (totalIssued.plus(shares).gt(shareClass.authorizedShares)) {
      throw new Error('Insufficient authorized shares');
    }
    
    // Validate vesting schedule if provided
    if (vestingScheduleId && !this.vestingSchedules.has(vestingScheduleId)) {
      throw new Error(`Vesting schedule ${vestingScheduleId} not found`);
    }
    
    // Create equity record
    const equity: ShareholderEquity = {
      id: uuidv4(),
      shareholderId,
      shareClassId,
      shares,
      pricePerShare,
      issuedAt: Date.now(),
      vestingScheduleId
    };
    
    this.equity.set(equity.id, equity);
    
    // Create transaction record
    const transaction: EquityTransaction = {
      id: uuidv4(),
      type: TransactionType.ISSUANCE,
      toShareholderId: shareholderId,
      shareClassId,
      shares,
      pricePerShare,
      executedAt: Date.now()
    };
    
    this.transactions.push(transaction);
    
    this.emit('equity:issued', equity);
    this.emit('transaction:completed', transaction);
    
    return equity;
  }
  
  /**
   * Transfer shares between shareholders
   */
  async transferShares(
    fromShareholderId: string,
    toShareholderId: string,
    shareClassId: string,
    shares: Decimal,
    pricePerShare?: Decimal
  ): Promise<EquityTransaction> {
    // Validate shareholders
    if (!this.shareholders.has(fromShareholderId)) {
      throw new Error(`From shareholder ${fromShareholderId} not found`);
    }
    if (!this.shareholders.has(toShareholderId)) {
      throw new Error(`To shareholder ${toShareholderId} not found`);
    }
    
    // Check available shares
    const availableShares = this.getShareholderShares(fromShareholderId, shareClassId);
    if (availableShares.lt(shares)) {
      throw new Error('Insufficient shares for transfer');
    }
    
    // Update equity records
    const fromEquity = Array.from(this.equity.values())
      .filter(e => e.shareholderId === fromShareholderId && e.shareClassId === shareClassId);
    
    let remainingShares = shares;
    for (const equity of fromEquity) {
      if (remainingShares.eq(0)) break;
      
      if (equity.shares.lte(remainingShares)) {
        // Transfer entire equity record
        remainingShares = remainingShares.minus(equity.shares);
        equity.shareholderId = toShareholderId;
      } else {
        // Split equity record
        const transferredEquity: ShareholderEquity = {
          ...equity,
          id: uuidv4(),
          shareholderId: toShareholderId,
          shares: remainingShares
        };
        equity.shares = equity.shares.minus(remainingShares);
        this.equity.set(transferredEquity.id, transferredEquity);
        remainingShares = new Decimal(0);
      }
    }
    
    // Create transaction record
    const transaction: EquityTransaction = {
      id: uuidv4(),
      type: TransactionType.TRANSFER,
      fromShareholderId,
      toShareholderId,
      shareClassId,
      shares,
      pricePerShare,
      executedAt: Date.now()
    };
    
    this.transactions.push(transaction);
    
    this.emit('equity:transferred', transaction);
    this.emit('transaction:completed', transaction);
    
    return transaction;
  }
  
  /**
   * Cancel shares
   */
  async cancelShares(
    shareholderId: string,
    shareClassId: string,
    shares: Decimal
  ): Promise<EquityTransaction> {
    // Check available shares
    const availableShares = this.getShareholderShares(shareholderId, shareClassId);
    if (availableShares.lt(shares)) {
      throw new Error('Insufficient shares to cancel');
    }
    
    // Update equity records
    const shareholderEquity = Array.from(this.equity.values())
      .filter(e => e.shareholderId === shareholderId && e.shareClassId === shareClassId);
    
    let remainingShares = shares;
    for (const equity of shareholderEquity) {
      if (remainingShares.eq(0)) break;
      
      if (equity.shares.lte(remainingShares)) {
        // Cancel entire equity record
        remainingShares = remainingShares.minus(equity.shares);
        this.equity.delete(equity.id);
        this.emit('equity:cancelled', equity);
      } else {
        // Reduce shares
        equity.shares = equity.shares.minus(remainingShares);
        remainingShares = new Decimal(0);
      }
    }
    
    // Create transaction record
    const transaction: EquityTransaction = {
      id: uuidv4(),
      type: TransactionType.CANCELLATION,
      fromShareholderId: shareholderId,
      shareClassId,
      shares,
      executedAt: Date.now()
    };
    
    this.transactions.push(transaction);
    this.emit('transaction:completed', transaction);
    
    return transaction;
  }
  
  /**
   * Add vesting schedule
   */
  addVestingSchedule(schedule: VestingSchedule): void {
    this.vestingSchedules.set(schedule.id, schedule);
  }
  
  /**
   * Issue equity (test compatibility)
   */
  issueEquity(transaction: any): void {
    // Add shareholder if not exists
    const shareholderId = transaction.toShareholderId || transaction.shareholderId;
    if (!shareholderId) {
      throw new Error('Shareholder ID required');
    }
    
    // Create equity record
    const equity: ShareholderEquity = {
      id: uuidv4(),
      shareholderId: shareholderId,
      shareClassId: transaction.shareClassId,
      shares: new Decimal(transaction.shares),
      pricePerShare: new Decimal(transaction.pricePerShare || 0),
      issuedAt: Date.now()
    };
    
    this.equity.set(equity.id, equity);
    
    // Convert to standard transaction format
    const standardTransaction: EquityTransaction = {
      id: transaction.id || uuidv4(),
      type: transaction.type || TransactionType.ISSUANCE,
      toShareholderId: shareholderId,
      shareClassId: transaction.shareClassId,
      shares: new Decimal(transaction.shares),
      pricePerShare: transaction.pricePerShare ? new Decimal(transaction.pricePerShare) : undefined,
      executedAt: transaction.date ? transaction.date.getTime() : Date.now()
    };
    
    this.transactions.push(standardTransaction);
    this.emit('equity:issued', equity);
  }
  
  /**
   * Get shareholder equity (test compatibility)
   */
  getShareholderEquity(shareholderId: string): Map<string, { shares: number }> {
    const result = new Map<string, { shares: number }>();
    
    for (const [_, equity] of this.equity) {
      if (equity.shareholderId === shareholderId) {
        const existing = result.get(equity.shareClassId);
        if (existing) {
          existing.shares += equity.shares.toNumber();
        } else {
          result.set(equity.shareClassId, { shares: equity.shares.toNumber() });
        }
      }
    }
    
    return result;
  }
  
  /**
   * Create vesting schedule (test compatibility)
   */
  createVestingSchedule(params: {
    shareholderId: string;
    shareClassId: string;
    totalShares: number;
    startDate: Date;
    cliffMonths: number;
    vestingMonths: number;
    vestingType: string;
  }): VestingSchedule {
    const schedule: VestingSchedule = {
      id: uuidv4(),
      name: `Vesting Schedule for ${params.shareholderId}`,
      type: 'time-based',
      vestingStartDate: params.startDate.getTime(),
      vestingMonths: params.vestingMonths,
      cliffMonths: params.cliffMonths,
      createdAt: Date.now()
    };
    
    this.addVestingSchedule(schedule);
    
    // Create equity record with vesting
    const equity: ShareholderEquity = {
      id: uuidv4(),
      shareholderId: params.shareholderId,
      shareClassId: params.shareClassId,
      shares: new Decimal(params.totalShares),
      pricePerShare: new Decimal(0),
      issuedAt: Date.now(),
      vestingScheduleId: schedule.id
    };
    
    this.equity.set(equity.id, equity);
    
    return schedule;
  }
  
  /**
   * Calculate vested shares for an equity record
   */
  calculateVestedShares(scheduleIdOrEquityId: string, asOfDate?: number | Date): Decimal | number {
    // First check if it's a vesting schedule ID
    const schedule = this.vestingSchedules.get(scheduleIdOrEquityId);
    if (schedule) {
      // Find equity associated with this schedule
      const equity = Array.from(this.equity.values()).find(e => e.vestingScheduleId === scheduleIdOrEquityId);
      if (!equity) {
        return 0;
      }
      
      const currentDate = asOfDate instanceof Date ? asOfDate.getTime() : (asOfDate || Date.now());
      
      if (schedule.type === 'time-based') {
        // More accurate month calculation
        const startDate = new Date(schedule.vestingStartDate);
        const checkDate = new Date(currentDate);
        
        // Calculate months difference
        let monthsSinceStart = (checkDate.getFullYear() - startDate.getFullYear()) * 12;
        monthsSinceStart += checkDate.getMonth() - startDate.getMonth();
        
        // Add fractional month for days
        const dayDiff = checkDate.getDate() - startDate.getDate();
        if (dayDiff > 0) {
          monthsSinceStart += dayDiff / 30;
        }
        
        // Check cliff
        if (schedule.cliffMonths && monthsSinceStart < schedule.cliffMonths) {
          return 0;
        }
        
        // Calculate vested portion
        if (schedule.vestingMonths) {
          const vestedPortion = Math.min(monthsSinceStart / schedule.vestingMonths, 1);
          return Math.floor(equity.shares.toNumber() * vestedPortion);
        }
      }
      
      return 0;
    }
    
    // Otherwise, treat as equity ID
    const equity = this.equity.get(scheduleIdOrEquityId);
    if (!equity || !equity.vestingScheduleId) {
      return equity ? equity.shares : new Decimal(0);
    }
    
    const vestSchedule = this.vestingSchedules.get(equity.vestingScheduleId);
    if (!vestSchedule) {
      return equity.shares; // No schedule found, assume fully vested
    }
    
    const currentDate = asOfDate instanceof Date ? asOfDate.getTime() : (asOfDate || Date.now());
    
    if (vestSchedule.type === 'time-based') {
      const monthsSinceStart = (currentDate - vestSchedule.vestingStartDate) / (30 * 24 * 60 * 60 * 1000);
      
      // Check cliff
      if (vestSchedule.cliffMonths && monthsSinceStart < vestSchedule.cliffMonths) {
        return new Decimal(0);
      }
      
      // Calculate vested portion
      if (vestSchedule.vestingMonths) {
        const vestedPortion = Math.min(monthsSinceStart / vestSchedule.vestingMonths, 1);
        return equity.shares.mul(vestedPortion);
      }
    } else if (vestSchedule.type === 'milestone-based' && vestSchedule.milestones) {
      // Calculate based on completed milestones
      const completedMilestones = vestSchedule.milestones.filter(m => m.completedAt && m.completedAt <= currentDate);
      const totalPercent = completedMilestones.reduce((sum, m) => sum.plus(m.percentVested), new Decimal(0));
      return equity.shares.mul(totalPercent).div(100);
    }
    
    return new Decimal(0);
  }
  
  /**
   * Get shareholder's shares by class
   */
  getShareholderShares(shareholderId: string, shareClassId?: string): Decimal {
    const equityRecords = Array.from(this.equity.values())
      .filter(e => e.shareholderId === shareholderId && (!shareClassId || e.shareClassId === shareClassId));
    
    return equityRecords.reduce((total, e) => total.plus(e.shares), new Decimal(0));
  }
  
  /**
   * Get total shares issued for a class
   */
  getTotalSharesIssued(shareClassId?: string): Decimal {
    const equityRecords = Array.from(this.equity.values())
      .filter(e => !shareClassId || e.shareClassId === shareClassId);
    
    return equityRecords.reduce((total, e) => total.plus(e.shares), new Decimal(0));
  }
  
  /**
   * Generate cap table summary
   */
  generateSummary(): CapTableSummary {
    const totalSharesIssued = this.getTotalSharesIssued();
    const totalSharesAuthorized = this.company.shareClasses.reduce(
      (total, sc) => total.plus(sc.authorizedShares),
      new Decimal(0)
    );
    
    // Calculate fully diluted shares (including options, warrants, SAFEs, etc.)
    const fullyDilutedShares = this.calculateFullyDilutedShares();
    
    // Generate ownership summaries
    const ownership: OwnershipSummary[] = [];
    
    for (const [shareholderId, shareholder] of this.shareholders) {
      const sharesByClass: SharesByClass[] = [];
      let totalShares = new Decimal(0);
      let vestedShares = new Decimal(0);
      
      for (const shareClass of this.company.shareClasses) {
        const shares = this.getShareholderShares(shareholderId, shareClass.id);
        if (shares.gt(0)) {
          const classTotal = this.getTotalSharesIssued(shareClass.id);
          sharesByClass.push({
            shareClassId: shareClass.id,
            shareClassName: shareClass.name,
            shares,
            percentOfClass: shares.div(classTotal).mul(100)
          });
          totalShares = totalShares.plus(shares);
          
          // Calculate vested shares for this class
          const equityRecords = Array.from(this.equity.values())
            .filter(e => e.shareholderId === shareholderId && e.shareClassId === shareClass.id);
          
          for (const equity of equityRecords) {
            vestedShares = vestedShares.plus(this.calculateVestedShares(equity.id));
          }
        }
      }
      
      ownership.push({
        shareholderId,
        shareholderName: shareholder.name,
        shares: sharesByClass,
        totalShares,
        percentOwnership: totalShares.div(totalSharesIssued).mul(100),
        fullyDilutedPercent: totalShares.div(fullyDilutedShares).mul(100),
        vestedShares,
        unvestedShares: totalShares.minus(vestedShares)
      });
    }
    
    // Sort by ownership percentage
    ownership.sort((a, b) => b.percentOwnership.minus(a.percentOwnership).toNumber());
    
    return {
      company: this.company,
      shareholders: Array.from(this.shareholders.values()),
      equity: Array.from(this.equity.values()),
      totalSharesIssued,
      totalSharesAuthorized,
      fullyDilutedShares,
      ownership,
      generatedAt: Date.now()
    };
  }
  
  /**
   * Calculate ownership (test compatibility)
   */
  calculateOwnership(fullyDiluted?: boolean): {
    totalShares: number;
    shareholderOwnership: Map<string, number>;
  } {
    let totalShares = 0;
    const shareholderOwnership = new Map<string, number>();
    
    if (fullyDiluted) {
      // Include all authorized shares for options
      for (const shareClass of this.company.shareClasses) {
        if (shareClass.type === ShareClassType.OPTIONS || 
            shareClass.type === ShareClassType.WARRANTS) {
          totalShares += shareClass.authorizedShares instanceof Decimal 
            ? shareClass.authorizedShares.toNumber() 
            : shareClass.authorizedShares;
        }
      }
    }
    
    // Calculate actual issued shares
    for (const [_, equity] of this.equity) {
      totalShares += equity.shares.toNumber();
      
      const existing = shareholderOwnership.get(equity.shareholderId) || 0;
      shareholderOwnership.set(equity.shareholderId, existing + equity.shares.toNumber());
    }
    
    // Convert to percentages
    const percentageOwnership = new Map<string, number>();
    for (const [shareholderId, shares] of shareholderOwnership) {
      percentageOwnership.set(shareholderId, shares / totalShares);
    }
    
    return {
      totalShares,
      shareholderOwnership: percentageOwnership
    };
  }
  
  /**
   * Calculate fully diluted shares
   */
  private calculateFullyDilutedShares(): Decimal {
    let total = new Decimal(0);
    
    for (const shareClass of this.company.shareClasses) {
      const issued = this.getTotalSharesIssued(shareClass.id);
      
      if (shareClass.type === ShareClassType.COMMON || shareClass.type === ShareClassType.PREFERRED) {
        total = total.plus(issued);
      } else if (shareClass.type === ShareClassType.OPTIONS || shareClass.type === ShareClassType.WARRANTS) {
        // Include all authorized options/warrants
        total = total.plus(shareClass.authorizedShares);
      } else if (shareClass.type === ShareClassType.SAFE || shareClass.type === ShareClassType.CONVERTIBLE_NOTE) {
        // For SAFEs and convertibles, estimate conversion
        if (shareClass.preferences?.conversionRatio) {
          total = total.plus(issued.mul(shareClass.preferences.conversionRatio));
        } else {
          // Default assumption: 1:1 conversion
          total = total.plus(issued);
        }
      }
    }
    
    return total;
  }
  
  /**
   * Get transaction history
   */
  getTransactionHistory(filters?: {
    shareholderId?: string;
    shareClassId?: string;
    type?: TransactionType;
    startDate?: number;
    endDate?: number;
  }): EquityTransaction[] {
    let transactions = [...this.transactions];
    
    if (filters) {
      if (filters.shareholderId) {
        transactions = transactions.filter(t => 
          t.fromShareholderId === filters.shareholderId || 
          t.toShareholderId === filters.shareholderId
        );
      }
      
      if (filters.shareClassId) {
        transactions = transactions.filter(t => t.shareClassId === filters.shareClassId);
      }
      
      if (filters.type) {
        transactions = transactions.filter(t => t.type === filters.type);
      }
      
      if (filters.startDate) {
        transactions = transactions.filter(t => t.executedAt >= filters.startDate!);
      }
      
      if (filters.endDate) {
        transactions = transactions.filter(t => t.executedAt <= filters.endDate!);
      }
    }
    
    // Sort by execution date
    transactions.sort((a, b) => b.executedAt - a.executedAt);
    
    return transactions;
  }
  
  /**
   * Export cap table data
   */
  exportData(): {
    company: Company;
    shareholders: Shareholder[];
    equity: ShareholderEquity[];
    transactions: EquityTransaction[];
    vestingSchedules: VestingSchedule[];
  } {
    return {
      company: this.company,
      shareholders: Array.from(this.shareholders.values()),
      equity: Array.from(this.equity.values()),
      transactions: this.transactions,
      vestingSchedules: Array.from(this.vestingSchedules.values())
    };
  }
  
  /**
   * Import cap table data
   */
  static fromExport(data: {
    company: Company;
    shareholders: Shareholder[];
    equity: ShareholderEquity[];
    transactions: EquityTransaction[];
    vestingSchedules: VestingSchedule[];
  }): CapTable {
    const capTable = new CapTable(data.company);
    
    // Import shareholders
    for (const shareholder of data.shareholders) {
      capTable.shareholders.set(shareholder.id, shareholder);
    }
    
    // Import equity
    for (const equity of data.equity) {
      capTable.equity.set(equity.id, equity);
    }
    
    // Import transactions
    capTable.transactions = data.transactions;
    
    // Import vesting schedules
    for (const schedule of data.vestingSchedules) {
      capTable.vestingSchedules.set(schedule.id, schedule);
    }
    
    return capTable;
  }
}