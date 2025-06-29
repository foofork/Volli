// Svelte 5 Runes-based Messages Store
// This is the modern approach using $state and $derived runes

import { get } from 'svelte/store';
import { authStore } from './auth';
import { core } from './core';
import type { Message } from '@volli/integration';

// Local type definitions
interface Conversation {
	id: string;
	participants: string[];
	messages: Message[];
	createdAt: number;
	lastActivity: number;
	unreadCount: number;
}

interface MessagesState {
	conversations: Map<string, Message[]>;
	activeConversation: string | null;
	syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
	isLoading: boolean;
	error: string | null;
}

// Import real network store from integration package
import { networkStore as realNetworkStore } from '@volli/integration';

/**
 * Svelte 5 Runes-based Messages Store
 * Uses $state and $derived for reactive state management
 */
class MessagesStoreRunes {
	// Core reactive state using Svelte 5 runes
	private state = $state<MessagesState>({
		conversations: new Map(),
		activeConversation: null,
		syncStatus: 'idle',
		isLoading: false,
		error: null
	});

	// Derived computed values
	conversations = $derived(this.state.conversations);
	activeConversation = $derived(this.state.activeConversation);
	syncStatus = $derived(this.state.syncStatus);
	isLoading = $derived(this.state.isLoading);
	error = $derived(this.state.error);

	// Derived active messages
	activeMessages = $derived(() => {
		if (!this.state.activeConversation) return [];
		return this.state.conversations.get(this.state.activeConversation) || [];
	});

	// Derived conversation list for UI
	conversationList = $derived(() => {
		const convs: Conversation[] = [];
		for (const [id, messages] of this.state.conversations) {
			if (messages.length === 0) continue;
			
			const lastMessage = messages[messages.length - 1];
			const unreadCount = messages.filter(m => !m.read).length;
			
			convs.push({
				id,
				participants: [...new Set(messages.map(m => m.senderId))],
				messages,
				createdAt: messages[0]?.timestamp || Date.now(),
				lastActivity: lastMessage?.timestamp || Date.now(),
				unreadCount
			});
		}
		
		// Sort by last activity
		return convs.sort((a, b) => b.lastActivity - a.lastActivity);
	});

	// Derived total unread count
	totalUnreadCount = $derived(() => {
		let total = 0;
		for (const conversation of this.conversationList) {
			total += conversation.unreadCount;
		}
		return total;
	});

	// Actions
	async loadConversations(): Promise<void> {
		const authState = get(authStore);
		if (!authState.vaultUnlocked) {
			throw new Error('Vault must be unlocked');
		}

		this.state.isLoading = true;
		this.state.error = null;

		try {
			// Get all conversation IDs
			const conversationIds = await core.messaging.getConversations();
			const conversationsMap = new Map<string, Message[]>();

			// Load messages for each conversation
			for (const conversationId of conversationIds) {
				try {
					const messages = await core.messaging.getMessages(conversationId);
					conversationsMap.set(conversationId, messages);
				} catch (error) {
					console.warn(`Failed to load conversation ${conversationId}:`, error);
				}
			}

			this.state.conversations = conversationsMap;
			this.state.syncStatus = 'synced';
		} catch (error) {
			console.error('Failed to load conversations:', error);
			this.state.error = error instanceof Error ? error.message : 'Unknown error';
			this.state.syncStatus = 'error';
		} finally {
			this.state.isLoading = false;
		}
	}

	async sendMessage(content: string): Promise<void> {
		if (!this.state.activeConversation) {
			throw new Error('No active conversation');
		}

		const authState = get(authStore);
		if (!authState.currentIdentity) {
			throw new Error('No identity available');
		}

		this.state.syncStatus = 'syncing';

		try {
			const message: Message = {
				id: crypto.randomUUID(),
				conversationId: this.state.activeConversation,
				senderId: authState.currentIdentity.id,
				content,
				timestamp: Date.now(),
				type: 'text',
				read: false
			};

			// Send through core messaging
			await core.messaging.sendMessage(this.state.activeConversation, message);

			// Update local state immediately for optimistic UI
			const currentMessages = this.state.conversations.get(this.state.activeConversation) || [];
			this.state.conversations.set(this.state.activeConversation, [...currentMessages, message]);

			this.state.syncStatus = 'synced';
		} catch (error) {
			console.error('Failed to send message:', error);
			this.state.syncStatus = 'error';
			throw error;
		}
	}

	async createConversation(participantId: string): Promise<string> {
		const authState = get(authStore);
		if (!authState.currentIdentity) {
			throw new Error('No identity available');
		}

		this.state.isLoading = true;

		try {
			const conversationId = await core.messaging.createConversation([
				authState.currentIdentity.id,
				participantId
			]);

			// Initialize empty conversation
			this.state.conversations.set(conversationId, []);
			this.setActiveConversation(conversationId);

			return conversationId;
		} catch (error) {
			console.error('Failed to create conversation:', error);
			throw error;
		} finally {
			this.state.isLoading = false;
		}
	}

	setActiveConversation(conversationId: string | null): void {
		this.state.activeConversation = conversationId;

		// Mark messages as read when conversation becomes active
		if (conversationId) {
			const messages = this.state.conversations.get(conversationId);
			if (messages) {
				const updatedMessages = messages.map(m => ({ ...m, read: true }));
				this.state.conversations.set(conversationId, updatedMessages);
			}
		}
	}

	async deleteConversation(conversationId: string): Promise<void> {
		try {
			await core.messaging.deleteConversation(conversationId);
			this.state.conversations.delete(conversationId);

			// Clear active conversation if it was deleted
			if (this.state.activeConversation === conversationId) {
				this.state.activeConversation = null;
			}
		} catch (error) {
			console.error('Failed to delete conversation:', error);
			throw error;
		}
	}

	async syncWithNetwork(): Promise<void> {
		this.state.syncStatus = 'syncing';

		try {
			// Sync with network through core
			await core.messaging.sync();
			
			// Reload conversations to get latest data
			await this.loadConversations();
			
			this.state.syncStatus = 'synced';
		} catch (error) {
			console.error('Failed to sync messages:', error);
			this.state.syncStatus = 'error';
			throw error;
		}
	}

	// Effect for auto-sync (replaces onMount subscriptions)
	startAutoSync(): () => void {
		let syncInterval: NodeJS.Timeout;

		const startSync = () => {
			// Sync every 30 seconds when online
			syncInterval = setInterval(() => {
				if (navigator.onLine) {
					this.syncWithNetwork().catch(console.error);
				}
			}, 30000);
		};

		// Start initial sync
		startSync();

		// Listen for online/offline events
		const handleOnline = () => {
			startSync();
			this.syncWithNetwork().catch(console.error);
		};

		const handleOffline = () => {
			if (syncInterval) {
				clearInterval(syncInterval);
			}
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Cleanup function
		return () => {
			if (syncInterval) {
				clearInterval(syncInterval);
			}
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}

	// Reset store state
	reset(): void {
		this.state.conversations = new Map();
		this.state.activeConversation = null;
		this.state.syncStatus = 'idle';
		this.state.isLoading = false;
		this.state.error = null;
	}
}

// Export singleton instance
export const messagesRunes = new MessagesStoreRunes();

// Export individual getters for backward compatibility during migration
export const conversations = () => messagesRunes.conversations;
export const activeConversation = () => messagesRunes.activeConversation;
export const activeMessages = () => messagesRunes.activeMessages;
export const conversationList = () => messagesRunes.conversationList;
export const totalUnreadCount = () => messagesRunes.totalUnreadCount;