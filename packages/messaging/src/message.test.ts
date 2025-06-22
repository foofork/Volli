import { describe, it, expect, beforeEach } from 'vitest';
import { MessageManager } from './message-manager';
import type { Message, MessageContent } from './types';

describe('MessageManager', () => {
  let messageManager: MessageManager;

  beforeEach(() => {
    messageManager = new MessageManager();
  });

  describe('createMessage', () => {
    it('should create a text message', () => {
      const content: MessageContent = {
        type: 'text',
        text: 'Hello, World!'
      };
      
      const message = messageManager.createMessage(
        'conv-123',
        'sender-123',
        content
      );
      
      expect(message.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(message.conversationId).toBe('conv-123');
      expect(message.senderId).toBe('sender-123');
      expect(message.content).toEqual(content);
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.status).toBe('sending');
      expect(message.version).toBe(1);
    });

    it('should create messages with different types', () => {
      const textMessage = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Hello'
      });
      expect(textMessage.content.type).toBe('text');
      
      const fileMessage = messageManager.createMessage('conv', 'sender', {
        type: 'file',
        fileId: 'file-123',
        fileName: 'document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      });
      expect(fileMessage.content.type).toBe('file');
      
      const imageMessage = messageManager.createMessage('conv', 'sender', {
        type: 'image',
        fileId: 'img-123',
        width: 800,
        height: 600,
        thumbnailId: 'thumb-123'
      });
      expect(imageMessage.content.type).toBe('image');
    });

    it('should set metadata if provided', () => {
      const message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Hello'
      }, {
        replyTo: 'msg-123',
        mentions: ['user-1', 'user-2']
      });
      
      expect(message.metadata?.replyTo).toBe('msg-123');
      expect(message.metadata?.mentions).toEqual(['user-1', 'user-2']);
    });
  });

  describe('updateStatus', () => {
    it('should update message status', () => {
      const message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Test'
      });
      
      expect(message.status).toBe('sending');
      
      const sentMessage = messageManager.updateStatus(message, 'sent');
      expect(sentMessage.status).toBe('sent');
      expect(sentMessage.sentAt).toBeInstanceOf(Date);
      
      const deliveredMessage = messageManager.updateStatus(sentMessage, 'delivered');
      expect(deliveredMessage.status).toBe('delivered');
      expect(deliveredMessage.deliveredAt).toBeInstanceOf(Date);
      
      const readMessage = messageManager.updateStatus(deliveredMessage, 'read');
      expect(readMessage.status).toBe('read');
      expect(readMessage.readAt).toBeInstanceOf(Date);
    });

    it('should handle failed status', () => {
      const message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Test'
      });
      
      const failedMessage = messageManager.updateStatus(message, 'failed');
      expect(failedMessage.status).toBe('failed');
      expect(failedMessage.sentAt).toBeUndefined();
    });
  });

  describe('addReaction', () => {
    it('should add reaction to message', () => {
      const message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Test'
      });
      
      const messageWithReaction = messageManager.addReaction(
        message,
        'user-123',
        '👍'
      );
      
      expect(messageWithReaction.reactions).toHaveLength(1);
      expect(messageWithReaction.reactions![0]).toEqual({
        userId: 'user-123',
        emoji: '👍',
        timestamp: expect.any(Date)
      });
    });

    it('should add multiple reactions', () => {
      let message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Test'
      });
      
      message = messageManager.addReaction(message, 'user-1', '👍');
      message = messageManager.addReaction(message, 'user-2', '❤️');
      message = messageManager.addReaction(message, 'user-1', '😀');
      
      expect(message.reactions).toHaveLength(3);
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction from message', () => {
      let message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Test'
      });
      
      message = messageManager.addReaction(message, 'user-1', '👍');
      message = messageManager.addReaction(message, 'user-2', '❤️');
      
      expect(message.reactions).toHaveLength(2);
      
      message = messageManager.removeReaction(message, 'user-1', '👍');
      expect(message.reactions).toHaveLength(1);
      expect(message.reactions![0].userId).toBe('user-2');
    });

    it('should handle removing non-existent reaction', () => {
      const message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Test'
      });
      
      const unchanged = messageManager.removeReaction(message, 'user-1', '👍');
      expect(unchanged.reactions).toBeUndefined();
    });
  });

  describe('editMessage', () => {
    it('should edit text message content', () => {
      const original = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Original text'
      });
      
      const edited = messageManager.editMessage(original, 'Edited text', 'sender');
      
      expect(edited.content.text).toBe('Edited text');
      expect(edited.editedAt).toBeInstanceOf(Date);
      expect(edited.editedBy).toBe('sender');
      expect(edited.version).toBe(2);
      expect(edited.editHistory).toHaveLength(1);
      expect(edited.editHistory![0].content.text).toBe('Original text');
    });

    it('should not allow editing by different user', () => {
      const message = messageManager.createMessage('conv', 'sender-1', {
        type: 'text',
        text: 'Original'
      });
      
      expect(() => {
        messageManager.editMessage(message, 'Edited', 'sender-2');
      }).toThrow('Only the sender can edit their message');
    });

    it('should not allow editing non-text messages', () => {
      const message = messageManager.createMessage('conv', 'sender', {
        type: 'file',
        fileId: 'file-123'
      });
      
      expect(() => {
        messageManager.editMessage(message, 'New text', 'sender');
      }).toThrow('Can only edit text messages');
    });

    it('should preserve edit history', () => {
      let message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Version 1'
      });
      
      message = messageManager.editMessage(message, 'Version 2', 'sender');
      message = messageManager.editMessage(message, 'Version 3', 'sender');
      
      expect(message.content.text).toBe('Version 3');
      expect(message.version).toBe(3);
      expect(message.editHistory).toHaveLength(2);
      expect(message.editHistory![0].content.text).toBe('Version 1');
      expect(message.editHistory![1].content.text).toBe('Version 2');
    });
  });

  describe('deleteMessage', () => {
    it('should mark message as deleted', () => {
      const message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'To be deleted'
      });
      
      const deleted = messageManager.deleteMessage(message, 'sender');
      
      expect(deleted.deleted).toBe(true);
      expect(deleted.deletedAt).toBeInstanceOf(Date);
      expect(deleted.deletedBy).toBe('sender');
    });

    it('should not allow deleting by non-sender', () => {
      const message = messageManager.createMessage('conv', 'sender-1', {
        type: 'text',
        text: 'Test'
      });
      
      expect(() => {
        messageManager.deleteMessage(message, 'sender-2');
      }).toThrow('Only the sender can delete their message');
    });
  });

  describe('validateMessage', () => {
    it('should validate correct message', () => {
      const message = messageManager.createMessage('conv', 'sender', {
        type: 'text',
        text: 'Valid message'
      });
      
      expect(messageManager.validateMessage(message)).toBe(true);
    });

    it('should reject message without required fields', () => {
      const invalidMessages = [
        { conversationId: 'conv', senderId: 'sender' }, // missing content
        { id: '123', senderId: 'sender', content: { type: 'text' } }, // missing conversationId
        { id: '123', conversationId: 'conv', content: { type: 'text' } }, // missing senderId
      ];
      
      for (const msg of invalidMessages) {
        expect(messageManager.validateMessage(msg as any)).toBe(false);
      }
    });

    it('should reject invalid content types', () => {
      const message = {
        id: '123',
        conversationId: 'conv',
        senderId: 'sender',
        content: { type: 'invalid' },
        timestamp: new Date(),
        status: 'sent' as const,
        version: 1
      };
      
      expect(messageManager.validateMessage(message as any)).toBe(false);
    });
  });
});