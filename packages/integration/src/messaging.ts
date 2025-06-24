import { VolliDB, Message, Vault } from './database';
import type { VolliCore } from './index';

export class MessagingService {
  constructor(
    private db: VolliDB,
    private core: VolliCore
  ) {}
  
  async sendMessage(
    conversationId: string,
    content: string,
    senderVault: Vault
  ): Promise<Message> {
    // For now, store unencrypted until we have proper key exchange
    // TODO: Implement proper end-to-end encryption with recipient's public key
    
    const message: Message = {
      conversationId,
      content,
      senderId: senderVault.id,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // Store in Dexie (auto-generates ID)
    const id = await this.db.messages.add(message);
    message.id = id;
    
    // TODO: Queue for P2P delivery
    // For now, just mark as sent locally
    await this.db.messages.update(id, { status: 'sent' });
    
    return { ...message, status: 'sent' };
  }
  
  async getMessages(conversationId: string): Promise<Message[]> {
    return this.db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('timestamp');
  }
  
  async getConversations(): Promise<string[]> {
    // Get unique conversation IDs
    const messages = await this.db.messages.toArray();
    const conversationIds = new Set<string>(messages.map((m: Message) => m.conversationId));
    return Array.from(conversationIds);
  }
  
  async getLastMessage(conversationId: string): Promise<Message | null> {
    const messages = await this.db.messages
      .where('conversationId')
      .equals(conversationId)
      .reverse()
      .limit(1)
      .toArray();
    
    return messages[0] || null;
  }
  
  async markAsRead(messageId: number): Promise<void> {
    await this.db.messages.update(messageId, { status: 'read' });
  }
  
  async deleteMessage(messageId: number): Promise<void> {
    await this.db.messages.delete(messageId);
  }
  
  async deleteConversation(conversationId: string): Promise<void> {
    await this.db.messages
      .where('conversationId')
      .equals(conversationId)
      .delete();
  }
}