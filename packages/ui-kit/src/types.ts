// Type definitions for @volli/ui-kit components

export interface Contact {
  id: string;
  name: string;
  publicKey: string;
  trustLevel?: 'verified' | 'trusted' | 'untrusted';
  lastSeen?: Date | string;
  avatar?: string;
  isOnline?: boolean;
}

export interface Thread {
  id: string;
  name: string;
  participants: number;
  isOnline?: boolean;
  lastMessage?: {
    text: string;
    timestamp: Date | string;
  };
  unreadCount?: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  timestamp: Date | string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface SendMessageEvent {
  detail: {
    message: string;
  };
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEffects: boolean;
  autoBackup: boolean;
  backupInterval: number;
}
