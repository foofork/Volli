import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { 
  LegalDocument, 
  DocumentType, 
  DocumentSignature
} from './types';
// import { hashData } from '@volli/vault-core';
// Temporary hash function until vault-core types are available
function hashData(data: Uint8Array): Uint8Array {
  // Simple hash implementation for now
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest();
}

/**
 * Document management for cap table
 */
export class DocumentManager extends EventEmitter {
  private documents: Map<string, LegalDocument>;
  
  constructor() {
    super();
    this.documents = new Map();
  }
  
  /**
   * Create a new document
   */
  createDocument(
    type: DocumentType,
    title: string,
    content: Uint8Array,
    parties: string[],
    metadata?: Record<string, any>
  ): LegalDocument {
    const fileHash = Buffer.from(hashData(content)).toString('hex');
    
    const document: LegalDocument = {
      id: uuidv4(),
      type,
      title,
      fileHash,
      parties,
      metadata,
      signatures: [],
      createdAt: Date.now()
    };
    
    this.documents.set(document.id, document);
    this.emit('document:created', document);
    
    return document;
  }
  
  /**
   * Get document by ID
   */
  getDocument(documentId: string): LegalDocument | null {
    return this.documents.get(documentId) || null;
  }
  
  /**
   * Add signature to document
   */
  async addSignature(
    documentId: string,
    shareholderId: string,
    signature: string,
    ipAddress?: string
  ): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    // Check if party to the document
    if (!document.parties.includes(shareholderId)) {
      throw new Error('Shareholder is not a party to this document');
    }
    
    // Check if already signed
    if (document.signatures?.find(s => s.shareholderId === shareholderId)) {
      throw new Error('Document already signed by this shareholder');
    }
    
    const documentSignature: DocumentSignature = {
      shareholderId,
      signature,
      signedAt: Date.now(),
      ipAddress
    };
    
    document.signatures = [...(document.signatures || []), documentSignature];
    
    // Check if fully executed
    const allPartiesSigned = document.parties.every(partyId =>
      document.signatures?.some(s => s.shareholderId === partyId)
    );
    
    if (allPartiesSigned && !document.executedDate) {
      document.executedDate = Date.now();
      this.emit('document:executed', document);
    }
    
    this.emit('document:signed', document);
  }
  
  /**
   * Verify document signatures
   */
  verifySignatures(documentId: string): boolean {
    const document = this.documents.get(documentId);
    if (!document || !document.signatures) {
      return false;
    }
    
    // In a real implementation, this would verify cryptographic signatures
    // For now, just check that all parties have signed
    return document.parties.every(partyId =>
      document.signatures?.some(s => s.shareholderId === partyId)
    );
  }
  
  /**
   * Get documents by shareholder
   */
  getShareholderDocuments(shareholderId: string): LegalDocument[] {
    return Array.from(this.documents.values())
      .filter(doc => doc.parties.includes(shareholderId));
  }
  
  /**
   * Get documents by type
   */
  getDocumentsByType(type: DocumentType): LegalDocument[] {
    return Array.from(this.documents.values())
      .filter(doc => doc.type === type);
  }
  
  /**
   * Check if document is expired
   */
  isDocumentExpired(documentId: string): boolean {
    const document = this.documents.get(documentId);
    if (!document || !document.expirationDate) {
      return false;
    }
    
    return Date.now() > document.expirationDate;
  }
  
  /**
   * Get execution status
   */
  getExecutionStatus(documentId: string): {
    isExecuted: boolean;
    signedParties: string[];
    unsignedParties: string[];
    percentComplete: number;
  } {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    const signedParties = document.signatures?.map(s => s.shareholderId) || [];
    const unsignedParties = document.parties.filter(p => !signedParties.includes(p));
    
    return {
      isExecuted: !!document.executedDate,
      signedParties,
      unsignedParties,
      percentComplete: (signedParties.length / document.parties.length) * 100
    };
  }
  
  /**
   * Export documents
   */
  exportDocuments(): LegalDocument[] {
    return Array.from(this.documents.values());
  }
  
  /**
   * Import documents
   */
  importDocuments(documents: LegalDocument[]): void {
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
  }
}