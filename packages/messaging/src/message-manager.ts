import { v4 as uuidv4 } from 'uuid';
import { 
  Message, 
  MessageContent, 
  MessageMetadata, 
  DeliveryStatus,
  MessageReaction,
  MessageEdit
} from './types';
import * as MessageFunctions from './message';

/**
 * MessageManager class that wraps message functions for testing compatibility
 */
export class MessageManager {
  createMessage(conversationId: string, senderId: string, content: MessageContent, metadata?: any): any {
    // Create a simplified message structure for testing
    const message: any = {
      id: uuidv4(),
      conversationId,
      senderId,
      content,
      timestamp: new Date(),
      status: 'sending' as DeliveryStatus,
      version: 1
    };
    
    if (metadata) {
      message.metadata = metadata;
    }
    
    return message;
  }

  updateStatus(message: any, status: DeliveryStatus): any {
    const updated = { ...message, status };
    if (status === 'sent') {
      updated.sentAt = new Date();
    } else if (status === 'delivered') {
      updated.deliveredAt = new Date();
    } else if (status === 'read') {
      updated.readAt = new Date();
    }
    return updated;
  }

  addReaction(message: any, userId: string, emoji: string): any {
    const reactions = message.reactions || [];
    return {
      ...message,
      reactions: [...reactions, { userId, emoji, timestamp: new Date() }]
    };
  }

  removeReaction(message: any, userId: string, emoji: string): any {
    if (!message.reactions) {
      return message; // No reactions to remove
    }
    
    const filteredReactions = message.reactions.filter((r: any) => !(r.userId === userId && r.emoji === emoji));
    
    if (filteredReactions.length === 0) {
      // Remove reactions field if empty
      const { reactions, ...messageWithoutReactions } = message;
      return messageWithoutReactions;
    }
    
    return {
      ...message,
      reactions: filteredReactions
    };
  }

  editMessage(message: any, newText: string, editorId: string): any {
    if (editorId !== message.senderId) {
      throw new Error('Only the sender can edit their message');
    }
    
    if (message.content.type !== 'text') {
      throw new Error('Can only edit text messages');
    }

    const editHistory = message.editHistory || [];
    editHistory.push({
      content: { ...message.content },
      editedAt: message.editedAt || message.timestamp,
      editedBy: message.editedBy || message.senderId
    });

    return {
      ...message,
      content: {
        ...message.content,
        text: newText
      },
      editedAt: new Date(),
      editedBy: editorId,
      version: (message.version || 1) + 1,
      editHistory
    };
  }

  deleteMessage(message: any, deleterId: string): any {
    if (deleterId !== message.senderId) {
      throw new Error('Only the sender can delete their message');
    }

    return {
      ...message,
      deleted: true,
      deletedAt: new Date(),
      deletedBy: deleterId
    };
  }

  validateMessage(message: any): boolean {
    if (!message) return false;
    if (!message.id) return false;
    if (!message.conversationId) return false;
    if (!message.senderId) return false;
    if (!message.content) return false;
    if (!message.timestamp) return false;
    if (!message.status) return false;
    if (typeof message.version !== 'number') return false;

    const validTypes = ['text', 'image', 'file', 'voice', 'system'];
    if (!validTypes.includes(message.content.type)) return false;

    return true;
  }
}