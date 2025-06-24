<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { messages, conversations, activeConversation, activeMessages } from '$lib/stores/messages';
	import { toasts } from '$lib/stores/toasts';
	
	let messageInput = '';
	let isCreatingConversation = false;
	let newConversationParticipant = '';
	let showNewConversation = false;
	let isSendingMessage = false;
	
	onMount(() => {
		// Conversations are loaded by the layout when vault is unlocked
		// Just ensure we're subscribed to the store
		const unsubscribe = messages.subscribe(() => {
			// Trigger reactivity
		});
		
		return unsubscribe;
	});
	
	async function handleSendMessage() {
		if (!messageInput.trim() || !$activeConversation || isSendingMessage) return;
		
		isSendingMessage = true;
		const message = messageInput.trim();
		messageInput = ''; // Clear input immediately for better UX
		
		try {
			await messages.sendMessage(message);
		} catch (error) {
			console.error('Failed to send message:', error);
			// Restore message on error
			messageInput = message;
			toasts.error('Failed to send message. Please try again.');
		} finally {
			isSendingMessage = false;
		}
	}
	
	async function createNewConversation() {
		if (!newConversationParticipant.trim()) return;
		
		isCreatingConversation = true;
		
		try {
			// In a real app, this would be an actual user ID
			// For demo, we'll create a mock participant
			const participantId = `user-${newConversationParticipant.toLowerCase().replace(/\s+/g, '-')}`;
			const conversationId = await messages.createConversation([participantId]);
			messages.setActiveConversation(conversationId);
			
			// Reset form
			newConversationParticipant = '';
			showNewConversation = false;
			toasts.success('Conversation created successfully!');
		} catch (error) {
			console.error('Failed to create conversation:', error);
			toasts.error('Failed to create conversation. Please try again.');
		} finally {
			isCreatingConversation = false;
		}
	}
	
	function toggleNewConversation() {
		showNewConversation = !showNewConversation;
		if (!showNewConversation) {
			newConversationParticipant = '';
		}
	}
	
	function selectConversation(id: string) {
		messages.setActiveConversation(id);
	}
	
	function formatTime(timestamp: number) {
		const date = new Date(timestamp);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		
		if (isToday) {
			return new Intl.DateTimeFormat('en-US', {
				hour: 'numeric',
				minute: 'numeric',
				hour12: true
			}).format(date);
		} else {
			return new Intl.DateTimeFormat('en-US', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				hour12: true
			}).format(date);
		}
	}
	
	function getConversationName(conversation: any) {
		// In a real app, we'd look up participant names
		// For demo, we'll generate a name from the participant ID
		const otherParticipants = conversation.participants.filter(
			(p: string) => p !== $auth.currentIdentity?.id && p !== 'test-identity-123'
		);
		
		if (otherParticipants.length === 0) {
			return 'Self';
		} else if (otherParticipants.length === 1) {
			// Convert user-john-doe to John Doe
			return otherParticipants[0]
				.replace('user-', '')
				.split('-')
				.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		} else {
			return `Group (${otherParticipants.length} participants)`;
		}
	}
	
	function getLastMessagePreview(conversation: any) {
		if (conversation.messages.length === 0) {
			return 'No messages yet';
		}
		
		const lastMessage = conversation.messages[conversation.messages.length - 1];
		const isSent = lastMessage.senderId === $auth.currentIdentity?.id || 
		              lastMessage.senderId === 'test-identity-123';
		
		return (isSent ? 'You: ' : '') + lastMessage.content;
	}
</script>

<div class="messages-layout">
	<div class="conversation-list">
		<div class="list-header">
			<h2>Messages</h2>
			<button class="new-chat" on:click={toggleNewConversation}>
				+ New Chat
			</button>
		</div>
		
		{#if showNewConversation}
			<div class="new-conversation-form">
				<input
					type="text"
					bind:value={newConversationParticipant}
					placeholder="Enter participant name..."
					on:keydown={(e) => e.key === 'Enter' && createNewConversation()}
				/>
				<div class="form-actions">
					<button on:click={createNewConversation} disabled={!newConversationParticipant.trim() || isCreatingConversation}>
						{isCreatingConversation ? 'Creating...' : 'Create'}
					</button>
					<button on:click={toggleNewConversation} class="cancel">Cancel</button>
				</div>
			</div>
		{/if}
		
		<div class="conversations">
			{#if $messages.isLoading}
				<div class="empty-state">
					<div class="spinner"></div>
					<p>Loading conversations...</p>
				</div>
			{:else if $conversations.length === 0}
				<div class="empty-state">
					<p>No conversations yet</p>
					<button on:click={toggleNewConversation}>Start a conversation</button>
				</div>
			{:else}
				{#each $conversations as conversation}
					<button
						class="conversation-item"
						class:active={$activeConversation?.id === conversation.id}
						on:click={() => selectConversation(conversation.id)}
					>
						<div class="conversation-avatar">💬</div>
						<div class="conversation-details">
							<div class="conversation-name">{getConversationName(conversation)}</div>
							<div class="conversation-preview">
								{getLastMessagePreview(conversation)}
							</div>
						</div>
						{#if conversation.messages.length > 0}
							<div class="conversation-time">
								{formatTime(conversation.messages[conversation.messages.length - 1].timestamp)}
							</div>
						{/if}
					</button>
				{/each}
			{/if}
		</div>
	</div>
	
	<div class="chat-view">
		{#if $activeConversation}
			<div class="chat-header">
				<h3>{getConversationName($activeConversation)}</h3>
				<div class="chat-actions">
					<button class="icon-button" title="Call">📞</button>
					<button class="icon-button" title="Info">ℹ️</button>
				</div>
			</div>
			
			<div class="messages-container">
				{#if $activeMessages.length === 0}
					<div class="empty-chat">
						<p>🔒 Messages are end-to-end encrypted</p>
						<p>Start a conversation</p>
					</div>
				{:else}
					{#each $activeMessages as message}
						<div class="message" class:sent={message.senderId === $auth.currentIdentity?.id || message.senderId === 'test-identity-123'}>
							<div class="message-bubble">
								{message.content}
							</div>
							<div class="message-time">
								{formatTime(message.timestamp)}
							</div>
						</div>
					{/each}
				{/if}
			</div>
			
			<form class="message-input" on:submit|preventDefault={handleSendMessage}>
				<input
					type="text"
					bind:value={messageInput}
					placeholder="Type a secure message..."
					disabled={isSendingMessage}
				/>
				<button type="submit" disabled={!messageInput.trim() || isSendingMessage}>
					{isSendingMessage ? 'Sending...' : 'Send'}
				</button>
			</form>
		{:else}
			<div class="no-conversation">
				<h2>Select a conversation</h2>
				<p>Choose a conversation from the list or start a new one</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.messages-layout {
		display: flex;
		height: 100%;
		background: #0a0a0a;
	}
	
	/* Conversation List */
	.conversation-list {
		width: 320px;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
	}
	
	.list-header {
		padding: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	
	.list-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #fff;
	}
	
	.new-chat {
		padding: 0.5rem 1rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.new-chat:hover {
		background: #2563EB;
	}
	
	.new-conversation-form {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(59, 130, 246, 0.05);
	}
	
	.new-conversation-form input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		font-size: 0.95rem;
		margin-bottom: 0.75rem;
	}
	
	.new-conversation-form input:focus {
		outline: none;
		border-color: #3B82F6;
		background: rgba(255, 255, 255, 0.08);
	}
	
	.form-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.form-actions button {
		flex: 1;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.form-actions button:first-child {
		background: #3B82F6;
		color: white;
	}
	
	.form-actions button:first-child:hover:not(:disabled) {
		background: #2563EB;
	}
	
	.form-actions button:first-child:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.form-actions button.cancel {
		background: rgba(255, 255, 255, 0.05);
		color: #888;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.form-actions button.cancel:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	.conversations {
		flex: 1;
		overflow-y: auto;
	}
	
	.empty-state {
		text-align: center;
		padding: 3rem 1.5rem;
		color: #666;
	}
	
	.empty-state button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: rgba(59, 130, 246, 0.1);
		color: #3B82F6;
		border: 1px solid #3B82F6;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.empty-state button:hover {
		background: rgba(59, 130, 246, 0.2);
	}
	
	.conversation-item {
		width: 100%;
		padding: 1rem 1.5rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-align: left;
		transition: all 0.3s ease;
		color: #fff;
	}
	
	.conversation-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.conversation-item.active {
		background: rgba(59, 130, 246, 0.1);
	}
	
	.conversation-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
	}
	
	.conversation-details {
		flex: 1;
		min-width: 0;
	}
	
	.conversation-name {
		font-weight: 600;
		margin-bottom: 0.25rem;
	}
	
	.conversation-preview {
		font-size: 0.9rem;
		color: #888;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.conversation-time {
		font-size: 0.8rem;
		color: #666;
	}
	
	/* Chat View */
	.chat-view {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	
	.chat-header {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.02);
	}
	
	.chat-header h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #fff;
	}
	
	.chat-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.icon-button {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: none;
		background: rgba(255, 255, 255, 0.05);
		color: #888;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		transition: all 0.3s ease;
	}
	
	.icon-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.empty-chat {
		text-align: center;
		margin: auto;
		color: #666;
	}
	
	.empty-chat p:first-child {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}
	
	.message {
		display: flex;
		flex-direction: column;
		max-width: 70%;
	}
	
	.message.sent {
		align-self: flex-end;
		align-items: flex-end;
	}
	
	.message-bubble {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		word-wrap: break-word;
	}
	
	.message.sent .message-bubble {
		background: #3B82F6;
	}
	
	.message-time {
		font-size: 0.75rem;
		color: #666;
		margin-top: 0.25rem;
		padding: 0 0.5rem;
	}
	
	.message-input {
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		gap: 1rem;
		background: rgba(255, 255, 255, 0.02);
	}
	
	.message-input input {
		flex: 1;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		font-size: 1rem;
	}
	
	.message-input input:focus {
		outline: none;
		border-color: #3B82F6;
		background: rgba(255, 255, 255, 0.08);
	}
	
	.message-input button {
		padding: 0.75rem 1.5rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.message-input button:hover:not(:disabled) {
		background: #2563EB;
	}
	
	.message-input button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.no-conversation {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #666;
		text-align: center;
		padding: 2rem;
	}
	
	.no-conversation h2 {
		margin: 0 0 0.5rem;
		color: #888;
	}
	
	.spinner {
		width: 32px;
		height: 32px;
		margin: 0 auto 1rem;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #3B82F6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	@media (max-width: 768px) {
		.conversation-list {
			display: none;
		}
	}
</style>