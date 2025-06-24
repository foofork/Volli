<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	
	export let error: Error;
	export let reset: () => void;
	
	async function handleRestart() {
		// Clear all data and restart
		await auth.logout();
		goto('/');
	}
</script>

<div class="vault-error">
	<div class="error-icon">⚠️</div>
	<h1>Vault Error</h1>
	<p>We encountered an error with your secure vault.</p>
	
	{#if error.message.includes('decrypt') || error.message.includes('unlock')}
		<p class="error-detail">
			This might be due to an incorrect passphrase or corrupted data.
		</p>
	{:else if error.message.includes('network') || error.message.includes('fetch')}
		<p class="error-detail">
			This might be a network connectivity issue.
		</p>
	{:else}
		<p class="error-detail">
			Error: {error.message}
		</p>
	{/if}
	
	<div class="error-actions">
		<button on:click={reset} class="primary">
			Try Again
		</button>
		<button on:click={handleRestart} class="secondary">
			Restart App
		</button>
	</div>
	
	<details>
		<summary>Technical Details</summary>
		<pre>{error.stack || error.message}</pre>
	</details>
</div>

<style>
	.vault-error {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: #0a0a0a;
		color: #fff;
		text-align: center;
	}
	
	.error-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}
	
	h1 {
		margin: 0 0 0.5rem;
		font-size: 2rem;
		color: #EF4444;
	}
	
	p {
		color: #888;
		margin-bottom: 1rem;
		max-width: 500px;
		line-height: 1.6;
	}
	
	.error-detail {
		color: #aaa;
		font-size: 0.95rem;
	}
	
	.error-actions {
		display: flex;
		gap: 1rem;
		margin: 2rem 0;
	}
	
	button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	button.primary {
		background: #3B82F6;
		color: white;
	}
	
	button.primary:hover {
		background: #2563EB;
	}
	
	button.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	button.secondary:hover {
		background: rgba(255, 255, 255, 0.15);
	}
	
	details {
		margin-top: 2rem;
		max-width: 600px;
		text-align: left;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 1rem;
	}
	
	summary {
		cursor: pointer;
		font-weight: 600;
		color: #888;
		margin-bottom: 0.5rem;
	}
	
	pre {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.8rem;
		color: #888;
		white-space: pre-wrap;
		word-wrap: break-word;
		max-height: 200px;
		overflow-y: auto;
	}
</style>