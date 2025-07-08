import { VolliDB, Message, Vault, Contact } from './database';
import type { VolliCore } from './index';
import { 
  initPostQuantumEncryption, 
  encryptPostQuantumMessage,
  decryptPostQuantumMessage,
  type PostQuantumEncryptedMessage 
} from '@volli/messaging';
import { type PublicKey, type PrivateKey } from '@volli/identity-core';

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
   * Encrypt a message for a specific recipient using post-quantum ML-KEM-768
   * Returns the encrypted content that can only be decrypted by the recipient
   */
  async encryptForRecipient(content: string, recipientPublicKey: string): Promise<string> {
    await initPostQuantumEncryption();
    
    // Parse the recipient's public key
    const publicKey: PublicKey = JSON.parse(recipientPublicKey);
    
    // Create message content object
    const messageContent = {
      data: content,
      mimeType: 'text/plain'
    };
    
    // Encrypt using post-quantum encryption
    const encrypted: PostQuantumEncryptedMessage = await encryptPostQuantumMessage(
      messageContent,
      publicKey
    );
    
    // Package for storage/transmission
    const encryptedMessage = {
      encryptedContent: Array.from(encrypted.encryptedContent),
      encryptionInfo: encrypted.encryptionInfo,
      kemCiphertext: Array.from(encrypted.kemCiphertext),
      postQuantumKeyId: encrypted.postQuantumKeyId,
      version: 2 // Post-quantum version
    };
    
    // Return as JSON string
    return JSON.stringify(encryptedMessage);
  }
  
  /**
   * Decrypt a message using post-quantum decryption
   */
  async decryptForRecipient(encryptedContent: string, recipientPrivateKey: string): Promise<string> {
    await initPostQuantumEncryption();
    
    // Parse the encrypted message
    const encryptedMessage = JSON.parse(encryptedContent);
    
    // Parse the recipient's private key
    const privateKey: PrivateKey = JSON.parse(recipientPrivateKey);
    
    // Reconstruct the post-quantum encrypted message
    const encrypted: PostQuantumEncryptedMessage = {
      encryptedContent: new Uint8Array(encryptedMessage.encryptedContent),
      encryptionInfo: encryptedMessage.encryptionInfo,
      kemCiphertext: new Uint8Array(encryptedMessage.kemCiphertext),
      postQuantumKeyId: encryptedMessage.postQuantumKeyId
    };
    
    // Decrypt using post-quantum decryption
    const messageContent = await decryptPostQuantumMessage(encrypted, privateKey);
    
    // Return the decrypted text content
    return messageContent.data as string;
  }

  /**
   * Get the public key for a contact
   */
  async getContactPublicKey(contactId: string): Promise<string | null> {
    const contact = await this.db.contacts.get(contactId);
    return contact?.publicKey || null;
  }
}