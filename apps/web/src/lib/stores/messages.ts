import { writable, derived, get } from 'svelte/store';
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

// Use persistent message queue from core
const getMessageQueue = () => core.messageQueue;

function createMessagesStore() {
	const { subscribe, set, update } = writable<MessagesState>({
		conversations: new Map(),
		activeConversation: null,
		syncStatus: 'idle',
		isLoading: false,
		error: null
	});

	async function loadConversations(): Promise<void> {
		const authState = get(authStore);
		if (!authState.vaultUnlocked) {
			throw new Error('Vault must be unlocked');
		}

		update(state => ({ ...state, isLoading: true, error: null }));

		try {
			// Get all conversation IDs
			const conversationIds = await core.messaging.getConversations();
			const conversationsMap = new Map<string, Message[]>();

			// Load messages for each conversation
			for (const conversationId of conversationIds) {
				const messages = await core.messaging.getMessages(conversationId);
				if (messages.length > 0) {
					conversationsMap.set(conversationId, messages);
				}
			}

			update(state => ({
				...state,
				conversations: conversationsMap,
				isLoading: false
			}));

			// Trigger sync if online
			if (realNetworkStore.isOnline) {
				syncMessages().catch(console.error);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
			update(state => ({
				...state,
				isLoading: false,
				error: errorMessage
			}));
			throw error;
		}
	}

	async function createConversation(participants: string[]): Promise<string> {
		if (participants.length === 0) {
			throw new Error('Conversation must have participants');
		}

		// Generate conversation ID based on participants
		const currentUser = get(authStore).currentIdentity?.id || 'unknown';
		const allParticipants = [currentUser, ...participants].sort();
		const conversationId = `conv-${allParticipants.join('-')}`;

		// Set as active conversation
		update(state => ({
			...state,
			activeConversation: conversationId,
			conversations: new Map(state.conversations).set(conversationId, [])
		}));

		return conversationId;
	}

	async function sendMessage(content: string): Promise<void> {
		const state = get({ subscribe });
		
		if (!state.activeConversation) {
			throw new Error('No active conversation');
		}

		const currentVault = await core.getCurrentVault();
		if (!currentVault) {
			throw new Error('No vault available');
		}

		try {
			// Send message through core
			const message = await core.messaging.sendMessage(
				state.activeConversation,
				content,
				currentVault
			);

			// Update local state
			update(s => {
				const messages = s.conversations.get(state.activeConversation) || [];
				messages.push(message);
				s.conversations.set(state.activeConversation, messages);
				return { ...s, conversations: new Map(s.conversations) };
			});

			// Queue for network delivery if online
			if (realNetworkStore.isOnline) {
				try {
					await deliverMessage(message);
				} catch (error) {
					await getMessageQueue().enqueue(message);
				}
			} else {
				await getMessageQueue().enqueue(message);
			}
		} catch (error) {
			throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async function markAsRead(conversationId: string): Promise<void> {
		const messages = get({ subscribe }).conversations.get(conversationId) || [];
		
		// Mark all messages in conversation as read
		for (const message of messages) {
			if (message.id && message.status !== 'read') {
				await core.messaging.markAsRead(message.id);
			}
		}

		// Update unread count (stored in component state)
	}

	async function syncMessages(): Promise<void> {
		update(state => ({ ...state, syncStatus: 'syncing' }));

		try {
			// This will be implemented when P2P is ready
			// For now, just process pending queue
			const pendingMessages = await getMessageQueue().getPending();
			
			for (const pendingItem of pendingMessages) {
				try {
					await deliverMessage(pendingItem.message);
					if (pendingItem.id) {
						await getMessageQueue().markDelivered(pendingItem.id);
					}
				} catch (error) {
					console.error('Failed to deliver message:', error);
					if (pendingItem.id) {
						await getMessageQueue().markFailed(pendingItem.id, error instanceof Error ? error.message : 'Unknown error');
					}
				}
			}

			update(state => ({ ...state, syncStatus: 'synced' }));
		} catch (error) {
			console.error('Sync failed:', error);
			update(state => ({ ...state, syncStatus: 'error' }));
		}
	}

	function setActiveConversation(conversationId: string | null): void {
		update(state => ({
			...state,
			activeConversation: conversationId
		}));
	}

	async function searchMessages(query: string): Promise<Message[]> {
		// Use core database search
		return core.database.messages
			.filter(msg => msg.content.toLowerCase().includes(query.toLowerCase()))
			.toArray();
	}

	function getConversationMessages(conversationId: string): Message[] {
		const state = get({ subscribe });
		return state.conversations.get(conversationId) || [];
	}

	async function deleteMessage(messageId: number): Promise<void> {
		await core.messaging.deleteMessage(messageId);
		
		// Update local state
		update(state => {
			state.conversations.forEach((messages, conversationId) => {
				const filtered = messages.filter(m => m.id !== messageId);
				if (filtered.length !== messages.length) {
					state.conversations.set(conversationId, filtered);
				}
			});
			return { ...state, conversations: new Map(state.conversations) };
		});
	}

	async function deleteConversation(conversationId: string): Promise<void> {
		await core.messaging.deleteConversation(conversationId);
		
		// Update local state
		update(state => {
			state.conversations.delete(conversationId);
			if (state.activeConversation === conversationId) {
				state.activeConversation = null;
			}
			return { ...state, conversations: new Map(state.conversations) };
		});
	}

	async function deliverMessage(message: Message): Promise<void> {
		// Use real network store for delivery
		const endpoint = await realNetworkStore.getSyncEndpoint();
		await endpoint.sendMessage(message);
	}

	async function reset() {
		set({
			conversations: new Map(),
			activeConversation: null,
			syncStatus: 'idle',
			isLoading: false,
			error: null
		});
		await getMessageQueue().clear();
	}

	// Build conversation objects from messages
	function getConversations(): Conversation[] {
		const state = get({ subscribe });
		const conversations: Conversation[] = [];

		state.conversations.forEach((messages, conversationId) => {
			if (messages.length > 0) {
				const participants = Array.from(new Set(messages.map(m => m.senderId)));
				conversations.push({
					id: conversationId,
					participants,
					messages,
					createdAt: messages[0].timestamp,
					lastActivity: messages[messages.length - 1].timestamp,
					unreadCount: messages.filter(m => m.status === 'pending' || m.status === 'sent').length
				});
			}
		});

		// Sort by most recent activity
		return conversations.sort((a, b) => b.lastActivity - a.lastActivity);
	}

	// Expose internal methods for testing
	const store = {
		subscribe,
		loadConversations,
		createConversation,
		sendMessage,
		markAsRead,
		syncMessages,
		setActiveConversation,
		searchMessages,
		getConversationMessages,
		deleteMessage,
		deleteConversation,
		getConversations,
		reset,
		// Internal methods exposed for testing
		networkStore: realNetworkStore,
		messageQueue: getMessageQueue()
	};

	return store;
}

export const messagesStore = createMessagesStore();
export const messages = messagesStore; // Backward compatibility

// Derived stores
export const conversations = derived(
	messagesStore,
	$messages => messagesStore.getConversations()
);

export const activeConversation = derived(
	messagesStore,
	$messages => {
		if (!$messages.activeConversation) return null;
		const convs = messagesStore.getConversations();
		return convs.find(c => c.id === $messages.activeConversation) || null;
	}
);

export const activeMessages = derived(
	messagesStore,
	$messages => {
		if (!$messages.activeConversation) return [];
		return $messages.conversations.get($messages.activeConversation) || [];
	}
);