<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { messages, conversations, activeConversation, activeMessages } from '$lib/stores/messages';
	import { toasts } from '$lib/stores/toasts';
	import { handleArrowNavigation, announceToScreenReader, generateId } from '$lib/utils/accessibility';
	
	let messageInput = '';
	let isCreatingConversation = false;
	let newConversationParticipant = '';
	let showNewConversation = false;
	let isSendingMessage = false;
	let conversationListElement: HTMLElement;
	let messagesContainerElement: HTMLElement;
	
	// Generate unique IDs for accessibility
	const messageInputId = generateId('message-input');
	const conversationListId = generateId('conversation-list');
	const messagesRegionId = generateId('messages-region');
	
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
			announceToScreenReader('Message sent successfully');
		} catch (error) {
			console.error('Failed to send message:', error);
			// Restore message on error
			messageInput = message;
			toasts.error('Failed to send message. Please try again.');
			announceToScreenReader('Failed to send message. Please try again.');
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
			announceToScreenReader('Conversation created successfully');
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
		const conversation = $conversations.find(c => c.id === id);
		if (conversation) {
			announceToScreenReader(`Switched to conversation with ${getConversationName(conversation)}`);
		}
	}
	
	function handleConversationListKeydown(event: KeyboardEvent) {
		if (conversationListElement) {
			handleArrowNavigation(conversationListElement, event, 'vertical');
		}
		
		// Handle Enter and Space for selection
		if (event.key === 'Enter' || event.key === ' ') {
			const target = event.target as HTMLElement;
			if (target.classList.contains('conversation-item')) {
				event.preventDefault();
				target.click();
			}
		}
	}
	
	function handleMessageInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
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
	<aside class="conversation-list" aria-label="Conversations">
		<div class="list-header">
			<h2>Messages</h2>
			<button class="new-chat" on:click={toggleNewConversation} aria-label="Start new conversation" aria-expanded={showNewConversation}>
				+ New Chat
			</button>
		</div>
		
		{#if showNewConversation}
			<form class="new-conversation-form" on:submit|preventDefault={createNewConversation} aria-labelledby="new-conversation-heading">
				<label for="participant-input" class="sr-only" id="new-conversation-heading">Create new conversation</label>
				<input
					id="participant-input"
					type="text"
					bind:value={newConversationParticipant}
					placeholder="Enter participant name..."
					aria-label="Participant name"
					aria-describedby="participant-help"
					required
				/>
				<div class="sr-only" id="participant-help">Enter the name of the person you want to start a conversation with</div>
				<div class="form-actions">
					<button type="submit" disabled={!newConversationParticipant.trim() || isCreatingConversation}>
						{isCreatingConversation ? 'Creating...' : 'Create'}
					</button>
					<button type="button" on:click={toggleNewConversation} class="cancel">Cancel</button>
				</div>
			</form>
		{/if}
		
		<ul class="conversations" bind:this={conversationListElement} role="list" aria-label="Conversation list" id={conversationListId}>
			{#if $messages.isLoading}
				<div class="empty-state" role="status" aria-live="polite">
					<div class="spinner" aria-hidden="true"></div>
					<p>Loading conversations...</p>
				</div>
			{:else if $conversations.length === 0}
				<div class="empty-state">
					<p>No conversations yet</p>
					<button on:click={toggleNewConversation} aria-label="Start your first conversation">Start a conversation</button>
				</div>
			{:else}
				{#each $conversations as conversation (conversation.id)}
					<li>
						<button
							class="conversation-item"
							class:active={$activeConversation?.id === conversation.id}
							on:click={() => selectConversation(conversation.id)}
							aria-pressed={$activeConversation?.id === conversation.id}
						aria-label={`Conversation with ${getConversationName(conversation)}. Last message: ${getLastMessagePreview(conversation)}`}
						tabindex="0"
					>
						<div class="conversation-avatar" role="img" aria-label="Conversation icon">💬</div>
						<div class="conversation-details">
							<div class="conversation-name">{getConversationName(conversation)}</div>
							<div class="conversation-preview">
								{getLastMessagePreview(conversation)}
							</div>
						</div>
						{#if conversation.messages.length > 0}
							<div class="conversation-time">
								<time datetime={new Date(conversation.messages[conversation.messages.length - 1].timestamp).toISOString()}>
									{formatTime(conversation.messages[conversation.messages.length - 1].timestamp)}
								</time>
							</div>
						{/if}
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	</aside>
	
	<section class="chat-view" role="main" aria-label="Chat messages">
		{#if $activeConversation}
			<header class="chat-header">
				<h3 id="conversation-title">{getConversationName($activeConversation)}</h3>
				<div class="chat-actions" role="group" aria-label="Conversation actions">
					<button class="icon-button" aria-label="Start call" title="Call">
						<span role="img" aria-label="Phone icon">📞</span>
					</button>
					<button class="icon-button" aria-label="Conversation information" title="Info">
						<span role="img" aria-label="Info icon">ℹ️</span>
					</button>
				</div>
			</header>
			
			<div class="messages-container" bind:this={messagesContainerElement} role="log" aria-live="polite" aria-label="Message history" id={messagesRegionId}>
				{#if $activeMessages.length === 0}
					<div class="empty-chat">
						<p>
							<span role="img" aria-label="Lock icon">🔒</span>
							Messages are end-to-end encrypted
						</p>
						<p>Start a conversation</p>
					</div>
				{:else}
					{#each $activeMessages as message (message.id)}
						<div class="message" class:sent={message.senderId === $auth.currentIdentity?.id || message.senderId === 'test-identity-123'} role="group" aria-labelledby="message-{message.id}">
							<div class="message-bubble" id="message-{message.id}">
								{message.content}
							</div>
							<div class="message-time" aria-label="Sent at">
								<time datetime={new Date(message.timestamp).toISOString()}>
									{formatTime(message.timestamp)}
								</time>
							</div>
						</div>
					{/each}
				{/if}
			</div>
			
			<form class="message-input" on:submit|preventDefault={handleSendMessage} aria-labelledby="conversation-title">
				<label for={messageInputId} class="sr-only">Type your message</label>
				<input
					id={messageInputId}
					type="text"
					bind:value={messageInput}
					placeholder="Type a secure message..."
					disabled={isSendingMessage}
					aria-describedby="message-help"
					on:keydown={handleMessageInputKeydown}
					autocomplete="off"
				/>
				<div class="sr-only" id="message-help">Press Enter to send, Shift+Enter for new line</div>
				<button type="submit" disabled={!messageInput.trim() || isSendingMessage} aria-label="Send message">
					{isSendingMessage ? 'Sending...' : 'Send'}
				</button>
			</form>
		{:else}
			<div class="no-conversation" role="status">
				<h2>Select a conversation</h2>
				<p>Choose a conversation from the list or start a new one</p>
			</div>
		{/if}
	</section>
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
	
	.new-chat:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
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
	
	.conversation-item:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
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
	
	.icon-button:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
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
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
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
	
	.message-input button:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
	}
	
	.sr-only {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	
	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.conversation-item:focus {
			outline: 3px solid #1E40AF;
		}
		
		.new-chat:focus {
			outline: 3px solid #1E40AF;
		}
		
		.icon-button:focus {
			outline: 3px solid #1E40AF;
		}
		
		.message-input button:focus {
			outline: 3px solid #1E40AF;
		}
		
		.message-input input:focus {
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.8);
		}
	}
	
	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
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
		
		/* Show skip link on mobile */
		.messages-layout::before {
			content: "Skip to main chat";
			position: absolute;
			top: -40px;
			left: 6px;
			background: #3B82F6;
			color: white;
			padding: 8px;
			border-radius: 4px;
			text-decoration: none;
			z-index: 1000;
			transition: top 0.3s;
		}
		
		.messages-layout:focus-within::before {
			top: 6px;
		}
	}
</style>