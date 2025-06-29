<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { generateId, announceToScreenReader } from '$lib/utils/accessibility';
	
	export let value: string = '';
	export let label: string = 'PIN';
	export let disabled: boolean = false;
	export let required: boolean = true;
	export let autoFocus: boolean = false;
	export let errorId: string = '';
	
	const dispatch = createEventDispatcher();
	
	let pinInputs: HTMLInputElement[] = [];
	let digits = ['', '', '', '', '', ''];
	
	// Generate unique IDs for accessibility
	const containerID = generateId('pin-container');
	const labelId = generateId('pin-label');
	
	// Update external value when digits change
	$: {
		value = digits.join('');
		dispatch('input', { value });
	}
	
	// Parse incoming value into individual digits
	$: if (value && value !== digits.join('')) {
		const newDigits = value.padEnd(6, '').slice(0, 6).split('');
		digits = newDigits;
	}
	
	function handleInput(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		const inputValue = target.value;
		
		// Only allow single digits
		if (inputValue.length > 1) {
			target.value = inputValue.slice(-1);
		}
		
		// Only allow numbers
		if (!/^\d*$/.test(target.value)) {
			target.value = digits[index];
			return;
		}
		
		digits[index] = target.value;
		
		// Auto-focus next input
		if (target.value && index < 5) {
			pinInputs[index + 1]?.focus();
		}
		
		// Announce completion to screen readers
		if (digits.every(d => d !== '') && index === 5) {
			announceToScreenReader('PIN complete');
		}
	}
	
	function handleKeydown(index: number, event: KeyboardEvent) {
		// Handle backspace
		if (event.key === 'Backspace' && !digits[index] && index > 0) {
			pinInputs[index - 1]?.focus();
			return;
		}
		
		// Handle paste
		if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
			handlePaste(event);
			return;
		}
		
		// Handle arrow navigation
		if (event.key === 'ArrowLeft' && index > 0) {
			event.preventDefault();
			pinInputs[index - 1]?.focus();
		} else if (event.key === 'ArrowRight' && index < 5) {
			event.preventDefault();
			pinInputs[index + 1]?.focus();
		}
	}
	
	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const pastedData = event.clipboardData?.getData('text/plain') || '';
		const numbersOnly = pastedData.replace(/\D/g, '').slice(0, 6);
		
		if (numbersOnly.length > 0) {
			const newDigits = numbersOnly.padEnd(6, '').slice(0, 6).split('');
			digits = newDigits;
			
			// Focus the next empty input or the last input
			const nextEmptyIndex = digits.findIndex(d => d === '');
			const focusIndex = nextEmptyIndex >= 0 ? nextEmptyIndex : 5;
			pinInputs[focusIndex]?.focus();
			
			announceToScreenReader(`Pasted ${numbersOnly.length} digits`);
		}
	}
	
	function clearPin() {
		digits = ['', '', '', '', '', ''];
		pinInputs[0]?.focus();
		announceToScreenReader('PIN cleared');
	}
</script>

<div class="pin-input-container">
	<label id={labelId} for={containerID} class="pin-label">
		{label}
		{#if required}
			<span class="required" aria-label="required">*</span>
		{/if}
	</label>
	
	<div 
		id={containerID}
		class="pin-inputs"
		role="group"
		aria-labelledby={labelId}
		aria-describedby={errorId || undefined}
	>
		{#each digits as digit, index}
			<input
				bind:this={pinInputs[index]}
				type="text"
				inputmode="numeric"
				pattern="[0-9]"
				maxlength="1"
				value={digit}
				disabled={disabled}
				class="pin-digit"
				class:filled={digit !== ''}
				aria-label="Digit {index + 1} of 6"
				on:input={(e) => handleInput(index, e)}
				on:keydown={(e) => handleKeydown(index, e)}
				on:paste={handlePaste}
				autocomplete="off"
				spellcheck="false"
				autofocus={autoFocus && index === 0}
			/>
		{/each}
	</div>
	
	{#if value.length > 0}
		<button 
			type="button" 
			class="clear-button"
			on:click={clearPin}
			disabled={disabled}
			aria-label="Clear PIN"
		>
			Clear
		</button>
	{/if}
</div>

<style>
	.pin-input-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.pin-label {
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	
	.required {
		color: #EF4444;
		font-weight: 700;
	}
	
	.pin-inputs {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}
	
	.pin-digit {
		width: 3rem;
		height: 3rem;
		text-align: center;
		font-size: 1.25rem;
		font-weight: 600;
		border: 2px solid #E5E7EB;
		border-radius: 0.5rem;
		background: #FFFFFF;
		transition: all 0.2s ease;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
	}
	
	.pin-digit:focus {
		outline: none;
		border-color: #3B82F6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}
	
	.pin-digit.filled {
		border-color: #10B981;
		background: #F0FDF4;
		color: #065F46;
	}
	
	.pin-digit:disabled {
		background: #F9FAFB;
		color: #9CA3AF;
		cursor: not-allowed;
	}
	
	.clear-button {
		align-self: center;
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		color: #6B7280;
		background: none;
		border: 1px solid #E5E7EB;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.clear-button:hover:not(:disabled) {
		color: #374151;
		border-color: #D1D5DB;
		background: #F9FAFB;
	}
	
	.clear-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.pin-label {
			color: #D1D5DB;
		}
		
		.pin-digit {
			background: #111827;
			border-color: #374151;
			color: #F9FAFB;
		}
		
		.pin-digit:focus {
			border-color: #60A5FA;
			box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
		}
		
		.pin-digit.filled {
			border-color: #34D399;
			background: #064E3B;
			color: #A7F3D0;
		}
		
		.pin-digit:disabled {
			background: #1F2937;
			color: #6B7280;
		}
		
		.clear-button {
			color: #9CA3AF;
			border-color: #374151;
		}
		
		.clear-button:hover:not(:disabled) {
			color: #D1D5DB;
			border-color: #4B5563;
			background: #1F2937;
		}
	}
</style>