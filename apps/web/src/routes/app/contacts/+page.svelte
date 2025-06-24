<script lang="ts">
	import { onMount } from 'svelte';
	import { contacts, contactsList } from '$lib/stores/contacts';
	import type { Contact } from '$lib/stores/contacts';
	import { toasts } from '$lib/stores/toasts';
	import { messages } from '$lib/stores/messages';
	import { goto } from '$app/navigation';
	
	let searchQuery = '';
	let debouncedSearchQuery = '';
	let showAddForm = false;
	let newContactName = '';
	let newContactPublicKey = '';
	let isAdding = false;
	let error = '';
	let searchTimeout: NodeJS.Timeout;
	
	// Debounce search for better performance
	$: {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			debouncedSearchQuery = searchQuery;
		}, 150);
	}
	
	onMount(() => {
		// Contacts are loaded by the layout when vault is unlocked
	});
	
	function toggleAddForm() {
		showAddForm = !showAddForm;
		if (!showAddForm) {
			resetForm();
		}
	}
	
	function resetForm() {
		newContactName = '';
		newContactPublicKey = '';
		error = '';
	}
	
	function validatePublicKey(key: string): boolean {
		// Basic validation - check if it looks like a valid key format
		if (!key) return false;
		
		// Check if it's a hex string (64 characters for 32-byte key)
		const hexPattern = /^[0-9a-fA-F]{64}$/;
		if (hexPattern.test(key)) return true;
		
		// Check if it's base64 encoded (44 characters with padding)
		const base64Pattern = /^[A-Za-z0-9+/]{43}=$/;
		if (base64Pattern.test(key)) return true;
		
		// For demo purposes, accept mock keys
		if (key.startsWith('pk_')) return true;
		
		return false;
	}
	
	async function addContact() {
		if (!newContactName.trim()) {
			error = 'Contact name is required';
			return;
		}
		
		let publicKey = newContactPublicKey.trim();
		
		// If no public key provided, generate a mock one
		if (!publicKey) {
			publicKey = `pk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		} else if (!validatePublicKey(publicKey)) {
			error = 'Invalid public key format. Expected 64-character hex string or 44-character base64 string.';
			return;
		}
		
		isAdding = true;
		error = '';
		
		try {
			await contacts.addContact(newContactName.trim(), publicKey);
			toasts.success(`Contact "${newContactName.trim()}" added successfully!`);
			resetForm();
			showAddForm = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add contact';
			toasts.error(error);
		} finally {
			isAdding = false;
		}
	}
	
	async function deleteContact(id: string) {
		if (confirm('Are you sure you want to delete this contact?')) {
			try {
				await contacts.deleteContact(id);
				toasts.success('Contact deleted successfully');
			} catch (err) {
				console.error('Failed to delete contact:', err);
				toasts.error('Failed to delete contact');
			}
		}
	}
	
	async function toggleVerified(contact: Contact) {
		try {
			await contacts.updateContact(contact.id, { verified: !contact.verified });
			if (!contact.verified) {
				toasts.success(`${contact.name} marked as verified`);
			} else {
				toasts.info(`${contact.name} verification removed`);
			}
		} catch (err) {
			console.error('Failed to update contact:', err);
			toasts.error('Failed to update contact');
		}
	}
	
	async function startConversation(contact: Contact) {
		try {
			// Create or get existing conversation with this contact
			const conversationId = await messages.createConversation([contact.publicKey]);
			messages.setActiveConversation(conversationId);
			toasts.success(`Started conversation with ${contact.name}`);
			goto('/app'); // Navigate to messages
		} catch (err) {
			console.error('Failed to start conversation:', err);
			toasts.error('Failed to start conversation');
		}
	}
	
	$: filteredContacts = $contactsList.filter(contact => 
		contact.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
		(contact.notes && contact.notes.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
	);
</script>

<div class="contacts">
	<div class="contacts-header">
		<h1>Contacts</h1>
		<button class="primary" on:click={toggleAddForm}>
			+ Add Contact
		</button>
	</div>
	
	{#if showAddForm}
		<div class="add-contact-form">
			<h3>Add New Contact</h3>
			
			<div class="form-group">
				<label for="contactName">Name</label>
				<input
					id="contactName"
					type="text"
					bind:value={newContactName}
					placeholder="Enter contact name"
					disabled={isAdding}
				/>
			</div>
			
			<div class="form-group">
				<label for="publicKey">Public Key (optional)</label>
				<input
					id="publicKey"
					type="text"
					bind:value={newContactPublicKey}
					placeholder="Paste public key or leave empty for demo"
					disabled={isAdding}
				/>
			</div>
			
			{#if error}
				<div class="error">{error}</div>
			{/if}
			
			<div class="form-actions">
				<button on:click={addContact} disabled={!newContactName.trim() || isAdding}>
					{isAdding ? 'Adding...' : 'Add Contact'}
				</button>
				<button class="secondary" on:click={toggleAddForm}>Cancel</button>
			</div>
		</div>
	{/if}
	
	<div class="search-bar">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search contacts..."
		/>
	</div>
	
	<div class="contacts-list">
		{#if $contacts.isLoading}
			<div class="loading-state">
				<p>Loading contacts...</p>
			</div>
		{:else if filteredContacts.length === 0}
			{#if debouncedSearchQuery}
				<div class="empty-state">
					<div class="empty-icon">🔍</div>
					<h2>No results found</h2>
					<p>No contacts match your search for "{debouncedSearchQuery}"</p>
				</div>
			{:else}
				<div class="empty-state">
					<div class="empty-icon">👥</div>
					<h2>No contacts yet</h2>
					<p>Add contacts to start secure conversations</p>
					<button on:click={toggleAddForm}>Add your first contact</button>
				</div>
			{/if}
		{:else}
			{#each filteredContacts as contact}
				<div class="contact-item">
					<div class="contact-avatar">
						{contact.name.charAt(0).toUpperCase()}
					</div>
					<div class="contact-info">
						<div class="contact-name">{contact.name}</div>
						<div class="contact-status" class:verified={contact.verified}>
							{contact.verified ? '✓ Verified' : 'Unverified'}
						</div>
						{#if contact.lastSeen}
							<div class="contact-last-seen">
								Last seen {new Date(contact.lastSeen).toLocaleDateString()}
							</div>
						{/if}
					</div>
					<div class="contact-actions">
						<button 
							class="icon-button message-button" 
							title="Start conversation"
							on:click={() => startConversation(contact)}
						>
							💬
						</button>
						<button 
							class="icon-button verify-button" 
							title={contact.verified ? 'Remove verification' : 'Mark as verified'}
							on:click={() => toggleVerified(contact)}
						>
							{contact.verified ? '✓' : '?'}
						</button>
						<button 
							class="icon-button delete-button" 
							title="Delete contact"
							on:click={() => deleteContact(contact.id)}
						>
							🗑️
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.contacts {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: #0a0a0a;
	}
	
	.contacts-header {
		padding: 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.02);
	}
	
	.contacts-header h1 {
		margin: 0;
		font-size: 2rem;
		color: #fff;
	}
	
	.add-contact-form {
		padding: 1.5rem 2rem;
		background: rgba(59, 130, 246, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.add-contact-form h3 {
		margin: 0 0 1.5rem;
		color: #fff;
		font-size: 1.25rem;
	}
	
	.form-group {
		margin-bottom: 1rem;
	}
	
	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		color: #ccc;
		font-weight: 500;
		font-size: 0.9rem;
	}
	
	.form-group input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		font-size: 1rem;
		transition: all 0.3s ease;
	}
	
	.form-group input:focus {
		outline: none;
		border-color: #3B82F6;
		background: rgba(255, 255, 255, 0.08);
	}
	
	.form-group input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}
	
	.form-actions button {
		flex: 1;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
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
	
	.form-actions button.secondary {
		background: transparent;
		color: #888;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.form-actions button.secondary:hover {
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
	}
	
	.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #EF4444;
		padding: 0.75rem;
		border-radius: 8px;
		margin: 1rem 0;
		font-size: 0.9rem;
	}
	
	.search-bar {
		padding: 1rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.search-bar input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		font-size: 1rem;
	}
	
	.search-bar input:focus {
		outline: none;
		border-color: #3B82F6;
		background: rgba(255, 255, 255, 0.08);
	}
	
	.contacts-list {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}
	
	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: #666;
	}
	
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		color: #666;
	}
	
	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}
	
	.empty-state h2 {
		margin: 0 0 0.5rem;
		color: #888;
	}
	
	.empty-state p {
		margin-bottom: 2rem;
	}
	
	.empty-state button {
		padding: 0.75rem 1.5rem;
		background: rgba(59, 130, 246, 0.1);
		color: #3B82F6;
		border: 1px solid #3B82F6;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.empty-state button:hover {
		background: rgba(59, 130, 246, 0.2);
	}
	
	.contact-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		margin-bottom: 0.5rem;
		transition: all 0.3s ease;
	}
	
	.contact-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.contact-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 600;
		color: white;
	}
	
	.contact-info {
		flex: 1;
	}
	
	.contact-name {
		font-weight: 600;
		color: #fff;
		margin-bottom: 0.25rem;
	}
	
	.contact-status {
		font-size: 0.9rem;
		color: #888;
	}
	
	.contact-status.verified {
		color: #4ADE80;
	}
	
	.contact-last-seen {
		font-size: 0.8rem;
		color: #666;
		margin-top: 0.25rem;
	}
	
	.contact-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	
	button.primary {
		padding: 0.75rem 1.5rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	button.primary:hover {
		background: #2563EB;
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
		transition: all 0.3s ease;
		font-size: 1rem;
	}
	
	.icon-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	.message-button {
		background: rgba(59, 130, 246, 0.1);
		color: #3B82F6;
	}
	
	.message-button:hover {
		background: rgba(59, 130, 246, 0.2);
		color: #3B82F6;
	}
	
	.verify-button {
		background: rgba(74, 222, 128, 0.1);
		color: #4ADE80;
	}
	
	.verify-button:hover {
		background: rgba(74, 222, 128, 0.2);
		color: #4ADE80;
	}
	
	.delete-button {
		background: rgba(239, 68, 68, 0.1);
		color: #EF4444;
	}
	
	.delete-button:hover {
		background: rgba(239, 68, 68, 0.2);
		color: #EF4444;
	}
</style>