/**
 * Type definitions for Volli messaging
 */

export interface Message {
  id: string;
  type: MessageType;
  content: MessageContent;
  metadata: MessageMetadata;
  encryption: EncryptionInfo;
  createdAt: number;
  updatedAt?: number;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VOICE = 'voice',
  VIDEO = 'video',
  SYSTEM = 'system',
  EPHEMERAL = 'ephemeral'
}

export interface MessageContent {
  data: any;
  mimeType?: string;
  size?: number;
  filename?: string;
  duration?: number; // For voice/video messages
  thumbnail?: string; // Base64 encoded thumbnail
}

export interface MessageMetadata {
  senderId: string;
  recipientIds: string[];
  conversationId: string;
  replyToId?: string;
  threadId?: string;
  mentions?: string[];
  reactions?: MessageReaction[];
  editHistory?: MessageEdit[];
  deliveryStatus: DeliveryStatus;
  readReceipts?: ReadReceipt[];
  forwardedFrom?: string;
  expiresAt?: number; // For ephemeral messages
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: number;
}

export interface MessageEdit {
  editedAt: number;
  previousContent: MessageContent;
  reason?: string;
}

export interface ReadReceipt {
  userId: string;
  readAt: number;
}

export enum DeliveryStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface EncryptionInfo {
  algorithm: string;
  keyId: string;
  nonce: string;
  encryptedSize: number;
  checksum: string;
  version: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: Participant[];
  metadata: ConversationMetadata;
  lastMessage?: Message;
  createdAt: number;
  updatedAt: number;
}

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  CHANNEL = 'channel',
  BROADCAST = 'broadcast'
}

export interface Participant {
  userId: string;
  role: ParticipantRole;
  joinedAt: number;
  permissions: ParticipantPermissions;
  nickname?: string;
  muteUntil?: number;
}

export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  GUEST = 'guest'
}

export interface ParticipantPermissions {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canInviteUsers: boolean;
  canEditGroupInfo: boolean;
  canDeleteMessages: boolean;
  canPinMessages: boolean;
}

export interface ConversationMetadata {
  name?: string;
  description?: string;
  avatar?: string;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  tags?: string[];
  customData?: Record<string, any>;
}

export interface MessageFilter {
  conversationId?: string;
  senderId?: string;
  type?: MessageType;
  dateRange?: {
    start: number;
    end: number;
  };
  hasAttachments?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface MessageSearchResult {
  message: Message;
  conversation: Conversation;
  matches: SearchMatch[];
  score: number;
}

export interface SearchMatch {
  field: string;
  value: string;
  highlight: string;
}

export interface MessageBatch {
  messages: Message[];
  conversationId: string;
  batchId: string;
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: number;
}

export interface MessageQueue {
  messages: QueuedMessage[];
  conversationId: string;
  priority: QueuePriority;
}

export interface QueuedMessage {
  tempId: string;
  message: Omit<Message, 'id'>;
  retryCount: number;
  priority: QueuePriority;
  scheduledAt?: number;
}

export enum QueuePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}

export interface MessageEvents {
  'message:sent': (message: Message) => void;
  'message:received': (message: Message) => void;
  'message:delivered': (messageId: string, userId: string) => void;
  'message:read': (messageId: string, userId: string) => void;
  'message:edited': (message: Message) => void;
  'message:deleted': (messageId: string) => void;
  'conversation:created': (conversation: Conversation) => void;
  'conversation:updated': (conversation: Conversation) => void;
  'conversation:archived': (conversationId: string) => void;
  'participant:joined': (conversationId: string, participant: Participant) => void;
  'participant:left': (conversationId: string, userId: string) => void;
  'typing:start': (indicator: TypingIndicator) => void;
  'typing:stop': (indicator: TypingIndicator) => void;
}

export interface MessageStorage {
  storeMessage(message: Message): Promise<void>;
  getMessage(id: string): Promise<Message | null>;
  getMessages(filter: MessageFilter): Promise<MessageBatch>;
  updateMessage(id: string, updates: Partial<Message>): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  searchMessages(query: string, filter?: MessageFilter): Promise<MessageSearchResult[]>;
}

export interface ConversationStorage {
  storeConversation(conversation: Conversation): Promise<void>;
  getConversation(id: string): Promise<Conversation | null>;
  getConversations(userId: string): Promise<Conversation[]>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<void>;
  deleteConversation(id: string): Promise<void>;
}