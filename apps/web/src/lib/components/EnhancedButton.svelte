<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';
	
	export let variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' = 'primary';
	export let size: 'small' | 'medium' | 'large' = 'medium';
	export let loading: boolean = false;
	export let disabled: boolean = false;
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let icon: string = '';
	export let iconPosition: 'left' | 'right' = 'left';
	export let fullWidth: boolean = false;
	export let ripple: boolean = true;
	export let successMessage: string = '';
	export let showSuccess: boolean = false;
	
	const dispatch = createEventDispatcher();
	
	let buttonElement: HTMLButtonElement;
	let showSuccessState = false;
	
	// Watch for success state changes
	$: if (showSuccess && successMessage) {
		showSuccessState = true;
		setTimeout(() => {
			showSuccessState = false;
		}, 2000);
	}
	
	function handleClick(event: MouseEvent) {
		if (loading || disabled) return;
		
		// Add ripple effect
		if (ripple) {
			createRipple(event);
		}
		
		dispatch('click', event);
	}
	
	function createRipple(event: MouseEvent) {
		const button = buttonElement;
		const rect = button.getBoundingClientRect();
		const size = Math.max(rect.width, rect.height);
		const x = event.clientX - rect.left - size / 2;
		const y = event.clientY - rect.top - size / 2;
		
		const ripple = document.createElement('span');
		ripple.style.cssText = `
			position: absolute;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.3);
			transform: scale(0);
			animation: ripple 0.6s linear;
			left: ${x}px;
			top: ${y}px;
			width: ${size}px;
			height: ${size}px;
			pointer-events: none;
		`;
		
		button.appendChild(ripple);
		
		setTimeout(() => {
			ripple.remove();
		}, 600);
	}
</script>

<button
	bind:this={buttonElement}
	{type}
	class="enhanced-button {variant} {size}"
	class:loading
	class:disabled
	class:full-width={fullWidth}
	class:success={showSuccessState}
	disabled={disabled || loading}
	on:click={handleClick}
	on:focus
	on:blur
	on:keydown
>
	<span class="button-content" class:hidden={showSuccessState}>
		{#if icon && iconPosition === 'left'}
			<span class="button-icon left">{icon}</span>
		{/if}
		
		{#if loading}
			<LoadingSpinner size="small" inline />
		{/if}
		
		<span class="button-text" class:hidden={loading && !$$slots.loading}>
			<slot />
		</span>
		
		{#if loading && $$slots.loading}
			<span class="loading-text">
				<slot name="loading" />
			</span>
		{/if}
		
		{#if icon && iconPosition === 'right'}
			<span class="button-icon right">{icon}</span>
		{/if}
	</span>
	
	{#if showSuccessState}
		<span class="success-content">
			<span class="success-icon">✓</span>
			<span class="success-text">{successMessage}</span>
		</span>
	{/if}
</button>

<style>
	.enhanced-button {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
		outline: none;
		user-select: none;
		text-decoration: none;
		background: transparent;
		min-height: 44px; /* Accessibility: minimum touch target */
	}
	
	.enhanced-button:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}
	
	/* Sizes */
	.enhanced-button.small {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		min-height: 36px;
	}
	
	.enhanced-button.large {
		padding: 1rem 2rem;
		font-size: 1.125rem;
		min-height: 52px;
	}
	
	.enhanced-button.full-width {
		width: 100%;
	}
	
	/* Variants */
	.enhanced-button.primary {
		background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
		color: white;
		box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
	}
	
	.enhanced-button.primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
		transform: translateY(-1px);
	}
	
	.enhanced-button.primary:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
	}
	
	.enhanced-button.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	.enhanced-button.secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}
	
	.enhanced-button.danger {
		background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
		color: white;
		box-shadow: 0 1px 3px rgba(239, 68, 68, 0.3);
	}
	
	.enhanced-button.danger:hover:not(:disabled) {
		background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
		transform: translateY(-1px);
	}
	
	.enhanced-button.ghost {
		background: transparent;
		color: #3B82F6;
		border: 1px solid transparent;
	}
	
	.enhanced-button.ghost:hover:not(:disabled) {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.2);
	}
	
	.enhanced-button.success {
		background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
		color: white !important;
		transform: scale(1.02);
	}
	
	/* States */
	.enhanced-button:disabled,
	.enhanced-button.loading {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none !important;
		box-shadow: none !important;
	}
	
	.enhanced-button.loading {
		cursor: wait;
	}
	
	/* Content */
	.button-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: opacity 0.2s ease;
	}
	
	.button-content.hidden {
		opacity: 0;
	}
	
	.button-icon {
		display: flex;
		align-items: center;
		font-size: 1.1em;
	}
	
	.button-text {
		transition: opacity 0.2s ease;
	}
	
	.button-text.hidden {
		opacity: 0;
	}
	
	.loading-text {
		opacity: 0.8;
	}
	
	.success-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		animation: successSlideIn 0.3s ease-out;
	}
	
	.success-icon {
		font-size: 1.2em;
		animation: successPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
	}
	
	.success-text {
		font-size: 0.9em;
	}
	
	/* Animations */
	@keyframes ripple {
		to {
			transform: scale(4);
			opacity: 0;
		}
	}
	
	@keyframes successSlideIn {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}
	
	@keyframes successPop {
		0% {
			transform: scale(0);
		}
		50% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
		}
	}
	
	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.enhanced-button {
			transition: none;
		}
		
		.enhanced-button:hover:not(:disabled) {
			transform: none;
		}
		
		.success-icon,
		.success-content {
			animation: none;
		}
	}
	
	/* High contrast mode */
	@media (prefers-contrast: high) {
		.enhanced-button {
			border: 2px solid currentColor;
		}
	}
</style>