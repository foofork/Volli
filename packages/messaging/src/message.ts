import { v4 as uuidv4 } from 'uuid';
import { 
  Message, 
  MessageType, 
  MessageContent, 
  MessageMetadata, 
  DeliveryStatus,
  MessageReaction,
  ReadReceipt,
  MessageEdit,
  EncryptionInfo
} from './types';

/**
 * Core message handling functionality
 */

/**
 * Create a new message
 */
export function createMessage(
  type: MessageType,
  content: MessageContent,
  metadata: Pick<MessageMetadata, 'senderId' | 'recipientIds' | 'conversationId'> & Partial<MessageMetadata>,
  encryptionInfo: EncryptionInfo
): Message {
  const now = Date.now();
  
  return {
    id: uuidv4(),
    type,
    content,
    metadata: {
      senderId: metadata.senderId,
      recipientIds: metadata.recipientIds,
      conversationId: metadata.conversationId,
      replyToId: metadata.replyToId,
      threadId: metadata.threadId,
      mentions: metadata.mentions || [],
      reactions: metadata.reactions || [],
      editHistory: metadata.editHistory || [],
      deliveryStatus: metadata.deliveryStatus || DeliveryStatus.SENDING,
      readReceipts: metadata.readReceipts || [],
      forwardedFrom: metadata.forwardedFrom,
      expiresAt: metadata.expiresAt
    },
    encryption: encryptionInfo,
    createdAt: now,
    updatedAt: undefined
  };
}

/**
 * Create a text message
 */
export function createTextMessage(
  text: string,
  senderId: string,
  recipientIds: string[],
  conversationId: string,
  encryptionInfo: EncryptionInfo,
  options?: {
    replyToId?: string;
    mentions?: string[];
    expiresAt?: number;
  }
): Message {
  return createMessage(
    MessageType.TEXT,
    { data: text },
    {
      senderId,
      recipientIds,
      conversationId,
      replyToId: options?.replyToId,
      mentions: options?.mentions,
      expiresAt: options?.expiresAt
    },
    encryptionInfo
  );
}

/**
 * Create an image message
 */
export function createImageMessage(
  imageData: string, // Base64 encoded
  senderId: string,
  recipientIds: string[],
  conversationId: string,
  encryptionInfo: EncryptionInfo,
  options?: {
    filename?: string;
    thumbnail?: string;
    caption?: string;
  }
): Message {
  return createMessage(
    MessageType.IMAGE,
    {
      data: imageData,
      mimeType: 'image/jpeg', // Default, should be detected
      filename: options?.filename,
      thumbnail: options?.thumbnail
    },
    {
      senderId,
      recipientIds,
      conversationId
    },
    encryptionInfo
  );
}

/**
 * Create a file message
 */
export function createFileMessage(
  fileData: string, // Base64 encoded
  filename: string,
  mimeType: string,
  size: number,
  senderId: string,
  recipientIds: string[],
  conversationId: string,
  encryptionInfo: EncryptionInfo
): Message {
  return createMessage(
    MessageType.FILE,
    {
      data: fileData,
      mimeType,
      filename,
      size
    },
    {
      senderId,
      recipientIds,
      conversationId
    },
    encryptionInfo
  );
}

/**
 * Create a voice message
 */
export function createVoiceMessage(
  audioData: string, // Base64 encoded
  duration: number,
  senderId: string,
  recipientIds: string[],
  conversationId: string,
  encryptionInfo: EncryptionInfo
): Message {
  return createMessage(
    MessageType.VOICE,
    {
      data: audioData,
      mimeType: 'audio/ogg',
      duration
    },
    {
      senderId,
      recipientIds,
      conversationId
    },
    encryptionInfo
  );
}

/**
 * Create a system message
 */
export function createSystemMessage(
  systemData: any,
  conversationId: string,
  encryptionInfo: EncryptionInfo
): Message {
  return createMessage(
    MessageType.SYSTEM,
    { data: systemData },
    {
      senderId: 'system',
      recipientIds: [],
      conversationId
    },
    encryptionInfo
  );
}

/**
 * Create an ephemeral message
 */
export function createEphemeralMessage(
  content: MessageContent,
  senderId: string,
  recipientIds: string[],
  conversationId: string,
  encryptionInfo: EncryptionInfo,
  expiresInSeconds: number = 300 // 5 minutes default
): Message {
  return createMessage(
    MessageType.EPHEMERAL,
    content,
    {
      senderId,
      recipientIds,
      conversationId,
      expiresAt: Date.now() + (expiresInSeconds * 1000)
    },
    encryptionInfo
  );
}

/**
 * Update message delivery status
 */
export function updateDeliveryStatus(message: Message, status: DeliveryStatus): Message {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      deliveryStatus: status
    },
    updatedAt: Date.now()
  };
}

/**
 * Add reaction to message
 */
export function addReaction(message: Message, userId: string, emoji: string): Message {
  const existingReaction = message.metadata.reactions?.find(
    r => r.userId === userId && r.emoji === emoji
  );
  
  if (existingReaction) {
    return message; // Reaction already exists
  }
  
  const newReaction: MessageReaction = {
    userId,
    emoji,
    createdAt: Date.now()
  };
  
  return {
    ...message,
    metadata: {
      ...message.metadata,
      reactions: [...(message.metadata.reactions || []), newReaction]
    },
    updatedAt: Date.now()
  };
}

/**
 * Remove reaction from message
 */
export function removeReaction(message: Message, userId: string, emoji: string): Message {
  const reactions = message.metadata.reactions?.filter(
    r => !(r.userId === userId && r.emoji === emoji)
  ) || [];
  
  return {
    ...message,
    metadata: {
      ...message.metadata,
      reactions
    },
    updatedAt: Date.now()
  };
}

/**
 * Add read receipt to message
 */
export function addReadReceipt(message: Message, userId: string): Message {
  const existingReceipt = message.metadata.readReceipts?.find(r => r.userId === userId);
  
  if (existingReceipt) {
    return message; // Receipt already exists
  }
  
  const newReceipt: ReadReceipt = {
    userId,
    readAt: Date.now()
  };
  
  return {
    ...message,
    metadata: {
      ...message.metadata,
      readReceipts: [...(message.metadata.readReceipts || []), newReceipt]
    },
    updatedAt: Date.now()
  };
}

/**
 * Edit message content
 */
export function editMessage(message: Message, newContent: MessageContent, reason?: string): Message {
  const edit: MessageEdit = {
    editedAt: Date.now(),
    previousContent: message.content,
    reason
  };
  
  return {
    ...message,
    content: newContent,
    metadata: {
      ...message.metadata,
      editHistory: [...(message.metadata.editHistory || []), edit]
    },
    updatedAt: Date.now()
  };
}

/**
 * Check if message is expired
 */
export function isMessageExpired(message: Message): boolean {
  if (!message.metadata.expiresAt) {
    return false;
  }
  
  return Date.now() > message.metadata.expiresAt;
}

/**
 * Get message size estimate
 */
export function getMessageSize(message: Message): number {
  // Rough estimate of message size in bytes
  const serialized = JSON.stringify(message);
  return new TextEncoder().encode(serialized).length;
}

/**
 * Check if user can read message
 */
export function canUserReadMessage(message: Message, userId: string): boolean {
  // System messages can be read by anyone in the conversation
  if (message.type === MessageType.SYSTEM) {
    return true;
  }
  
  // Check if user is sender or recipient
  return message.metadata.senderId === userId || 
         message.metadata.recipientIds.includes(userId);
}

/**
 * Check if user can edit message
 */
export function canUserEditMessage(message: Message, userId: string): boolean {
  // Only sender can edit their own messages
  if (message.metadata.senderId !== userId) {
    return false;
  }
  
  // Cannot edit system or ephemeral messages
  if (message.type === MessageType.SYSTEM || message.type === MessageType.EPHEMERAL) {
    return false;
  }
  
  // Cannot edit expired messages
  if (isMessageExpired(message)) {
    return false;
  }
  
  // Cannot edit messages older than 24 hours
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return (Date.now() - message.createdAt) < twentyFourHours;
}

/**
 * Check if user can delete message
 */
export function canUserDeleteMessage(message: Message, userId: string): boolean {
  // Only sender can delete their own messages
  return message.metadata.senderId === userId;
}

/**
 * Get message thread ID
 */
export function getMessageThreadId(message: Message): string {
  // If message is a reply, use the thread ID or create one from the original message
  if (message.metadata.replyToId) {
    return message.metadata.threadId || message.metadata.replyToId;
  }
  
  // If this message starts a thread, use its own ID
  return message.id;
}

/**
 * Create message summary for notifications
 */
export function createMessageSummary(message: Message): string {
  switch (message.type) {
    case MessageType.TEXT:
      const text = message.content.data as string;
      return text.length > 50 ? text.substring(0, 47) + '...' : text;
    
    case MessageType.IMAGE:
      return '📷 Photo';
    
    case MessageType.FILE:
      return `📎 ${message.content.filename || 'File'}`;
    
    case MessageType.VOICE:
      return '🎤 Voice message';
    
    case MessageType.VIDEO:
      return '🎥 Video';
    
    case MessageType.SYSTEM:
      return 'System message';
    
    case MessageType.EPHEMERAL:
      return '⚡ Ephemeral message';
    
    default:
      return 'Message';
  }
}

/**
 * Clone message (for forwarding)
 */
export function cloneMessage(
  originalMessage: Message,
  newSenderId: string,
  newRecipientIds: string[],
  newConversationId: string,
  newEncryptionInfo: EncryptionInfo
): Message {
  return {
    ...originalMessage,
    id: uuidv4(),
    metadata: {
      ...originalMessage.metadata,
      senderId: newSenderId,
      recipientIds: newRecipientIds,
      conversationId: newConversationId,
      forwardedFrom: originalMessage.metadata.senderId,
      deliveryStatus: DeliveryStatus.SENDING,
      reactions: [],
      readReceipts: [],
      replyToId: undefined,
      threadId: undefined
    },
    encryption: newEncryptionInfo,
    createdAt: Date.now(),
    updatedAt: undefined
  };
}