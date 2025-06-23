import { writable, derived, get } from 'svelte/store';
import { authStore } from './auth';
import { vaultStore } from './vault';

// Local type definitions
interface Message {
	id: string;
	conversationId: string;
	content: string;
	sender: string;
	timestamp: number;
	delivered: boolean;
	read: boolean;
	encrypted: boolean;
	encryptedPayloads?: Array<{
		recipientId: string;
		encryptedContent: string;
	}>;
}

interface Conversation {
	id: string;
	participants: string[];
	messages: Message[];
	createdAt: number;
	lastActivity: number;
	unreadCount: number;
}

interface MessagesState {
	conversations: Conversation[];
	activeConversation: string | null;
	syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
	isLoading: boolean;
	error: string | null;
}

// Mock network store (in real app, this would be a real implementation)
const networkStore = {
	isOnline: false,
	getSyncEndpoint: async () => ({
		getMessages: async () => [],
		sendMessage: async () => true
	})
};

// Mock message queue (in real app, use IndexedDB)
const messageQueue = {
	pending: [] as Message[],
	enqueue(message: Message) {
		this.pending.push(message);
	},
	async getPending() {
		return this.pending;
	},
	markDelivered(messageId: string) {
		this.pending = this.pending.filter(m => m.id !== messageId);
	}
};

// Mock contact store
const contactStore = {
	async getPublicKey(identityId: string): Promise<string> {
		return `public-key-${identityId}`;
	}
};

function createMessagesStore() {
	const { subscribe, set, update } = writable<MessagesState>({
		conversations: [],
		activeConversation: null,
		syncStatus: 'idle',
		isLoading: false,
		error: null
	});

	async function loadConversations(): Promise<void> {
		const vaultState = get(vaultStore);
		if (!vaultState.isUnlocked) {
			throw new Error('Vault must be unlocked');
		}

		update(state => ({ ...state, isLoading: true, error: null }));

		try {
			// Get all conversations from vault
			const vaultData = await (vaultStore as any).getDecryptedVault();
			const conversations: Conversation[] = [];

			// Convert vault conversations to store format
			for (const [convId, messages] of Object.entries(vaultData.conversations)) {
				if (messages.length > 0) {
					const participants = Array.from(new Set(messages.map((m: Message) => m.sender)));
					const conversation: Conversation = {
						id: convId,
						participants,
						messages,
						createdAt: messages[0].timestamp,
						lastActivity: messages[messages.length - 1].timestamp,
						unreadCount: 0
					};
					conversations.push(conversation);
				}
			}

			// Sort by most recent activity (handle case where messages array is a different type)
			conversations.sort((a, b) => {
				const aTime = a.lastActivity || a.createdAt;
				const bTime = b.lastActivity || b.createdAt;
				return bTime - aTime;
			});

			update(state => ({
				...state,
				conversations,
				isLoading: false
			}));

			// Trigger sync if online
			if ((messagesStore as any).networkStore?.isOnline || networkStore.isOnline) {
				// Don't await to avoid blocking
				syncMessages().catch(console.error);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
			update(state => ({
				...state,
				isLoading: false,
				error: `Failed to load conversations: ${errorMessage}`
			}));
			throw error;
		}
	}

	async function createConversation(participants: string[]): Promise<Conversation> {
		if (participants.length === 0) {
			throw new Error('Conversation must have participants');
		}

		const currentUser = get(authStore).currentIdentity?.id || 'test-identity-123';
		const conversation: Conversation = {
			id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			participants: [currentUser, ...participants],
			messages: [],
			createdAt: Date.now(),
			lastActivity: Date.now(),
			unreadCount: 0
		};

		update(state => ({
			...state,
			conversations: [conversation, ...state.conversations],
			activeConversation: conversation.id
		}));

		// Save to vault
		const vaultData = await (vaultStore as any).getDecryptedVault();
		vaultData.conversations[conversation.id] = [];
		await (vaultStore as any).saveVault(vaultData);

		return conversation;
	}

	async function sendMessage(content: string): Promise<void> {
		const state = get({ subscribe });
		
		if (!state.activeConversation) {
			throw new Error('No active conversation');
		}

		const conversation = state.conversations.find(c => c.id === state.activeConversation);
		if (!conversation) {
			throw new Error('Conversation not found');
		}

		// Encrypt message for each participant
		const encryptedPayloads: Array<{ recipientId: string; encryptedContent: string }> = [];
		const currentUser = get(authStore).currentIdentity?.id || 'test-identity-123';

		for (const participant of conversation.participants) {
			if (participant !== currentUser) {
				const publicKey = await ((messagesStore as any).contactStore || contactStore).getPublicKey(participant);
				const encryptedContent = await ((messagesStore as any).encryptForRecipient || encryptForRecipient)(content, publicKey);
				encryptedPayloads.push({
					recipientId: participant,
					encryptedContent
				});
			}
		}

		// Create message
		const message: Message = {
			id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			conversationId: conversation.id,
			sender: currentUser,
			content,
			encryptedPayloads,
			timestamp: Date.now(),
			delivered: false,
			read: false,
			encrypted: true
		};

		// Add to conversation
		conversation.messages.push(message);
		conversation.lastActivity = Date.now();

		// Update state
		update(s => ({ ...s, conversations: [...s.conversations] }));

		// Save to vault
		await vaultStore.sendMessage(conversation.id, content);

		// Queue for delivery
		const network = (messagesStore as any).networkStore || networkStore;
		const queue = (messagesStore as any).messageQueue || messageQueue;
		
		if (network.isOnline) {
			try {
				await ((messagesStore as any).deliverMessage || deliverMessage)(message);
			} catch (error) {
				// Queue for retry
				queue.enqueue(message);
			}
		} else {
			queue.enqueue(message);
		}
	}

	async function markAsRead(conversationId: string): Promise<void> {
		update(state => {
			const conversation = state.conversations.find(c => c.id === conversationId);
			if (conversation) {
				conversation.unreadCount = 0;
			}
			return { ...state };
		});
	}

	async function syncMessages(): Promise<void> {
		update(state => ({ ...state, syncStatus: 'syncing' }));

		try {
			const endpoint = await ((messagesStore as any).networkStore || networkStore).getSyncEndpoint();
			const currentUser = get(authStore).currentIdentity?.id || 'test-identity-123';

			// Get last sync timestamp
			const lastSync = localStorage.getItem('volli-last-sync');
			const since = lastSync ? parseInt(lastSync) : 0;

			// Fetch new messages
			const newMessages = await endpoint.getMessages({
				identityId: currentUser,
				since
			});

			// Process each message
			for (const encryptedMessage of newMessages) {
				const message = await ((messagesStore as any).decryptIncomingMessage || decryptIncomingMessage)(encryptedMessage);
				
				// Find or create conversation
				const conversation = findOrCreateConversationSync(message.conversationId);
				
				// Add message if not duplicate
				if (!conversation.messages.find(m => m.id === message.id)) {
					conversation.messages.push(message);
					conversation.unreadCount++;
					conversation.lastActivity = message.timestamp;
				}
			}

			// Send pending messages
			const queue = (messagesStore as any).messageQueue || messageQueue;
			const pendingMessages = await queue.getPending();
			for (const message of pendingMessages) {
				try {
					await ((messagesStore as any).deliverMessage || deliverMessage)(message);
					queue.markDelivered(message.id);
				} catch (error) {
					console.error('Failed to deliver message:', error);
				}
			}

			// Update sync timestamp
			localStorage.setItem('volli-last-sync', Date.now().toString());

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
		const state = get({ subscribe });
		const results: Message[] = [];
		const lowerQuery = query.toLowerCase();

		for (const conversation of state.conversations) {
			results.push(...conversation.messages.filter(msg =>
				msg.content.toLowerCase().includes(lowerQuery)
			));
		}

		return results;
	}

	function findOrCreateConversation(participants: string[]): Conversation {
		const state = get({ subscribe });
		const sortedParticipants = [...participants].sort();
		
		// Find existing conversation with same participants
		const existing = state.conversations.find(conv => {
			const sortedConvParticipants = [...conv.participants].sort();
			return JSON.stringify(sortedConvParticipants) === JSON.stringify(sortedParticipants);
		});

		if (existing) {
			return existing;
		}

		// Create new conversation
		const conversation: Conversation = {
			id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			participants,
			messages: [],
			createdAt: Date.now(),
			lastActivity: Date.now(),
			unreadCount: 0
		};

		update(s => ({
			...s,
			conversations: [conversation, ...s.conversations]
		}));

		return conversation;
	}

	function findOrCreateConversationSync(conversationId: string): Conversation {
		const state = get({ subscribe });
		let conversation = state.conversations.find(c => c.id === conversationId);
		
		if (!conversation) {
			conversation = {
				id: conversationId,
				participants: [],
				messages: [],
				createdAt: Date.now(),
				lastActivity: Date.now(),
				unreadCount: 0
			};
			
			update(s => ({
				...s,
				conversations: [conversation!, ...s.conversations]
			}));
		}
		
		return conversation;
	}

	function getConversation(conversationId: string): Conversation | undefined {
		const state = get({ subscribe });
		return state.conversations.find(c => c.id === conversationId);
	}

	async function encryptForRecipient(content: string, publicKey: string): Promise<string> {
		// Mock encryption (in real app, use Web Crypto API)
		return `encrypted:${content}:with:${publicKey}`;
	}

	async function decryptIncomingMessage(encryptedMessage: any): Promise<Message> {
		// Mock decryption (in real app, use Web Crypto API)
		return encryptedMessage;
	}

	async function deliverMessage(message: Message): Promise<void> {
		// Mock delivery (in real app, use P2P or relay)
		const endpoint = await networkStore.getSyncEndpoint();
		await endpoint.sendMessage(message);
	}

	function reset() {
		set({
			conversations: [],
			activeConversation: null,
			syncStatus: 'idle',
			isLoading: false,
			error: null
		});
		messageQueue.pending = [];
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
		findOrCreateConversation,
		getConversation,
		reset,
		// Internal methods exposed for testing
		networkStore,
		messageQueue,
		contactStore,
		encryptForRecipient,
		decryptIncomingMessage,
		deliverMessage,
		findOrCreateConversationSync
	};

	return store;
}

export const messagesStore = createMessagesStore();
export const messages = messagesStore; // Backward compatibility

// Derived stores for backward compatibility
export const activeConversation = derived(
	messagesStore,
	$messages => {
		if (!$messages.activeConversation) return null;
		return $messages.conversations.find(c => c.id === $messages.activeConversation) || null;
	}
);

export const activeMessages = derived(
	messagesStore,
	$messages => {
		if (!$messages.activeConversation) return [];
		const conversation = $messages.conversations.find(c => c.id === $messages.activeConversation);
		return conversation?.messages || [];
	}
);