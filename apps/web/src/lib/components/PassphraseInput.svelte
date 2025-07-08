<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { generateId, announceToScreenReader } from '$lib/utils/accessibility';
	
	export let value: string = '';
	export let placeholder: string = 'Enter passphrase';
	export let label: string = 'Passphrase';
	export let showStrength: boolean = true;
	export let minStrength: number = 60; // Minimum entropy required
	export let disabled: boolean = false;
	export let required: boolean = true;
	export let showToggle: boolean = true;
	export let autocomplete: string = 'new-password';
	export let describedBy: string = '';
	export const errorId: string = '';
	
	const dispatch = createEventDispatcher();
	
	let showPassphrase = false;
	let strength: { entropy: number; strength: string; hasCommonPattern: boolean } | null = null;
	let suggestions: string[] = [];
	
	// Generate unique IDs for accessibility
	const inputId = generateId('passphrase-input');
	const strengthId = generateId('strength-indicator');
	const suggestionsId = generateId('suggestions');
	const errorMessageId = generateId('error-message');
	
	// Build describedBy attribute
	$: ariaDescribedBy = [
		showStrength && strength ? strengthId : '',
		suggestions.length > 0 ? suggestionsId : '',
		value && !isValid ? errorMessageId : '',
		describedBy
	].filter(Boolean).join(' ');
	
	$: if (value && showStrength) {
		strength = authStore.validatePassphraseStrength(value);
		updateSuggestions();
		// Dispatch strength event reactively
		if (strength) {
			dispatch('strength', strength);
			// Announce strength changes to screen readers
			announceToScreenReader(`Passphrase strength: ${strength.strength}`);
		}
	} else {
		strength = null;
		suggestions = [];
	}
	
	$: strengthClass = getStrengthClass(strength?.strength);
	$: strengthPercent = Math.min(100, (strength?.entropy || 0) / 128 * 100);
	$: isValid = !value || (strength && strength.entropy >= minStrength && !strength.hasCommonPattern);
	
	function getStrengthClass(strengthLevel: string | undefined) {
		switch (strengthLevel) {
			case 'excellent': return 'excellent';
			case 'strong': return 'strong';
			case 'good': return 'good';
			case 'fair': return 'fair';
			default: return 'weak';
		}
	}
	
	function updateSuggestions() {
		if (!strength) return;
		
		const newSuggestions = [];
		
		if (value.length < 12) {
			newSuggestions.push('Use at least 12 characters');
		}
		
		if (!/[a-z]/.test(value)) {
			newSuggestions.push('Add lowercase letters');
		}
		
		if (!/[A-Z]/.test(value)) {
			newSuggestions.push('Add uppercase letters');
		}
		
		if (!/[0-9]/.test(value)) {
			newSuggestions.push('Add numbers');
		}
		
		if (!/[^a-zA-Z0-9]/.test(value)) {
			newSuggestions.push('Add special characters');
		}
		
		if (strength.hasCommonPattern) {
			newSuggestions.push('Avoid common patterns');
		}
		
		if (strength.entropy < 60) {
			newSuggestions.push('Add more complexity');
		}
		
		suggestions = newSuggestions.slice(0, 3);
	}
	
	function toggleVisibility() {
		showPassphrase = !showPassphrase;
		// Announce visibility change to screen readers
		announceToScreenReader(showPassphrase ? 'Passphrase visible' : 'Passphrase hidden');
	}
	
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		dispatch('input', value);
	}
	
	function handleBlur() {
		dispatch('blur');
	}
</script>

<div class="passphrase-input">
	<label for={inputId}>
		{label}
		{#if required}
			<span class="required" aria-label="required">*</span>
		{/if}
	</label>
	
	<div class="input-wrapper">
		<input
			id={inputId}
			type={showPassphrase ? 'text' : 'password'}
			{value}
			{placeholder}
			{disabled}
			{required}
			{autocomplete}
			class:invalid={value && !isValid}
			aria-describedby={ariaDescribedBy || undefined}
			aria-invalid={value && !isValid}
			aria-label={`${label}${required ? ' (required)' : ''}`}
			on:input={handleInput}
			on:blur={handleBlur}
		/>
		
		{#if showToggle && value}
			<button
				type="button"
				class="toggle-visibility"
				on:click={toggleVisibility}
				aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
				aria-pressed={showPassphrase}
				title={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
			>
				{#if showPassphrase}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
						<path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7zm0 11.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9z" fill="currentColor"/>
					</svg>
				{:else}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M10 6a4 4 0 014 4 1 1 0 001.92.39l2.04-2.04a1 1 0 00-1.42-1.41l-.91.91A8.96 8.96 0 0010 3C5 3 1.73 7.11 1 10a16.8 16.8 0 001.86 2.65l-1.51 1.5a1 1 0 001.41 1.42l14-14a1 1 0 00-1.42-1.41L14 4.5A8.95 8.95 0 0010 3v3zm0 8a4 4 0 01-4-4v-.29l1.88-1.88A2 2 0 0010 12v2z" fill="currentColor"/>
						<path d="M10.13 14.98l1.45-1.45c.16.03.29.04.42.04a4 4 0 004-4c0-.13-.01-.26-.04-.42l2.98-2.98c.48.73.88 1.54 1.06 2.33-.73 2.89-4 7-9 7-.85 0-1.68-.12-2.47-.34l1.6-1.6z" fill="currentColor"/>
					</svg>
				{/if}
			</button>
		{/if}
	</div>
	
	{#if showStrength && value && strength}
		<div class="strength-indicator" id={strengthId} role="status" aria-live="polite">
			<div class="strength-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={strengthPercent} aria-label="Passphrase strength">
				<div
					class="strength-fill {strengthClass}"
					style="width: {strengthPercent}%"
				/>
			</div>
			<div class="strength-label">
				Strength: <span class={strengthClass}>{strength.strength}</span>
				{#if strength.entropy < minStrength}
					<span class="entropy">({Math.round(strength.entropy)} / {minStrength} bits)</span>
				{/if}
			</div>
		</div>
		
		{#if suggestions.length > 0}
			<ul class="suggestions" id={suggestionsId} role="list" aria-label="Passphrase suggestions">
				{#each suggestions as suggestion}
					<li role="listitem">{suggestion}</li>
				{/each}
			</ul>
		{/if}
	{/if}
	
	{#if value && !isValid}
		<div class="error" id={errorMessageId} role="alert" aria-live="assertive">
			{#if strength?.hasCommonPattern}
				This passphrase contains common patterns. Please choose something more unique.
			{:else if strength && strength.entropy < minStrength}
				Passphrase is too weak. Minimum {minStrength} bits of entropy required.
			{:else}
				Please enter a valid passphrase.
			{/if}
		</div>
	{/if}
</div>

<style>
	.passphrase-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}
	
	label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #fff;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	
	.required {
		color: #EF4444;
	}
	
	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}
	
	input {
		width: 100%;
		padding: 0.75rem 3rem 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		font-size: 1rem;
		transition: all 0.3s ease;
	}
	
	input:focus {
		outline: none;
		border-color: #3B82F6;
		background: rgba(255, 255, 255, 0.08);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
	}
	
	/* High contrast mode support */
	@media (prefers-contrast: high) {
		input:focus {
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.8);
			border-color: #1E40AF;
		}
	}
	
	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	input.invalid {
		border-color: #EF4444;
	}
	
	input.invalid:focus {
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
	}
	
	.toggle-visibility {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		color: #888;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.3s ease;
	}
	
	.toggle-visibility:hover {
		color: #fff;
	}
	
	.toggle-visibility:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
		color: #fff;
	}
	
	/* Ensure button is focusable and accessible */
	.toggle-visibility {
		border-radius: 4px;
	}
	
	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.toggle-visibility:focus {
			outline: 3px solid #1E40AF;
		}
	}
	
	.strength-indicator {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.strength-bar {
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}
	
	.strength-fill {
		height: 100%;
		transition: all 0.3s ease;
		border-radius: 2px;
	}
	
	.strength-fill.weak {
		background: #EF4444;
		width: 20% !important;
	}
	
	.strength-fill.fair {
		background: #F59E0B;
	}
	
	.strength-fill.good {
		background: #10B981;
	}
	
	.strength-fill.strong {
		background: #3B82F6;
	}
	
	.strength-fill.excellent {
		background: #8B5CF6;
	}
	
	.strength-label {
		font-size: 0.75rem;
		color: #888;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.strength-label span {
		font-weight: 600;
	}
	
	.strength-label span.weak {
		color: #EF4444;
	}
	
	.strength-label span.fair {
		color: #F59E0B;
	}
	
	.strength-label span.good {
		color: #10B981;
	}
	
	.strength-label span.strong {
		color: #3B82F6;
	}
	
	.strength-label span.excellent {
		color: #8B5CF6;
	}
	
	.entropy {
		font-size: 0.7rem;
		color: #666;
	}
	
	.suggestions {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.75rem;
		color: #888;
	}
	
	.suggestions li {
		padding: 0.25rem 0;
		padding-left: 1rem;
		position: relative;
	}
	
	.suggestions li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: #F59E0B;
	}
	
	.error {
		font-size: 0.875rem;
		color: #EF4444;
		margin-top: 0.25rem;
	}
	
	@media (max-width: 640px) {
		input {
			font-size: 16px; /* Prevent zoom on iOS */
		}
	}
</style>