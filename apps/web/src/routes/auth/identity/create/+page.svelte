<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { toasts } from '$lib/stores/toasts';
	import SimplifiedKeyInput from '$lib/components/SimplifiedKeyInput.svelte';
	import { onMount } from 'svelte';
	
	let keyInput = '';
	let isCreating = false;
	let error = '';
	
	onMount(() => {
		// Redirect if identity already exists
		if ($auth.currentIdentity) {
			goto('/identity/setup');
		}
	});
	
	async function handleCreateIdentity() {
		if (!keyInput.trim()) {
			error = 'Please enter a security key or username';
			return;
		}
		
		isCreating = true;
		error = '';
		
		try {
			await auth.createIdentity(keyInput.trim());
			toasts.success('Identity created successfully!');
			goto('/identity/setup');
		} catch (err) {
			console.error('Failed to create identity:', err);
			// Show user-friendly error message
			error = "We couldn't create your identity. Please check your key and try again.";
			isCreating = false;
		}
	}
	
	function handleKeyInput(event: CustomEvent<{ value: string; isValid: boolean }>) {
		keyInput = event.detail.value;
		if (error && keyInput.length > 0) {
			error = ''; // Clear error when user starts typing
		}
	}
</script>

<svelte:head>
	<title>Create Identity - Volly</title>
</svelte:head>

<div class="create-container">
	<div class="create-card">
		<div class="logo">🆔</div>
		
		<h1>Create Your Identity</h1>
		<p class="subtitle">
			Enter a security key from someone you trust, or create a new username.
			This will be your unique identity on Volly.
		</p>
		
		<form on:submit|preventDefault={handleCreateIdentity}>
			<div class="key-section">
				<SimplifiedKeyInput
					value={keyInput}
					on:input={handleKeyInput}
					disabled={isCreating}
					autoFocus={true}
				/>
			</div>
			
			{#if error}
				<div class="error" role="alert">
					{error}
				</div>
			{/if}
			
			<div class="info">
				<h3>What can I enter?</h3>
				<ul>
					<li><strong>Security Key:</strong> A long code shared by someone you trust</li>
					<li><strong>Username:</strong> Like @alice or alice@example.com</li>
					<li><strong>Email:</strong> Your email address to create a new identity</li>
				</ul>
			</div>
			
			<button
				type="submit"
				class="primary"
				disabled={isCreating || !keyInput.trim()}
			>
				{isCreating ? 'Creating Identity...' : 'Continue'}
			</button>
		</form>
		
		<div class="back-link">
			<button on:click={() => goto('/')} class="link">
				← Back to Home
			</button>
		</div>
	</div>
</div>

<style>
	.create-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
	}
	
	.create-card {
		width: 100%;
		max-width: 520px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 3rem 2rem;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
	}
	
	.logo {
		font-size: 4rem;
		text-align: center;
		margin-bottom: 1.5rem;
		filter: grayscale(0.2);
	}
	
	h1 {
		text-align: center;
		margin: 0 0 0.5rem;
		font-size: 2rem;
		color: #fff;
	}
	
	.subtitle {
		text-align: center;
		color: #aaa;
		margin: 0 0 2rem;
		line-height: 1.6;
	}
	
	form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.key-section {
		width: 100%;
	}
	
	.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #EF4444;
		padding: 0.75rem;
		border-radius: 8px;
		text-align: center;
		font-size: 0.9rem;
	}
	
	.info {
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 8px;
		padding: 1rem;
	}
	
	.info h3 {
		margin: 0 0 0.5rem;
		color: #3B82F6;
		font-size: 0.9rem;
		font-weight: 600;
	}
	
	.info ul {
		margin: 0;
		padding-left: 1.5rem;
		list-style: none;
	}
	
	.info li {
		color: #888;
		font-size: 0.85rem;
		line-height: 1.6;
		position: relative;
		padding-left: 1rem;
		margin-bottom: 0.25rem;
	}
	
	.info li::before {
		content: '•';
		color: #3B82F6;
		position: absolute;
		left: 0;
	}
	
	.info strong {
		color: #ccc;
	}
	
	button.primary {
		padding: 1rem 2rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		width: 100%;
	}
	
	button.primary:hover:not(:disabled) {
		background: #2563EB;
		transform: translateY(-1px);
		box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
	}
	
	button.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.back-link {
		text-align: center;
		margin-top: 2rem;
	}
	
	button.link {
		background: none;
		border: none;
		color: #888;
		cursor: pointer;
		font-size: 0.9rem;
		transition: color 0.3s ease;
		padding: 0.5rem 1rem;
	}
	
	button.link:hover {
		color: #3B82F6;
	}
	
	@media (max-width: 640px) {
		.create-card {
			padding: 2rem 1.5rem;
		}
		
		h1 {
			font-size: 1.75rem;
		}
		
		.subtitle {
			font-size: 0.95rem;
		}
	}
</style>