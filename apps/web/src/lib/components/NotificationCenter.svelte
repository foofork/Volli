<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { toasts } from '$lib/stores/toasts';
	
	interface ExtendedToast {
		id: string;
		type: 'success' | 'error' | 'warning' | 'info';
		message: string;
		duration?: number;
		actions?: Array<{
			label: string;
			action: () => void;
			variant?: 'primary' | 'secondary';
		}>;
		persistent?: boolean;
		details?: string;
		showDetails?: boolean;
	}
	
	function getIcon(type: string) {
		switch (type) {
			case 'success': return '✅';
			case 'error': return '⚠️';
			case 'warning': return '⚠️';
			case 'info': return 'ℹ️';
			default: return '📢';
		}
	}
	
	function getIconColor(type: string) {
		switch (type) {
			case 'success': return '#10B981';
			case 'error': return '#EF4444';
			case 'warning': return '#F59E0B';
			case 'info': return '#3B82F6';
			default: return '#6B7280';
		}
	}
	
	function toggleDetails(toast: ExtendedToast) {
		toast.showDetails = !toast.showDetails;
		// Trigger reactivity
		$toasts = $toasts;
	}
	
	function handleKeydown(event: KeyboardEvent, toastId: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toasts.remove(toastId);
		}
	}
	
	function handleActionKeydown(event: KeyboardEvent, action: () => void) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			action();
		}
	}
</script>

{#if $toasts.length > 0}
	<div class="notification-center" role="region" aria-label="Notifications" aria-live="polite">
		<div class="notifications-container">
			{#each $toasts as toast (toast.id)}
				<div
					class="notification {toast.type}"
					class:persistent={toast.persistent}
					in:fly={{ y: 20, duration: 300, easing: quintOut }}
					out:scale={{ duration: 200, easing: quintOut }}
					role="alert"
					aria-describedby="toast-{toast.id}"
				>
					<div class="notification-header">
						<div class="notification-icon" style="color: {getIconColor(toast.type)}">
							{getIcon(toast.type)}
						</div>
						
						<div class="notification-content">
							<div class="notification-message" id="toast-{toast.id}">
								{toast.message}
							</div>
							
							{#if toast.details}
								<button 
									class="details-toggle"
									on:click={() => toggleDetails(toast)}
									on:keydown={(e) => e.key === 'Enter' && toggleDetails(toast)}
									aria-expanded={toast.showDetails}
									aria-controls="details-{toast.id}"
								>
									{toast.showDetails ? 'Hide' : 'Show'} details
									<span class="toggle-icon" class:rotated={toast.showDetails}>▼</span>
								</button>
							{/if}
						</div>
						
						<div class="notification-actions">
							{#if toast.actions}
								{#each toast.actions as action}
									<button 
										class="action-button {action.variant || 'secondary'}"
										on:click={action.action}
										on:keydown={(e) => handleActionKeydown(e, action.action)}
									>
										{action.label}
									</button>
								{/each}
							{/if}
							
							<button 
								class="close-button"
								on:click={() => toasts.remove(toast.id)}
								on:keydown={(e) => handleKeydown(e, toast.id)}
								aria-label="Close notification"
								title="Close notification"
							>
								×
							</button>
						</div>
					</div>
					
					{#if toast.details && toast.showDetails}
						<div 
							class="notification-details"
							id="details-{toast.id}"
							in:fade={{ duration: 200 }}
							out:fade={{ duration: 150 }}
						>
							<pre>{toast.details}</pre>
						</div>
					{/if}
					
					{#if !toast.persistent && toast.duration}
						<div class="progress-bar">
							<div 
								class="progress-fill {toast.type}"
								style="animation-duration: {toast.duration}ms"
							></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.notification-center {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 1000;
		max-width: 420px;
		width: 100%;
		pointer-events: none;
	}
	
	.notifications-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.notification {
		background: rgba(20, 20, 20, 0.95);
		backdrop-filter: blur(12px);
		border-radius: 12px;
		box-shadow: 
			0 10px 25px rgba(0, 0, 0, 0.3),
			0 4px 12px rgba(0, 0, 0, 0.2),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		font-size: 0.95rem;
		overflow: hidden;
		position: relative;
		pointer-events: auto;
		transition: all 0.2s ease;
	}
	
	.notification:hover {
		transform: translateY(-1px);
		box-shadow: 
			0 15px 35px rgba(0, 0, 0, 0.4),
			0 6px 18px rgba(0, 0, 0, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
	}
	
	.notification.success {
		border-color: rgba(16, 185, 129, 0.3);
		background: linear-gradient(135deg, 
			rgba(16, 185, 129, 0.1) 0%, 
			rgba(20, 20, 20, 0.95) 50%
		);
	}
	
	.notification.error {
		border-color: rgba(239, 68, 68, 0.3);
		background: linear-gradient(135deg, 
			rgba(239, 68, 68, 0.1) 0%, 
			rgba(20, 20, 20, 0.95) 50%
		);
	}
	
	.notification.warning {
		border-color: rgba(245, 158, 11, 0.3);
		background: linear-gradient(135deg, 
			rgba(245, 158, 11, 0.1) 0%, 
			rgba(20, 20, 20, 0.95) 50%
		);
	}
	
	.notification.info {
		border-color: rgba(59, 130, 246, 0.3);
		background: linear-gradient(135deg, 
			rgba(59, 130, 246, 0.1) 0%, 
			rgba(20, 20, 20, 0.95) 50%
		);
	}
	
	.notification-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
	}
	
	.notification-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
		margin-top: 0.1rem;
		filter: drop-shadow(0 0 2px currentColor);
	}
	
	.notification-content {
		flex: 1;
		min-width: 0;
	}
	
	.notification-message {
		font-weight: 500;
		line-height: 1.4;
		word-wrap: break-word;
		margin-bottom: 0.5rem;
	}
	
	.details-toggle {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.85rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0;
		transition: color 0.2s ease;
	}
	
	.details-toggle:hover {
		color: rgba(255, 255, 255, 0.9);
	}
	
	.toggle-icon {
		font-size: 0.75rem;
		transition: transform 0.2s ease;
	}
	
	.toggle-icon.rotated {
		transform: rotate(180deg);
	}
	
	.notification-actions {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	
	.action-button {
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.action-button.primary {
		background: #3B82F6;
		color: white;
	}
	
	.action-button.primary:hover {
		background: #2563EB;
	}
	
	.action-button.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	.action-button.secondary:hover {
		background: rgba(255, 255, 255, 0.15);
	}
	
	.close-button {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.2rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}
	
	.close-button:hover {
		background: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.9);
	}
	
	.notification-details {
		padding: 0 1rem 1rem 2.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin-top: 0.5rem;
		padding-top: 0.75rem;
	}
	
	.notification-details pre {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 0.75rem;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.8);
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-x: auto;
		margin: 0;
		font-family: 'Monaco', 'Consolas', monospace;
	}
	
	.progress-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}
	
	.progress-fill {
		height: 100%;
		width: 100%;
		transform-origin: left;
		animation: progress linear forwards;
	}
	
	.progress-fill.success {
		background: linear-gradient(90deg, #10B981, #059669);
	}
	
	.progress-fill.error {
		background: linear-gradient(90deg, #EF4444, #DC2626);
	}
	
	.progress-fill.warning {
		background: linear-gradient(90deg, #F59E0B, #D97706);
	}
	
	.progress-fill.info {
		background: linear-gradient(90deg, #3B82F6, #2563EB);
	}
	
	@keyframes progress {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(0);
		}
	}
	
	/* Responsive design */
	@media (max-width: 640px) {
		.notification-center {
			left: 1rem;
			right: 1rem;
			max-width: none;
		}
		
		.notification-header {
			padding: 0.875rem;
		}
		
		.notification-details {
			padding: 0 0.875rem 0.875rem 2.25rem;
		}
	}
	
	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.notification {
			transition: none;
		}
		
		.toggle-icon,
		.progress-fill {
			animation: none;
		}
	}
	
	/* High contrast mode */
	@media (prefers-contrast: high) {
		.notification {
			border-width: 2px;
			background: #000;
		}
		
		.close-button,
		.action-button {
			border: 2px solid currentColor;
		}
	}
</style>