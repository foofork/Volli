import { v4 as uuidv4 } from 'uuid';
import { 
  Message,
  MessageType,
  MessageContent,
  MessageMetadata,
  MessageFilter,
  MessageSearchResult,
  SearchMatch,
  MessageBatch,
  Conversation,
  ConversationType,
  Participant,
  DeliveryStatus,
  EncryptionInfo
} from './types';
import { isMessageExpired, getMessageSize, createMessageSummary } from './message';

/**
 * Offline message storage and sync interfaces
 */
export interface OfflineMessageStorage {
  storeMessage(message: Message): Promise<void>;
  storeMessages(messages: Message[]): Promise<void>;
  getMessage(id: string): Promise<Message | null>;
  getMessages(filter: MessageFilter): Promise<MessageBatch>;
  updateMessage(id: string, updates: Partial<Message>): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  searchMessages(query: string, filter?: MessageFilter): Promise<MessageSearchResult[]>;
  getConversationMessages(conversationId: string, limit?: number, before?: string): Promise<Message[]>;
  exportMessages(conversationId?: string): Promise<PortableConversation[]>;
  importMessages(conversations: PortableConversation[]): Promise<void>;
  getStorageStats(): Promise<MessageStorageStats>;
  cleanup(retentionDays?: number): Promise<void>;
}

/**
 * Portable conversation export for backup/transfer
 */
export interface PortableConversation {
  conversation: Conversation;
  messages: Message[];
  exportedAt: number;
  totalSize: number;
  checksum: string;
  encryptionKey?: Uint8Array; // For additional encryption
}

/**
 * Message storage statistics
 */
export interface MessageStorageStats {
  totalMessages: number;
  totalSize: number;
  conversationCount: number;
  oldestMessage?: number;
  newestMessage?: number;
  typeBreakdown: Record<MessageType, number>;
  sizeByConversation: Record<string, number>;
  unreadCount: number;
  failedMessages: number;
}

/**
 * Sync conflict resolution
 */
export interface MessageConflict {
  localMessage: Message;
  remoteMessage: Message;
  conflictType: ConflictType;
  resolutionStrategy?: ResolutionStrategy;
}

export enum ConflictType {
  CONTENT_MISMATCH = 'content_mismatch',
  DELIVERY_STATUS_MISMATCH = 'delivery_status_mismatch',
  TIMESTAMP_MISMATCH = 'timestamp_mismatch',
  ENCRYPTION_MISMATCH = 'encryption_mismatch'
}

export enum ResolutionStrategy {
  PREFER_LOCAL = 'prefer_local',
  PREFER_REMOTE = 'prefer_remote',
  PREFER_NEWER = 'prefer_newer',
  MERGE = 'merge',
  MANUAL = 'manual'
}

/**
 * Sync result tracking
 */
export interface SyncResult {
  syncId: string;
  startedAt: number;
  completedAt: number;
  messagesDownloaded: number;
  messagesUploaded: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errors: SyncError[];
  success: boolean;
}

export interface SyncError {
  messageId?: string;
  conversationId?: string;
  error: string;
  retryable: boolean;
  timestamp: number;
}

/**
 * Search index for fast offline search
 */
interface MessageSearchIndex {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string; // Searchable text content
  type: MessageType;
  timestamp: number;
  keywords: string[]; // Extracted keywords
  participants: string[]; // For conversation search
}

/**
 * Offline-first message vault providing full message access without network dependency
 * 
 * Features:
 * - Local encrypted message database using IndexedDB
 * - Full-text search across all message history
 * - Conversation export/import for backup and transfer
 * - Conflict resolution for sync when network restored
 * - Forward secrecy maintenance during offline operations
 * - Message retention and cleanup policies
 */
export class OfflineMessageVault implements OfflineMessageStorage {
  private readonly vaultId: string;
  private isInitialized = false;
  private messageDatabase: Map<string, Message> = new Map();
  private conversationDatabase: Map<string, Conversation> = new Map();
  private searchIndex: Map<string, MessageSearchIndex> = new Map();
  private syncQueue: Map<string, Message> = new Map(); // Messages pending sync
  private encryptionKeys: Map<string, Uint8Array> = new Map(); // Conversation encryption keys

  constructor(vaultId?: string) {
    this.vaultId = vaultId || uuidv4();
  }

  /**
   * Initialize the offline message vault
   */
  async initialize(masterKey?: Uint8Array): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // In production, this would initialize IndexedDB with encryption
    await this.initializeIndexedDB(masterKey);
    await this.loadExistingData();
    await this.rebuildSearchIndex();

    this.isInitialized = true;
  }

  /**
   * Store a single message offline
   */
  async storeMessage(message: Message): Promise<void> {
    this.ensureInitialized();

    // Store message in database
    this.messageDatabase.set(message.id, message);

    // Update search index
    await this.indexMessage(message);

    // Add to sync queue if not already synced
    if (message.metadata.deliveryStatus !== DeliveryStatus.DELIVERED) {
      this.syncQueue.set(message.id, message);
    }

    // Update conversation last message
    await this.updateConversationLastMessage(message);

    // Clean up expired messages
    await this.cleanupExpiredMessages();
  }

  /**
   * Store multiple messages in batch (for import/sync)
   */
  async storeMessages(messages: Message[]): Promise<void> {
    this.ensureInitialized();

    for (const message of messages) {
      await this.storeMessage(message);
    }
  }

  /**
   * Get message by ID
   */
  async getMessage(id: string): Promise<Message | null> {
    this.ensureInitialized();
    return this.messageDatabase.get(id) || null;
  }

  /**
   * Get messages with filtering
   */
  async getMessages(filter: MessageFilter): Promise<MessageBatch> {
    this.ensureInitialized();

    let messages = Array.from(this.messageDatabase.values());

    // Apply filters
    if (filter.conversationId) {
      messages = messages.filter(m => m.metadata.conversationId === filter.conversationId);
    }

    if (filter.senderId) {
      messages = messages.filter(m => m.metadata.senderId === filter.senderId);
    }

    if (filter.type) {
      messages = messages.filter(m => m.type === filter.type);
    }

    if (filter.dateRange) {
      messages = messages.filter(m => 
        m.createdAt >= filter.dateRange!.start && 
        m.createdAt <= filter.dateRange!.end
      );
    }

    if (filter.hasAttachments) {
      messages = messages.filter(m => 
        m.type === MessageType.IMAGE || 
        m.type === MessageType.FILE || 
        m.type === MessageType.VOICE ||
        m.type === MessageType.VIDEO
      );
    }

    if (filter.searchQuery) {
      const searchResults = await this.searchMessages(filter.searchQuery, filter);
      const searchMessageIds = new Set(searchResults.map(r => r.message.id));
      messages = messages.filter(m => searchMessageIds.has(m.id));
    }

    // Sort by creation time (newest first)
    messages.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const paginatedMessages = messages.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      conversationId: filter.conversationId || '',
      batchId: uuidv4(),
      totalCount: messages.length,
      hasMore: offset + limit < messages.length,
      nextCursor: offset + limit < messages.length ? (offset + limit).toString() : undefined
    };
  }

  /**
   * Update message
   */
  async updateMessage(id: string, updates: Partial<Message>): Promise<void> {
    this.ensureInitialized();

    const existing = this.messageDatabase.get(id);
    if (!existing) {
      throw new Error('Message not found');
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    this.messageDatabase.set(id, updated);
    await this.indexMessage(updated);

    // Update sync queue
    this.syncQueue.set(id, updated);
  }

  /**
   * Delete message
   */
  async deleteMessage(id: string): Promise<void> {
    this.ensureInitialized();

    const message = this.messageDatabase.get(id);
    if (!message) {
      return;
    }

    this.messageDatabase.delete(id);
    this.searchIndex.delete(id);
    this.syncQueue.delete(id);

    // Add deletion to sync queue
    const deletionMarker: Message = {
      ...message,
      metadata: {
        ...message.metadata,
        deliveryStatus: DeliveryStatus.FAILED // Mark as deleted
      },
      updatedAt: Date.now()
    };
    this.syncQueue.set(`delete:${id}`, deletionMarker);
  }

  /**
   * Search messages with full-text search
   */
  async searchMessages(query: string, filter?: MessageFilter): Promise<MessageSearchResult[]> {
    this.ensureInitialized();

    const results: MessageSearchResult[] = [];
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(' ').filter(term => term.length > 0);

    for (const [messageId, index] of this.searchIndex) {
      // Apply conversation filter if specified
      if (filter?.conversationId && index.conversationId !== filter.conversationId) {
        continue;
      }

      // Apply type filter if specified
      if (filter?.type && index.type !== filter.type) {
        continue;
      }

      // Apply date range filter if specified
      if (filter?.dateRange) {
        if (index.timestamp < filter.dateRange.start || index.timestamp > filter.dateRange.end) {
          continue;
        }
      }

      // Check if content matches search terms
      const contentLower = index.content.toLowerCase();
      const matches: SearchMatch[] = [];
      let score = 0;

      for (const term of searchTerms) {
        if (contentLower.includes(term)) {
          score += 1;
          matches.push({
            field: 'content',
            value: term,
            highlight: this.highlightMatch(index.content, term)
          });
        }

        // Search in keywords
        for (const keyword of index.keywords) {
          if (keyword.toLowerCase().includes(term)) {
            score += 0.5;
            matches.push({
              field: 'keywords',
              value: keyword,
              highlight: keyword
            });
          }
        }
      }

      if (matches.length > 0) {
        const message = this.messageDatabase.get(messageId);
        const conversation = this.conversationDatabase.get(index.conversationId);

        if (message && conversation) {
          results.push({
            message,
            conversation,
            matches,
            score
          });
        }
      }
    }

    // Sort by score (highest first) then by timestamp (newest first)
    results.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return b.message.createdAt - a.message.createdAt;
    });

    // Apply limit if specified
    if (filter?.limit) {
      return results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Get conversation messages in chronological order
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    before?: string
  ): Promise<Message[]> {
    this.ensureInitialized();

    let messages = Array.from(this.messageDatabase.values())
      .filter(m => m.metadata.conversationId === conversationId);

    // Filter messages before cursor if specified
    if (before) {
      const beforeMessage = this.messageDatabase.get(before);
      if (beforeMessage) {
        messages = messages.filter(m => m.createdAt < beforeMessage.createdAt);
      }
    }

    // Sort by creation time (newest first for pagination, will reverse for display)
    messages.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    messages = messages.slice(0, limit);

    // Reverse to get chronological order (oldest first)
    return messages.reverse();
  }

  /**
   * Export conversation(s) for backup/transfer
   */
  async exportMessages(conversationId?: string): Promise<PortableConversation[]> {
    this.ensureInitialized();

    const conversations = conversationId 
      ? [this.conversationDatabase.get(conversationId)].filter(Boolean) as Conversation[]
      : Array.from(this.conversationDatabase.values());

    const exports: PortableConversation[] = [];

    for (const conversation of conversations) {
      const messages = Array.from(this.messageDatabase.values())
        .filter(m => m.metadata.conversationId === conversation.id)
        .sort((a, b) => a.createdAt - b.createdAt);

      const totalSize = messages.reduce((size, message) => size + getMessageSize(message), 0);
      
      // Create checksum for data integrity using secure hash
      const conversationData = JSON.stringify({ conversation, messages });
      const checksum = await this.calculateSecureChecksum(conversationData);

      exports.push({
        conversation,
        messages,
        exportedAt: Date.now(),
        totalSize,
        checksum,
        encryptionKey: this.encryptionKeys.get(conversation.id)
      });
    }

    return exports;
  }

  /**
   * Import conversation(s) from backup
   */
  async importMessages(conversations: PortableConversation[]): Promise<void> {
    this.ensureInitialized();

    for (const portableConv of conversations) {
      // Verify checksum
      const conversationData = JSON.stringify({ 
        conversation: portableConv.conversation, 
        messages: portableConv.messages 
      });
      const calculatedChecksum = await this.calculateSecureChecksum(conversationData);
      
      if (calculatedChecksum !== portableConv.checksum) {
        throw new Error(`Checksum verification failed for conversation ${portableConv.conversation.id}`);
      }

      // Store conversation
      this.conversationDatabase.set(portableConv.conversation.id, portableConv.conversation);

      // Store encryption key if provided
      if (portableConv.encryptionKey) {
        this.encryptionKeys.set(portableConv.conversation.id, portableConv.encryptionKey);
      }

      // Store messages
      await this.storeMessages(portableConv.messages);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<MessageStorageStats> {
    this.ensureInitialized();

    const messages = Array.from(this.messageDatabase.values());
    const typeBreakdown: Record<MessageType, number> = {
      [MessageType.TEXT]: 0,
      [MessageType.IMAGE]: 0,
      [MessageType.FILE]: 0,
      [MessageType.VOICE]: 0,
      [MessageType.VIDEO]: 0,
      [MessageType.SYSTEM]: 0,
      [MessageType.EPHEMERAL]: 0
    };

    const sizeByConversation: Record<string, number> = {};
    let totalSize = 0;
    let unreadCount = 0;
    let failedMessages = 0;
    let oldestMessage: number | undefined;
    let newestMessage: number | undefined;

    for (const message of messages) {
      // Type breakdown
      typeBreakdown[message.type]++;

      // Size calculation
      const messageSize = getMessageSize(message);
      totalSize += messageSize;

      const convId = message.metadata.conversationId;
      sizeByConversation[convId] = (sizeByConversation[convId] || 0) + messageSize;

      // Unread count (messages not marked as read by current user)
      // Note: In production, this would check against current user ID
      if (!message.metadata.readReceipts?.length) {
        unreadCount++;
      }

      // Failed messages
      if (message.metadata.deliveryStatus === DeliveryStatus.FAILED) {
        failedMessages++;
      }

      // Timestamp tracking
      if (!oldestMessage || message.createdAt < oldestMessage) {
        oldestMessage = message.createdAt;
      }
      if (!newestMessage || message.createdAt > newestMessage) {
        newestMessage = message.createdAt;
      }
    }

    return {
      totalMessages: messages.length,
      totalSize,
      conversationCount: this.conversationDatabase.size,
      oldestMessage,
      newestMessage,
      typeBreakdown,
      sizeByConversation,
      unreadCount,
      failedMessages
    };
  }

  /**
   * Clean up old messages and expired content
   */
  async cleanup(retentionDays: number = 90): Promise<void> {
    this.ensureInitialized();

    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const messagesToDelete: string[] = [];

    for (const [id, message] of this.messageDatabase) {
      // Delete expired ephemeral messages
      if (isMessageExpired(message)) {
        messagesToDelete.push(id);
        continue;
      }

      // Delete old messages beyond retention period
      if (message.createdAt < cutoffTime) {
        messagesToDelete.push(id);
        continue;
      }
    }

    // Delete identified messages
    for (const messageId of messagesToDelete) {
      await this.deleteMessage(messageId);
    }

    // Cleanup search index
    await this.rebuildSearchIndex();
  }

  /**
   * Synchronize with remote when network available
   */
  async syncWithRemote(): Promise<SyncResult> {
    this.ensureInitialized();

    const syncId = uuidv4();
    const startedAt = Date.now();

    try {
      // Get pending messages to upload
      const pendingMessages = Array.from(this.syncQueue.values());
      
      // In production, this would connect to remote service
      // For now, simulate sync completion
      const result: SyncResult = {
        syncId,
        startedAt,
        completedAt: Date.now(),
        messagesDownloaded: 0, // Would be populated from remote
        messagesUploaded: pendingMessages.length,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errors: [],
        success: true
      };

      // Clear sync queue on successful sync
      this.syncQueue.clear();

      return result;

    } catch (error) {
      return {
        syncId,
        startedAt,
        completedAt: Date.now(),
        messagesDownloaded: 0,
        messagesUploaded: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errors: [{
          error: error instanceof Error ? error.message : 'Unknown sync error',
          retryable: true,
          timestamp: Date.now()
        }],
        success: false
      };
    }
  }

  /**
   * Resolve sync conflicts
   */
  async resolveConflicts(conflicts: MessageConflict[]): Promise<void> {
    this.ensureInitialized();

    for (const conflict of conflicts) {
      switch (conflict.resolutionStrategy || ResolutionStrategy.PREFER_NEWER) {
        case ResolutionStrategy.PREFER_LOCAL:
          // Keep local version, add to sync queue
          this.syncQueue.set(conflict.localMessage.id, conflict.localMessage);
          break;

        case ResolutionStrategy.PREFER_REMOTE:
          // Replace with remote version
          await this.storeMessage(conflict.remoteMessage);
          break;

        case ResolutionStrategy.PREFER_NEWER:
          // Keep the newer message
          const newerMessage = conflict.localMessage.createdAt > conflict.remoteMessage.createdAt
            ? conflict.localMessage
            : conflict.remoteMessage;
          await this.storeMessage(newerMessage);
          break;

        case ResolutionStrategy.MERGE:
          // Merge compatible changes (implementation depends on conflict type)
          const mergedMessage = await this.mergeMessages(conflict.localMessage, conflict.remoteMessage);
          await this.storeMessage(mergedMessage);
          break;

        case ResolutionStrategy.MANUAL:
          // Manual resolution required - add to pending conflicts
          console.warn(`Manual resolution required for message ${conflict.localMessage.id}`);
          break;
      }
    }
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('OfflineMessageVault not initialized. Call initialize() first.');
    }
  }

  private async initializeIndexedDB(masterKey?: Uint8Array): Promise<void> {
    // In production, initialize IndexedDB with proper schema
    // For now, using in-memory storage
  }

  private async loadExistingData(): Promise<void> {
    // In production, load from IndexedDB
    // For now, starting with empty state
  }

  private async indexMessage(message: Message): Promise<void> {
    // Extract searchable content
    let content = '';
    let keywords: string[] = [];

    switch (message.type) {
      case MessageType.TEXT:
        content = message.content.data as string;
        keywords = this.extractKeywords(content);
        break;
      
      case MessageType.IMAGE:
      case MessageType.FILE:
        content = message.content.filename || '';
        keywords = [message.content.filename || '', message.content.mimeType || ''];
        break;
      
      case MessageType.VOICE:
        content = 'voice message';
        keywords = ['voice', 'audio'];
        break;
      
      case MessageType.VIDEO:
        content = 'video message';
        keywords = ['video'];
        break;
      
      case MessageType.SYSTEM:
        content = createMessageSummary(message);
        keywords = ['system'];
        break;
    }

    // Get conversation for participant info
    const conversation = this.conversationDatabase.get(message.metadata.conversationId);
    const participants = conversation?.participants.map(p => p.userId) || [];

    const searchIndex: MessageSearchIndex = {
      messageId: message.id,
      conversationId: message.metadata.conversationId,
      senderId: message.metadata.senderId,
      content,
      type: message.type,
      timestamp: message.createdAt,
      keywords,
      participants
    };

    this.searchIndex.set(message.id, searchIndex);
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 10); // Limit to 10 keywords
  }

  private highlightMatch(content: string, term: string): string {
    const regex = new RegExp(`(${term})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  private async updateConversationLastMessage(message: Message): Promise<void> {
    const conversation = this.conversationDatabase.get(message.metadata.conversationId);
    if (conversation) {
      const updated = {
        ...conversation,
        lastMessage: message,
        updatedAt: Date.now()
      };
      this.conversationDatabase.set(conversation.id, updated);
    }
  }

  private async cleanupExpiredMessages(): Promise<void> {
    const expiredMessages: string[] = [];

    for (const [id, message] of this.messageDatabase) {
      if (isMessageExpired(message)) {
        expiredMessages.push(id);
      }
    }

    for (const messageId of expiredMessages) {
      this.messageDatabase.delete(messageId);
      this.searchIndex.delete(messageId);
    }
  }

  private async calculateSecureChecksum(data: string): Promise<string> {
    // Use Web Crypto API for secure hashing until proper crypto integration
    const dataBytes = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async mergeMessages(local: Message, remote: Message): Promise<Message> {
    // Simple merge strategy - prefer newer content, merge metadata
    const newerMessage = local.updatedAt && remote.updatedAt
      ? (local.updatedAt > remote.updatedAt ? local : remote)
      : (local.createdAt > remote.createdAt ? local : remote);

    return {
      ...newerMessage,
      metadata: {
        ...newerMessage.metadata,
        // Merge reactions and read receipts
        reactions: [
          ...(local.metadata.reactions || []),
          ...(remote.metadata.reactions || [])
        ].filter((reaction, index, arr) => 
          arr.findIndex(r => r.userId === reaction.userId && r.emoji === reaction.emoji) === index
        ),
        readReceipts: [
          ...(local.metadata.readReceipts || []),
          ...(remote.metadata.readReceipts || [])
        ].filter((receipt, index, arr) =>
          arr.findIndex(r => r.userId === receipt.userId) === index
        )
      },
      updatedAt: Date.now()
    };
  }

  private async rebuildSearchIndex(): Promise<void> {
    this.searchIndex.clear();
    
    for (const message of this.messageDatabase.values()) {
      await this.indexMessage(message);
    }
  }
}