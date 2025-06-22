import FlexSearch from 'flexsearch';
import { Document, SearchOptions, SearchResult, SearchMatch } from './types';

/**
 * Full-text search functionality for vault documents
 */
export class VaultSearch {
  private index!: FlexSearch.Index;
  private documentStore: Map<string, Document>;
  private isInitialized = false;
  
  constructor() {
    this.documentStore = new Map();
  }
  
  /**
   * Initialize search index
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Create FlexSearch index with appropriate options
    this.index = new FlexSearch.Index({
      tokenize: 'forward',
      cache: true,
      resolution: 9,
      optimize: true,
      fastupdate: true
    });
    
    this.isInitialized = true;
  }
  
  /**
   * Index a document for search
   */
  async indexDocument(document: Document): Promise<void> {
    this.ensureInitialized();
    
    // Store document reference
    this.documentStore.set(document.id, document);
    
    // Create searchable content
    const searchableContent = this.extractSearchableContent(document);
    
    // Add to search index
    this.index.add(document.id, searchableContent);
  }
  
  /**
   * Remove document from search index
   */
  async removeDocument(documentId: string): Promise<void> {
    this.ensureInitialized();
    
    this.documentStore.delete(documentId);
    this.index.remove(documentId);
  }
  
  /**
   * Search documents
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    this.ensureInitialized();
    
    // Perform search
    const results = this.index.search(options.query, {
      limit: options.limit || 10,
      offset: options.offset || 0
    });
    
    const searchResults: SearchResult[] = [];
    
    for (const id of results) {
      const document = this.documentStore.get(id as string);
      if (!document) {
        continue;
      }
      
      // Apply type filter if specified
      if (options.type && document.type !== options.type) {
        continue;
      }
      
      // Apply tag filter if specified
      if (options.tags && options.tags.length > 0) {
        const documentTags = document.metadata.tags || [];
        const hasMatchingTag = options.tags.some(tag => documentTags.includes(tag));
        if (!hasMatchingTag) {
          continue;
        }
      }
      
      // Generate search result with matches
      const matches = this.findMatches(document, options.query);
      const score = this.calculateScore(document, options.query, matches);
      
      searchResults.push({
        document,
        score,
        matches
      });
    }
    
    // Sort results
    this.sortResults(searchResults, options.sortBy, options.sortOrder);
    
    return searchResults;
  }
  
  /**
   * Get search suggestions
   */
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    this.ensureInitialized();
    
    // Simple implementation - in production, this would use more sophisticated algorithms
    const results = this.index.search(query, { limit });
    const suggestions: string[] = [];
    
    for (const id of results.slice(0, limit)) {
      const document = this.documentStore.get(id as string);
      if (document && document.metadata.searchableText) {
        // Extract potential suggestions from searchable text
        const words = document.metadata.searchableText.toLowerCase().split(/\s+/);
        const matchingWords = words.filter(word => 
          word.startsWith(query.toLowerCase()) && word.length > query.length
        );
        
        suggestions.push(...matchingWords.slice(0, 2));
      }
    }
    
    // Remove duplicates and return
    return Array.from(new Set(suggestions)).slice(0, limit);
  }
  
  /**
   * Clear search index
   */
  async clear(): Promise<void> {
    this.ensureInitialized();
    
    this.documentStore.clear();
    
    // Recreate index
    this.index = new FlexSearch.Index({
      tokenize: 'forward',
      cache: true,
      resolution: 9,
      optimize: true,
      fastupdate: true
    });
  }
  
  /**
   * Close search index
   */
  async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    this.documentStore.clear();
    this.isInitialized = false;
  }
  
  /**
   * Extract searchable content from document
   */
  private extractSearchableContent(document: Document): string {
    const parts: string[] = [];
    
    // Add document type
    parts.push(document.type);
    
    // Add metadata searchable text if available
    if (document.metadata.searchableText) {
      parts.push(document.metadata.searchableText);
    }
    
    // Add tags
    if (document.metadata.tags) {
      parts.push(...document.metadata.tags);
    }
    
    // Extract text from document data
    parts.push(this.extractTextFromData(document.data));
    
    return parts.join(' ').toLowerCase();
  }
  
  /**
   * Extract text from document data recursively
   */
  private extractTextFromData(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    
    if (typeof data === 'number' || typeof data === 'boolean') {
      return data.toString();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.extractTextFromData(item)).join(' ');
    }
    
    if (typeof data === 'object' && data !== null) {
      return Object.values(data)
        .map(value => this.extractTextFromData(value))
        .join(' ');
    }
    
    return '';
  }
  
  /**
   * Find matches in document content
   */
  private findMatches(document: Document, query: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const searchableContent = this.extractSearchableContent(document);
    const queryLower = query.toLowerCase();
    
    // Simple match finding - in production, this would be more sophisticated
    const sentences = searchableContent.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(queryLower)) {
        const highlightedSentence = sentence.replace(
          new RegExp(query, 'gi'),
          `<mark>$&</mark>`
        );
        
        matches.push({
          field: 'content',
          value: sentence.trim(),
          highlight: highlightedSentence.trim()
        });
      }
    }
    
    return matches.slice(0, 3); // Limit to 3 matches per document
  }
  
  /**
   * Calculate search relevance score
   */
  private calculateScore(document: Document, query: string, matches: SearchMatch[]): number {
    let score = 0;
    
    // Base score from number of matches
    score += matches.length * 10;
    
    // Boost for exact matches in title/type
    if (document.type.toLowerCase().includes(query.toLowerCase())) {
      score += 50;
    }
    
    // Boost for recent documents
    const daysSinceCreated = (Date.now() - document.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) {
      score += 20;
    } else if (daysSinceCreated < 30) {
      score += 10;
    }
    
    // Boost for frequently updated documents
    if (document.version > 1) {
      score += document.version * 2;
    }
    
    return score;
  }
  
  /**
   * Sort search results
   */
  private sortResults(
    results: SearchResult[], 
    sortBy?: 'relevance' | 'createdAt' | 'updatedAt',
    sortOrder?: 'asc' | 'desc'
  ): void {
    const order = sortOrder === 'asc' ? 1 : -1;
    
    results.sort((a, b) => {
      switch (sortBy) {
        case 'createdAt':
          return (a.document.createdAt - b.document.createdAt) * order;
        case 'updatedAt':
          return (a.document.updatedAt - b.document.updatedAt) * order;
        case 'relevance':
        default:
          return (b.score - a.score) * order;
      }
    });
  }
  
  /**
   * Ensure search is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Search not initialized. Call initialize() first.');
    }
  }
}