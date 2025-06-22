<script lang="ts">
	import { onMount } from 'svelte';
	import { vault } from '$lib/stores/vault';
	import { messages, activeConversation, activeMessages } from '$lib/stores/messages';
	
	let messageInput = '';
	let isUnlocking = false;
	let passphrase = '';
	let unlockError = '';
	
	onMount(() => {
		// Load conversations if vault is unlocked
		if ($vault.isUnlocked) {
			messages.loadConversations();
		}
	});
	
	async function handleUnlock() {
		if (!passphrase) {
			unlockError = 'Please enter a passphrase';
			return;
		}
		
		isUnlocking = true;
		unlockError = '';
		
		try {
			await vault.unlock(passphrase);
			await messages.loadConversations();
			passphrase = '';
		} catch (err) {
			unlockError = err instanceof Error ? err.message : 'Failed to unlock vault';
		} finally {
			isUnlocking = false;
		}
	}
	
	async function handleSendMessage() {
		if (!messageInput.trim() || !$activeConversation) return;
		
		const content = {
			type: 'text',
			text: messageInput.trim()
		};
		
		await messages.sendMessage($activeConversation.id, content);
		messageInput = '';
	}
	
	async function createDemoConversation() {
		const id = await messages.createConversation(['demo-user'], 'Demo Chat');
		messages.setActiveConversation(id);
	}
	
	function selectConversation(id) {
		messages.setActiveConversation(id);
	}
	
	function formatTime(date) {
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		}).format(date);
	}
</script>

<div class="messages-layout">
	{#if !$vault.isUnlocked}
		<div class="unlock-container">
			<div class="unlock-card">
				<h2>🔐 Unlock Your Vault</h2>
				<p>Enter your passphrase to decrypt your messages</p>
				
				<form on:submit|preventDefault={handleUnlock}>
					<input
						type="password"
						bind:value={passphrase}
						placeholder="Enter passphrase"
						disabled={isUnlocking}
					/>
					
					{#if unlockError}
						<div class="error">{unlockError}</div>
					{/if}
					
					<button type="submit" disabled={isUnlocking}>
						{isUnlocking ? 'Unlocking...' : 'Unlock'}
					</button>
				</form>
			</div>
		</div>
	{:else}
		<div class="conversation-list">
			<div class="list-header">
				<h2>Messages</h2>
				<button class="new-chat" on:click={createDemoConversation}>
					+ New Chat
				</button>
			</div>
			
			<div class="conversations">
				{#if $messages.conversations.size === 0}
					<div class="empty-state">
						<p>No conversations yet</p>
						<button on:click={createDemoConversation}>Start a conversation</button>
					</div>
				{:else}
					{#each [...$messages.conversations.values()] as conversation}
						<button
							class="conversation-item"
							class:active={$activeConversation?.id === conversation.id}
							on:click={() => selectConversation(conversation.id)}
						>
							<div class="conversation-avatar">💬</div>
							<div class="conversation-details">
								<div class="conversation-name">{conversation.metadata.name}</div>
								<div class="conversation-preview">
									{conversation.lastMessage ? conversation.lastMessage.content.text : 'No messages yet'}
								</div>
							</div>
							{#if conversation.updatedAt}
								<div class="conversation-time">
									{formatTime(conversation.updatedAt)}
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
					<h3>{$activeConversation.metadata.name}</h3>
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
							<div class="message" class:sent={message.senderId === 'current-user'}>
								<div class="message-bubble">
									{message.content.text}
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
					/>
					<button type="submit" disabled={!messageInput.trim()}>
						Send
					</button>
				</form>
			{:else}
				<div class="no-conversation">
					<h2>Select a conversation</h2>
					<p>Choose a conversation from the list or start a new one</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.messages-layout {
		display: flex;
		height: 100%;
		background: #0a0a0a;
	}
	
	/* Unlock Screen */
	.unlock-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}
	
	.unlock-card {
		width: 100%;
		max-width: 400px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 2rem;
	}
	
	.unlock-card h2 {
		margin: 0 0 0.5rem;
		color: #fff;
	}
	
	.unlock-card p {
		color: #888;
		margin-bottom: 2rem;
	}
	
	.unlock-card input {
		width: 100%;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		margin-bottom: 1rem;
	}
	
	.unlock-card button {
		width: 100%;
		padding: 0.75rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.unlock-card button:hover:not(:disabled) {
		background: #2563EB;
	}
	
	.unlock-card button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	
	.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #EF4444;
		padding: 0.5rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
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
	
	@media (max-width: 768px) {
		.conversation-list {
			display: none;
		}
	}
</style>