import { VolliDB, Message, Vault, Contact } from './database';
import type { VolliCore } from './index';
import { keyEncapsulation, encryptData, initCrypto } from '@volli/identity-core';

export class MessagingService {
  constructor(
    private db: VolliDB,
    private core: VolliCore
  ) {}
  
  async sendMessage(
    conversationId: string,
    content: string,
    senderVault: Vault,
    recipientIds?: string[]
  ): Promise<Message> {
    const message: Message = {
      conversationId,
      content,
      senderId: senderVault.id,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // If recipients are specified, encrypt for each recipient
    if (recipientIds && recipientIds.length > 0) {
      const encryptedVersions: Record<string, string> = {};
      
      for (const recipientId of recipientIds) {
        const publicKey = await this.getContactPublicKey(recipientId);
        if (publicKey) {
          try {
            const encrypted = await this.encryptForRecipient(content, publicKey);
            encryptedVersions[recipientId] = encrypted;
          } catch (error) {
            console.error(`Failed to encrypt for recipient ${recipientId}:`, error);
          }
        }
      }
      
      // Store encrypted versions (in real app, would send these to recipients)
      message.encryptedContent = JSON.stringify(encryptedVersions);
    }
    
    // Store in Dexie (auto-generates ID)
    const id = await this.db.messages.add(message);
    message.id = id;
    
    // TODO: Queue for P2P delivery with encrypted versions
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
  
  /**
   * Encrypt a message for a specific recipient using their public key
   * Returns the encrypted content that can only be decrypted by the recipient
   */
  async encryptForRecipient(content: string, recipientPublicKey: string): Promise<string> {
    await initCrypto();
    
    // Parse the recipient's public key
    const publicKey = JSON.parse(recipientPublicKey);
    
    // Perform key encapsulation to get a shared secret
    const { sharedSecret, ciphertext: kemCiphertext } = await keyEncapsulation(publicKey);
    
    // Convert content to bytes
    const contentBytes = new TextEncoder().encode(content);
    
    // Encrypt the content with the shared secret
    const { ciphertext, nonce } = await encryptData(contentBytes, sharedSecret);
    
    // Package everything together
    const encryptedMessage = {
      kemCiphertext: Array.from(kemCiphertext),
      ciphertext: Array.from(ciphertext),
      nonce: Array.from(nonce)
    };
    
    // Return as JSON string
    return JSON.stringify(encryptedMessage);
  }
  
  /**
   * Get the public key for a contact
   */
  async getContactPublicKey(contactId: string): Promise<string | null> {
    const contact = await this.db.contacts.get(contactId);
    return contact?.publicKey || null;
  }
}