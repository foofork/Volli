<script lang="ts">
	import { onMount } from 'svelte';
	import { toasts } from '$lib/stores/toasts';
	
	export let fallback: any = null;
	export let onError: ((error: Error) => void) | null = null;
	
	let hasError = false;
	let error: Error | null = null;
	
	// Catch unhandled errors at the window level
	onMount(() => {
		const handleError = (event: ErrorEvent) => {
			hasError = true;
			error = new Error(event.message);
			
			// Log error for debugging
			console.error('Error caught by boundary:', event.error);
			
			// Call custom error handler if provided
			if (onError) {
				onError(error);
			} else {
				// Default error handling
				toasts.error('An unexpected error occurred. Please refresh the page.');
			}
			
			// Prevent default error handling
			event.preventDefault();
		};
		
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			hasError = true;
			error = new Error(event.reason?.message || 'Unhandled promise rejection');
			
			console.error('Unhandled promise rejection:', event.reason);
			
			if (onError) {
				onError(error);
			} else {
				toasts.error('An unexpected error occurred. Please refresh the page.');
			}
			
			event.preventDefault();
		};
		
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		
		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});
	
	function reset() {
		hasError = false;
		error = null;
	}
</script>

{#if hasError}
	{#if fallback}
		<svelte:component this={fallback} {error} {reset} />
	{:else}
		<div class="error-boundary-fallback">
			<div class="error-content">
				<h1>Something went wrong</h1>
				<p>We're sorry, but something unexpected happened.</p>
				{#if error}
					<details>
						<summary>Error details</summary>
						<pre>{error.message}</pre>
					</details>
				{/if}
				<div class="error-actions">
					<button on:click={reset}>Try again</button>
					<button on:click={() => window.location.reload()}>Refresh page</button>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<slot />
{/if}

<style>
	.error-boundary-fallback {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: #0a0a0a;
		color: #fff;
	}
	
	.error-content {
		max-width: 500px;
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 3rem;
		backdrop-filter: blur(10px);
	}
	
	.error-content h1 {
		margin: 0 0 1rem;
		font-size: 2rem;
		color: #EF4444;
	}
	
	.error-content p {
		color: #888;
		margin-bottom: 2rem;
		line-height: 1.6;
	}
	
	details {
		margin: 2rem 0;
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
		font-size: 0.875rem;
		color: #EF4444;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	
	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 2rem;
	}
	
	.error-actions button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.error-actions button:first-child {
		background: #3B82F6;
		color: white;
	}
	
	.error-actions button:first-child:hover {
		background: #2563EB;
	}
	
	.error-actions button:last-child {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	.error-actions button:last-child:hover {
		background: rgba(255, 255, 255, 0.15);
	}
</style>