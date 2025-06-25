export interface Message {
  id?: number;
  conversationId: string;
  content: string;
  senderId: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  encryptedContent?: string;
}

export interface Contact {
  id: string;
  publicKey: string;
  displayName: string;
  addedAt: number;
  lastSeen?: number;
}

export interface Vault {
  id: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: number;
  updatedAt?: number;
}