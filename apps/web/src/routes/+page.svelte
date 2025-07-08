<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { initializeCore } from '$lib/stores/core';

	onMount(async () => {
		try {
			// Initialize core first
			await initializeCore();
			
			// Initialize auth
			await auth.initialize();
			
			// Check authentication state and redirect
			const unsubscribe = auth.subscribe(state => {
				if (state.isAuthenticated) {
					goto('/app');
				} else {
					goto('/auth');
				}
			});
			
			return unsubscribe;
		} catch (error) {
			console.error('Failed to initialize:', error);
			// Fallback to auth page on error
			goto('/auth');
		}
	});
</script>

<svelte:head>
	<title>Volly - Loading...</title>
</svelte:head>

<main class="loading-container">
	<div class="spinner" role="status" aria-live="polite">
		<div class="spinner-ring" aria-hidden="true"></div>
		<p>Initializing secure environment...</p>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #0a0a0a;
		color: #ffffff;
	}
	
	.loading-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.spinner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: #888;
	}
	
	.spinner-ring {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #3B82F6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	@media (prefers-reduced-motion: reduce) {
		.spinner-ring {
			animation: none;
		}
	}
</style>