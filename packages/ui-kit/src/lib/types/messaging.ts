/**
 * Local messaging types for UI components
 * These mirror the types from @volli/messaging but are defined locally to avoid dependencies
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
  waveform?: number[]; // For voice messages
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

/**
 * Simple voice message creation function for UI components
 */
export function createVoiceMessage(
  audioData: string,
  duration: number,
  senderId: string,
  recipientIds: string[],
  conversationId: string,
  encryptionInfo: EncryptionInfo
): Message {
  return {
    id: crypto.randomUUID(),
    type: MessageType.VOICE,
    content: {
      data: audioData,
      mimeType: 'audio/ogg',
      duration
    },
    metadata: {
      senderId,
      recipientIds,
      conversationId,
      mentions: [],
      reactions: [],
      editHistory: [],
      deliveryStatus: DeliveryStatus.SENDING,
      readReceipts: []
    },
    encryption: encryptionInfo,
    createdAt: Date.now()
  };
}