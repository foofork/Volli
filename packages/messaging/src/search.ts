import {
  Message,
  Conversation,
  MessageType,
  MessageFilter,
  MessageSearchResult,
  SearchMatch
} from './types';

/**
 * Message search functionality
 */
export class MessageSearchEngine {
  private messages: Message[] = [];
  private conversations: Map<string, Conversation> = new Map();
  
  /**
   * Index a message for search
   */
  indexMessage(message: Message): void {
    // Remove existing message if it exists (for updates)
    this.removeMessage(message.id);
    
    // Add new/updated message
    this.messages.push(message);
  }
  
  /**
   * Remove message from search index
   */
  removeMessage(messageId: string): void {
    this.messages = this.messages.filter(m => m.id !== messageId);
  }
  
  /**
   * Index a conversation for search context
   */
  indexConversation(conversation: Conversation): void {
    this.conversations.set(conversation.id, conversation);
  }
  
  /**
   * Search messages
   */
  searchMessages(query: string, filter?: MessageFilter): MessageSearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return [];
    }
    
    let filteredMessages = this.messages;
    
    // Apply filters
    if (filter) {
      filteredMessages = this.applyFilter(filteredMessages, filter);
    }
    
    const results: MessageSearchResult[] = [];
    
    for (const message of filteredMessages) {
      const matches = this.findMatches(message, normalizedQuery);
      
      if (matches.length > 0) {
        const conversation = this.conversations.get(message.metadata.conversationId);
        const score = this.calculateScore(message, normalizedQuery, matches);
        
        results.push({
          message,
          conversation: conversation!,
          matches,
          score
        });
      }
    }
    
    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);
    
    // Apply limit if specified
    if (filter?.limit) {
      return results.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
    }
    
    return results;
  }
  
  /**
   * Search messages by sender
   */
  searchBySender(senderId: string, limit?: number): Message[] {
    const messages = this.messages.filter(m => m.metadata.senderId === senderId);
    
    // Sort by creation time (newest first)
    messages.sort((a, b) => b.createdAt - a.createdAt);
    
    return limit ? messages.slice(0, limit) : messages;
  }
  
  /**
   * Search messages in conversation
   */
  searchInConversation(conversationId: string, query: string, limit?: number): MessageSearchResult[] {
    const filter: MessageFilter = {
      conversationId,
      searchQuery: query,
      limit
    };
    
    return this.searchMessages(query, filter);
  }
  
  /**
   * Search messages by type
   */
  searchByType(type: MessageType, limit?: number): Message[] {
    const messages = this.messages.filter(m => m.type === type);
    
    // Sort by creation time (newest first)
    messages.sort((a, b) => b.createdAt - a.createdAt);
    
    return limit ? messages.slice(0, limit) : messages;
  }
  
  /**
   * Search messages with attachments
   */
  searchWithAttachments(limit?: number): Message[] {
    const messages = this.messages.filter(m => 
      m.type === MessageType.IMAGE ||
      m.type === MessageType.FILE ||
      m.type === MessageType.VOICE ||
      m.type === MessageType.VIDEO
    );
    
    // Sort by creation time (newest first)
    messages.sort((a, b) => b.createdAt - a.createdAt);
    
    return limit ? messages.slice(0, limit) : messages;
  }
  
  /**
   * Get recent messages
   */
  getRecentMessages(hours: number = 24, limit?: number): Message[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const messages = this.messages.filter(m => m.createdAt >= cutoff);
    
    // Sort by creation time (newest first)
    messages.sort((a, b) => b.createdAt - a.createdAt);
    
    return limit ? messages.slice(0, limit) : messages;
  }
  
  /**
   * Get message statistics
   */
  getStats(): {
    totalMessages: number;
    messagesByType: Record<MessageType, number>;
    messagesByConversation: Record<string, number>;
    averageMessageSize: number;
  } {
    const messagesByType: Record<MessageType, number> = {} as any;
    const messagesByConversation: Record<string, number> = {};
    let totalSize = 0;
    
    for (const message of this.messages) {
      // Count by type
      messagesByType[message.type] = (messagesByType[message.type] || 0) + 1;
      
      // Count by conversation
      const convId = message.metadata.conversationId;
      messagesByConversation[convId] = (messagesByConversation[convId] || 0) + 1;
      
      // Calculate size
      totalSize += this.estimateMessageSize(message);
    }
    
    return {
      totalMessages: this.messages.length,
      messagesByType,
      messagesByConversation,
      averageMessageSize: this.messages.length > 0 ? totalSize / this.messages.length : 0
    };
  }
  
  /**
   * Clear search index
   */
  clear(): void {
    this.messages = [];
    this.conversations.clear();
  }
  
  /**
   * Apply filter to messages
   */
  private applyFilter(messages: Message[], filter: MessageFilter): Message[] {
    let filtered = messages;
    
    if (filter.conversationId) {
      filtered = filtered.filter(m => m.metadata.conversationId === filter.conversationId);
    }
    
    if (filter.senderId) {
      filtered = filtered.filter(m => m.metadata.senderId === filter.senderId);
    }
    
    if (filter.type) {
      filtered = filtered.filter(m => m.type === filter.type);
    }
    
    if (filter.dateRange) {
      filtered = filtered.filter(m => 
        m.createdAt >= filter.dateRange!.start && 
        m.createdAt <= filter.dateRange!.end
      );
    }
    
    if (filter.hasAttachments !== undefined) {
      const hasAttachmentTypes = [
        MessageType.IMAGE,
        MessageType.FILE,
        MessageType.VOICE,
        MessageType.VIDEO
      ];
      
      if (filter.hasAttachments) {
        filtered = filtered.filter(m => hasAttachmentTypes.includes(m.type));
      } else {
        filtered = filtered.filter(m => !hasAttachmentTypes.includes(m.type));
      }
    }
    
    return filtered;
  }
  
  /**
   * Find matches in message content
   */
  private findMatches(message: Message, query: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    
    // Search in text content
    if (message.type === MessageType.TEXT && typeof message.content.data === 'string') {
      const text = message.content.data.toLowerCase();
      if (text.includes(query)) {
        matches.push({
          field: 'content',
          value: message.content.data,
          highlight: this.highlightText(message.content.data, query)
        });
      }
    }
    
    // Search in filename
    if (message.content.filename) {
      const filename = message.content.filename.toLowerCase();
      if (filename.includes(query)) {
        matches.push({
          field: 'filename',
          value: message.content.filename,
          highlight: this.highlightText(message.content.filename, query)
        });
      }
    }
    
    // Search in conversation name if available
    const conversation = this.conversations.get(message.metadata.conversationId);
    if (conversation?.metadata.name) {
      const name = conversation.metadata.name.toLowerCase();
      if (name.includes(query)) {
        matches.push({
          field: 'conversation',
          value: conversation.metadata.name,
          highlight: this.highlightText(conversation.metadata.name, query)
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Calculate search relevance score
   */
  private calculateScore(message: Message, query: string, matches: SearchMatch[]): number {
    let score = 0;
    
    // Base score from number of matches
    score += matches.length * 10;
    
    // Boost for exact matches
    for (const match of matches) {
      const value = match.value.toLowerCase();
      if (value === query) {
        score += 50;
      } else if (value.startsWith(query)) {
        score += 30;
      } else if (value.includes(query)) {
        score += 20;
      }
    }
    
    // Boost for recent messages
    const age = Date.now() - message.createdAt;
    const daysSinceCreated = age / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreated < 1) {
      score += 20;
    } else if (daysSinceCreated < 7) {
      score += 10;
    } else if (daysSinceCreated < 30) {
      score += 5;
    }
    
    // Boost for message type relevance
    if (message.type === MessageType.TEXT) {
      score += 5; // Text messages are more searchable
    }
    
    return score;
  }
  
  /**
   * Highlight search query in text
   */
  private highlightText(text: string, query: string): string {
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  /**
   * Escape special regex characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Estimate message size in bytes
   */
  private estimateMessageSize(message: Message): number {
    return JSON.stringify(message).length;
  }
}

/**
 * Utility functions for message search
 */

/**
 * Extract searchable text from message
 */
export function extractSearchableText(message: Message): string {
  const parts: string[] = [];
  
  // Add message content based on type
  switch (message.type) {
    case MessageType.TEXT:
      if (typeof message.content.data === 'string') {
        parts.push(message.content.data);
      }
      break;
    
    case MessageType.FILE:
    case MessageType.IMAGE:
    case MessageType.VOICE:
    case MessageType.VIDEO:
      if (message.content.filename) {
        parts.push(message.content.filename);
      }
      break;
  }
  
  return parts.join(' ');
}

/**
 * Create message filter from search options
 */
export function createMessageFilter(options: {
  conversationId?: string;
  senderId?: string;
  type?: MessageType;
  startDate?: Date;
  endDate?: Date;
  hasAttachments?: boolean;
  limit?: number;
  offset?: number;
}): MessageFilter {
  const filter: MessageFilter = {};
  
  if (options.conversationId) filter.conversationId = options.conversationId;
  if (options.senderId) filter.senderId = options.senderId;
  if (options.type) filter.type = options.type;
  if (options.hasAttachments !== undefined) filter.hasAttachments = options.hasAttachments;
  if (options.limit) filter.limit = options.limit;
  if (options.offset) filter.offset = options.offset;
  
  if (options.startDate || options.endDate) {
    filter.dateRange = {
      start: options.startDate?.getTime() || 0,
      end: options.endDate?.getTime() || Date.now()
    };
  }
  
  return filter;
}

/**
 * Get message preview text
 */
export function getMessagePreview(message: Message, maxLength: number = 100): string {
  let preview = '';
  
  switch (message.type) {
    case MessageType.TEXT:
      preview = typeof message.content.data === 'string' ? message.content.data : '';
      break;
    
    case MessageType.IMAGE:
      preview = '📷 Image';
      if (message.content.filename) {
        preview += ` - ${message.content.filename}`;
      }
      break;
    
    case MessageType.FILE:
      preview = `📎 ${message.content.filename || 'File'}`;
      break;
    
    case MessageType.VOICE:
      preview = '🎤 Voice message';
      if (message.content.duration) {
        preview += ` (${Math.round(message.content.duration)}s)`;
      }
      break;
    
    case MessageType.VIDEO:
      preview = '🎥 Video';
      if (message.content.filename) {
        preview += ` - ${message.content.filename}`;
      }
      break;
    
    case MessageType.SYSTEM:
      preview = 'System message';
      break;
    
    case MessageType.EPHEMERAL:
      preview = '⚡ Ephemeral message';
      break;
    
    default:
      preview = 'Message';
  }
  
  return preview.length > maxLength 
    ? preview.substring(0, maxLength - 3) + '...'
    : preview;
}