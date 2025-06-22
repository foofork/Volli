import { writable, derived } from 'svelte/store';
import { vault } from './vault';

// Local type definitions
interface MessageContent {
	type: 'text' | 'file' | 'image';
	text?: string;
	fileId?: string;
	metadata?: Record<string, any>;
}

interface Message {
	id: string;
	conversationId: string;
	senderId: string;
	content: MessageContent;
	timestamp: Date;
	status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
	version: number;
}

interface Conversation {
	id: string;
	type: 'direct' | 'group';
	participants: string[];
	createdAt: Date;
	updatedAt: Date;
	lastMessage?: Message;
	metadata: {
		name: string;
		avatar: string;
		description: string;
	};
}

interface MessagesState {
	conversations: Map<string, Conversation>;
	messages: Map<string, Message[]>;
	activeConversationId: string | null;
	isLoading: boolean;
	error: string | null;
}

function createMessagesStore() {
	const { subscribe, set, update } = writable<MessagesState>({
		conversations: new Map(),
		messages: new Map(),
		activeConversationId: null,
		isLoading: false,
		error: null
	});

	async function loadConversations() {
		update(state => ({ ...state, isLoading: true, error: null }));
		
		try {
			const conversations = await vault.query('messages', {
				type: 'conversation'
			});
			
			const conversationsMap = new Map<string, Conversation>();
			conversations.forEach((conv: Conversation) => {
				conversationsMap.set(conv.id, conv);
			});
			
			update(state => ({
				...state,
				conversations: conversationsMap,
				isLoading: false
			}));
		} catch (error) {
			update(state => ({
				...state,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to load conversations'
			}));
		}
	}

	async function loadMessages(conversationId: string) {
		try {
			const messages = await vault.query('messages', {
				conversationId,
				type: 'message'
			});
			
			update(state => {
				const newMessages = new Map(state.messages);
				newMessages.set(conversationId, messages);
				return { ...state, messages: newMessages };
			});
		} catch (error) {
			update(state => ({
				...state,
				error: error instanceof Error ? error.message : 'Failed to load messages'
			}));
		}
	}

	async function createConversation(participants: string[], name?: string): Promise<string> {
		const conversation: Conversation = {
			id: crypto.randomUUID(),
			type: participants.length > 2 ? 'group' : 'direct',
			participants,
			createdAt: new Date(),
			updatedAt: new Date(),
			metadata: {
				name: name || `Chat with ${participants.join(', ')}`,
				avatar: '',
				description: ''
			}
		};
		
		await vault.store('messages', { ...conversation, type: 'conversation' });
		
		update(state => {
			const newConversations = new Map(state.conversations);
			newConversations.set(conversation.id, conversation);
			return { ...state, conversations: newConversations };
		});
		
		return conversation.id;
	}

	async function sendMessage(conversationId: string, content: MessageContent) {
		const message: Message = {
			id: crypto.randomUUID(),
			conversationId,
			senderId: 'current-user', // Get from auth store
			content,
			timestamp: new Date(),
			status: 'sent',
			version: 1
		};
		
		await vault.store('messages', { ...message, type: 'message' });
		
		update(state => {
			const newMessages = new Map(state.messages);
			const conversationMessages = newMessages.get(conversationId) || [];
			newMessages.set(conversationId, [...conversationMessages, message]);
			
			// Update conversation's last message
			const newConversations = new Map(state.conversations);
			const conversation = newConversations.get(conversationId);
			if (conversation) {
				conversation.lastMessage = message;
				conversation.updatedAt = new Date();
				newConversations.set(conversationId, conversation);
			}
			
			return { 
				...state, 
				messages: newMessages,
				conversations: newConversations
			};
		});
	}

	function setActiveConversation(conversationId: string | null) {
		update(state => ({ ...state, activeConversationId: conversationId }));
		if (conversationId) {
			loadMessages(conversationId);
		}
	}

	return {
		subscribe,
		loadConversations,
		loadMessages,
		createConversation,
		sendMessage,
		setActiveConversation
	};
}

export const messages = createMessagesStore();

export const activeConversation = derived(
	messages,
	$messages => $messages.activeConversationId ? 
		$messages.conversations.get($messages.activeConversationId) : null
);

export const activeMessages = derived(
	messages,
	$messages => $messages.activeConversationId ? 
		$messages.messages.get($messages.activeConversationId) || [] : []
);