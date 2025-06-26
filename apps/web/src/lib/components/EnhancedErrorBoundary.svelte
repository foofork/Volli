<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { toasts } from '$lib/stores/toasts';
	import EnhancedButton from './EnhancedButton.svelte';
	
	export let fallback: any = null;
	export let onError: ((error: Error) => void) | null = null;
	export let showErrorDetails: boolean = false;
	export let level: 'page' | 'component' | 'critical' = 'component';
	export let recoveryActions: Array<{
		label: string;
		action: () => void;
		variant?: 'primary' | 'secondary';
		icon?: string;
	}> = [];
	
	const dispatch = createEventDispatcher();
	
	let hasError = false;
	let error: Error | null = null;
	let errorDetails = '';
	let retryCount = 0;
	let maxRetries = 3;
	let isRetrying = false;
	let showTechnicalDetails = false;
	
	// Catch unhandled errors at the window level
	onMount(() => {
		const handleError = (event: ErrorEvent) => {
			handleErrorOccurred(new Error(event.message));
			event.preventDefault();
		};
		
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			handleErrorOccurred(new Error(event.reason?.message || 'Unhandled promise rejection'));
			event.preventDefault();
		};
		
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		
		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});
	
	function handleErrorOccurred(err: Error) {
		hasError = true;
		error = err;
		
		// Generate helpful error details
		errorDetails = generateErrorDetails(err);
		
		// Log error for debugging
		console.error('Error caught by boundary:', err);
		
		// Call custom error handler if provided
		if (onError) {
			onError(err);
		} else if (level !== 'critical') {
			// For non-critical errors, show a toast notification
			toasts.error(getErrorMessage(err), 0); // Persistent toast
		}
		
		// Dispatch error event
		dispatch('error', { error: err, level, retryCount });
	}
	
	function generateErrorDetails(err: Error): string {
		const details = {
			message: err.message,
			stack: err.stack,
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			url: window.location.href,
			retryCount,
			level
		};
		
		return JSON.stringify(details, null, 2);
	}
	
	function getErrorMessage(err: Error): string {
		const commonErrors: Record<string, string> = {
			'NetworkError': 'Network connection lost. Please check your internet connection.',
			'ChunkLoadError': 'Failed to load app resources. Please refresh the page.',
			'QuotaExceededError': 'Storage quota exceeded. Please free up some space.',
			'NotAllowedError': 'Permission denied. Please check your browser settings.',
			'SecurityError': 'Security error occurred. Please ensure you\'re on a secure connection.'
		};
		
		// Check for common error patterns
		for (const [pattern, message] of Object.entries(commonErrors)) {
			if (err.message.includes(pattern) || err.name.includes(pattern)) {
				return message;
			}
		}
		
		// Fallback to generic message based on error level
		switch (level) {
			case 'critical':
				return 'A critical error occurred. Please restart the application.';
			case 'page':
				return 'Something went wrong on this page. Please try refreshing.';
			default:
				return 'An unexpected error occurred. Please try again.';
		}
	}
	
	async function retry() {
		if (retryCount >= maxRetries) {
			toasts.error('Maximum retry attempts reached. Please refresh the page.');
			return;
		}
		
		isRetrying = true;
		retryCount++;
		
		try {
			// Wait a bit before retrying
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// Reset error state
			hasError = false;
			error = null;
			errorDetails = '';
			
			dispatch('retry', { retryCount });
			
			toasts.success('Attempting to recover...', 2000);
		} catch (retryError) {
			console.error('Retry failed:', retryError);
			handleErrorOccurred(retryError as Error);
		} finally {
			isRetrying = false;
		}
	}
	
	function reset() {
		hasError = false;
		error = null;
		errorDetails = '';
		retryCount = 0;
		showTechnicalDetails = false;
		dispatch('reset');
	}
	
	function reloadPage() {
		window.location.reload();
	}
	
	function goBack() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			window.location.href = '/';
		}
	}
	
	function reportError() {
		// In a real app, this would send the error to an error reporting service
		navigator.clipboard.writeText(errorDetails).then(() => {
			toasts.success('Error details copied to clipboard', 3000);
		}).catch(() => {
			toasts.error('Failed to copy error details');
		});
	}
	
	function toggleTechnicalDetails() {
		showTechnicalDetails = !showTechnicalDetails;
	}
	
	// Default recovery actions based on error level
	$: defaultRecoveryActions = level === 'critical' 
		? [
			{ label: 'Reload Application', action: reloadPage, variant: 'primary', icon: '🔄' },
			{ label: 'Go to Home', action: () => window.location.href = '/', variant: 'secondary', icon: '🏠' }
		]
		: level === 'page'
		? [
			{ label: 'Retry', action: retry, variant: 'primary', icon: '🔄' },
			{ label: 'Go Back', action: goBack, variant: 'secondary', icon: '◀' },
			{ label: 'Refresh Page', action: reloadPage, variant: 'secondary', icon: '🔄' }
		]
		: [
			{ label: 'Try Again', action: retry, variant: 'primary', icon: '🔄' },
			{ label: 'Reset', action: reset, variant: 'secondary', icon: '↺' }
		];
	
	$: allRecoveryActions = [...recoveryActions, ...defaultRecoveryActions];
</script>

{#if hasError}
	{#if fallback}
		<svelte:component this={fallback} {error} {reset} {retry} {retryCount} />
	{:else}
		<div class="error-boundary-container {level}" role="alert" aria-live="assertive">
			<div class="error-content">
				<div class="error-header">
					<div class="error-icon">
						{#if level === 'critical'}
							💥
						{:else if level === 'page'}
							⚠️
						{:else}
							😵
						{/if}
					</div>
					<div class="error-title">
						<h1>
							{#if level === 'critical'}
								Critical Error
							{:else if level === 'page'}
								Page Error
							{:else}
								Something went wrong
							{/if}
						</h1>
						<p class="error-description">
							{getErrorMessage(error || new Error('Unknown error'))}
						</p>
					</div>
				</div>
				
				{#if retryCount > 0}
					<div class="retry-info">
						<span class="retry-badge">Retry {retryCount}/{maxRetries}</span>
					</div>
				{/if}
				
				<div class="error-actions">
					{#each allRecoveryActions as action}
						<EnhancedButton
							variant={action.variant || 'primary'}
							loading={isRetrying && action.action === retry}
							on:click={action.action}
							icon={action.icon}
						>
							{action.label}
							<svelte:fragment slot="loading">
								{action.action === retry ? 'Retrying...' : action.label}
							</svelte:fragment>
						</EnhancedButton>
					{/each}
				</div>
				
				<div class="error-details-section">
					<button 
						class="details-toggle"
						on:click={toggleTechnicalDetails}
						aria-expanded={showTechnicalDetails}
					>
						<span>{showTechnicalDetails ? '▼' : '▶'}</span>
						Technical Details
					</button>
					
					{#if showTechnicalDetails}
						<div class="technical-details">
							<div class="error-summary">
								<div class="error-field">
									<label>Error Type:</label>
									<span>{error?.name || 'Unknown'}</span>
								</div>
								<div class="error-field">
									<label>Message:</label>
									<span>{error?.message || 'No message available'}</span>
								</div>
								<div class="error-field">
									<label>Level:</label>
									<span class="level-badge {level}">{level}</span>
								</div>
								<div class="error-field">
									<label>Timestamp:</label>
									<span>{new Date().toLocaleString()}</span>
								</div>
							</div>
							
							{#if error?.stack}
								<details class="stack-trace">
									<summary>Stack Trace</summary>
									<pre>{error.stack}</pre>
								</details>
							{/if}
							
							<div class="error-actions-secondary">
								<EnhancedButton
									variant="ghost"
									size="small"
									on:click={reportError}
									icon="📋"
								>
									Copy Error Details
								</EnhancedButton>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{:else}
	<slot />
{/if}

<style>
	.error-boundary-container {
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
		color: #fff;
	}
	
	.error-boundary-container.critical {
		min-height: 100vh;
		background: linear-gradient(135deg, #1a0a0a 0%, #2a1a1a 100%);
	}
	
	.error-content {
		max-width: 600px;
		width: 100%;
		text-align: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 3rem;
		backdrop-filter: blur(10px);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
	}
	
	.error-header {
		display: flex;
		align-items: flex-start;
		gap: 1.5rem;
		margin-bottom: 2rem;
		text-align: left;
	}
	
	.error-icon {
		font-size: 3rem;
		flex-shrink: 0;
		margin-top: 0.5rem;
	}
	
	.error-title h1 {
		margin: 0 0 1rem;
		font-size: 2rem;
		color: #EF4444;
		font-weight: 700;
	}
	
	.error-description {
		color: #ccc;
		margin: 0;
		line-height: 1.6;
		font-size: 1.1rem;
	}
	
	.retry-info {
		margin-bottom: 2rem;
	}
	
	.retry-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: rgba(59, 130, 246, 0.2);
		color: #3B82F6;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: 600;
		border: 1px solid rgba(59, 130, 246, 0.3);
	}
	
	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}
	
	.error-details-section {
		text-align: left;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 2rem;
		margin-top: 2rem;
	}
	
	.details-toggle {
		background: none;
		border: none;
		color: #888;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		transition: color 0.2s ease;
		width: 100%;
		text-align: left;
	}
	
	.details-toggle:hover {
		color: #fff;
	}
	
	.technical-details {
		margin-top: 1rem;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}
	
	.error-summary {
		display: grid;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	
	.error-field {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.error-field label {
		font-weight: 600;
		color: #888;
		min-width: 100px;
		font-size: 0.9rem;
	}
	
	.error-field span {
		color: #fff;
		font-family: 'Monaco', 'Consolas', monospace;
		font-size: 0.9rem;
	}
	
	.level-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: capitalize;
	}
	
	.level-badge.critical {
		background: rgba(239, 68, 68, 0.2);
		color: #EF4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}
	
	.level-badge.page {
		background: rgba(245, 158, 11, 0.2);
		color: #F59E0B;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}
	
	.level-badge.component {
		background: rgba(59, 130, 246, 0.2);
		color: #3B82F6;
		border: 1px solid rgba(59, 130, 246, 0.3);
	}
	
	.stack-trace {
		margin: 1rem 0;
	}
	
	.stack-trace summary {
		cursor: pointer;
		font-weight: 600;
		color: #888;
		padding: 0.5rem 0;
		user-select: none;
	}
	
	.stack-trace summary:hover {
		color: #fff;
	}
	
	.stack-trace pre {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		overflow-x: auto;
		font-size: 0.8rem;
		color: #ccc;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	
	.error-actions-secondary {
		margin-top: 1rem;
		display: flex;
		justify-content: flex-end;
	}
	
	/* Responsive design */
	@media (max-width: 768px) {
		.error-content {
			padding: 2rem;
		}
		
		.error-header {
			flex-direction: column;
			text-align: center;
			gap: 1rem;
		}
		
		.error-actions {
			flex-direction: column;
		}
		
		.error-field {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		
		.error-field label {
			min-width: auto;
		}
	}
	
	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.error-content {
			transition: none;
		}
	}
	
	/* High contrast mode */
	@media (prefers-contrast: high) {
		.error-content {
			border-width: 2px;
			background: #000;
		}
		
		.technical-details {
			border-width: 2px;
		}
	}
</style>