<script lang="ts">
	import { onMount } from 'svelte';
	
	let contacts = [];
	let searchQuery = '';
	
	onMount(() => {
		// Load contacts from vault when implemented
	});
	
	function addContact() {
		// Implement add contact functionality
		alert('Add contact feature coming soon!');
	}
	
	$: filteredContacts = contacts.filter(contact => 
		contact.name.toLowerCase().includes(searchQuery.toLowerCase())
	);
</script>

<div class="contacts">
	<div class="contacts-header">
		<h1>Contacts</h1>
		<button class="primary" on:click={addContact}>
			+ Add Contact
		</button>
	</div>
	
	<div class="search-bar">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search contacts..."
		/>
	</div>
	
	<div class="contacts-list">
		{#if contacts.length === 0}
			<div class="empty-state">
				<div class="empty-icon">👥</div>
				<h2>No contacts yet</h2>
				<p>Add contacts to start secure conversations</p>
				<button on:click={addContact}>Add your first contact</button>
			</div>
		{:else}
			{#each filteredContacts as contact}
				<div class="contact-item">
					<div class="contact-avatar">
						{contact.name.charAt(0).toUpperCase()}
					</div>
					<div class="contact-info">
						<div class="contact-name">{contact.name}</div>
						<div class="contact-status">
							{contact.verified ? '✓ Verified' : 'Unverified'}
						</div>
					</div>
					<button class="icon-button">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<circle cx="5" cy="10" r="1.5" fill="currentColor"/>
							<circle cx="10" cy="10" r="1.5" fill="currentColor"/>
							<circle cx="15" cy="10" r="1.5" fill="currentColor"/>
						</svg>
					</button>
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
		color: #4ADE80;
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
	}
	
	.icon-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
</style>