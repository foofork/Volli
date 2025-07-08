<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { toasts } from '$lib/stores/toasts';
	import { onMount } from 'svelte';
	
	let name = '';
	let pin = '';
	let isLoading = false;
	let step: 'name' | 'pin' = 'name';
	let error = '';
	
	onMount(async () => {
		// Auto-focus name input
		const nameInput = document.querySelector('#name-input') as HTMLInputElement;
		if (nameInput) {
			nameInput.focus();
		}
	});
	
	async function handleContinue() {
		if (!name.trim()) {
			error = 'Please enter your name';
			return;
		}
		
		// Clear any previous errors
		error = '';
		
		// Move to PIN step
		step = 'pin';
		
		// Auto-focus PIN input after a brief delay
		setTimeout(() => {
			const pinInput = document.querySelector('#pin-input') as HTMLInputElement;
			if (pinInput) {
				pinInput.focus();
			}
		}, 100);
	}
	
	async function handleCreateAccount() {
		if (!pin || pin.length !== 6) {
			error = 'Please enter a 6-digit PIN';
			return;
		}
		
		isLoading = true;
		error = '';
		
		try {
			// Step 1: Create identity (auto-generates cryptographic keys behind the scenes)
			await auth.createIdentity(name.trim());
			
			// Step 2: Create account with PIN (replaces createVaultWithPassphrase)
			await auth.createAccount(pin);
			
			// Success! Navigate to app
			toasts.success('Account created successfully!');
			goto('/app');
			
		} catch (err) {
			error = 'Something went wrong. Please try again.';
			console.error('Account creation failed:', err);
		} finally {
			isLoading = false;
		}
	}
	
	function handlePinInput(event: Event) {
		const target = event.target as HTMLInputElement;
		// Only allow digits
		target.value = target.value.replace(/[^0-9]/g, '');
		pin = target.value;
	}
</script>

<main class="onboarding-container">
	<div class="onboarding-card">
		<div class="header">
			<h1>volly</h1>
			<div class="progress">
				<div class="step" class:active={step === 'name'} class:completed={step === 'pin'}>1</div>
				<div class="line" class:completed={step === 'pin'}></div>
				<div class="step" class:active={step === 'pin'}>2</div>
			</div>
		</div>
		
		{#if step === 'name'}
			<div class="step-content">
				<h2>Choose your name</h2>
				<p class="description">
					This is how friends will find you
				</p>
				
				<div class="form-group">
					<input
						id="name-input"
						type="text"
						bind:value={name}
						placeholder="Your name"
						maxlength="50"
						disabled={isLoading}
						on:keydown={(e) => e.key === 'Enter' && handleContinue()}
					/>
				</div>
				
				{#if error}
					<div class="error">{error}</div>
				{/if}
				
				<button 
					type="button"
					class="primary"
					disabled={!name.trim() || isLoading}
					on:click={handleContinue}
				>
					Continue →
				</button>
			</div>
		{:else}
			<div class="step-content">
				<h2>Create a PIN</h2>
				<p class="description">
					6 digits to secure your account
				</p>
				
				<div class="form-group">
					<input
						id="pin-input"
						type="password"
						bind:value={pin}
						placeholder="• • • • • •"
						maxlength="6"
						pattern="[0-9]{6}"
						inputmode="numeric"
						disabled={isLoading}
						on:input={handlePinInput}
						on:keydown={(e) => e.key === 'Enter' && pin.length === 6 && handleCreateAccount()}
					/>
					<div class="pin-hint">Use numbers you'll remember</div>
				</div>
				
				{#if error}
					<div class="error">{error}</div>
				{/if}
				
				<button 
					type="button"
					class="primary"
					disabled={pin.length !== 6 || isLoading}
					on:click={handleCreateAccount}
				>
					{isLoading ? 'Creating account...' : 'Create Account'}
				</button>
			</div>
		{/if}
		
		<div class="footer">
			<p>Your messages are always private</p>
		</div>
	</div>
</main>

<style>
	.onboarding-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
	}
	
	.onboarding-card {
		width: 100%;
		max-width: 400px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 2rem;
		backdrop-filter: blur(20px);
		text-align: center;
	}
	
	.header h1 {
		font-size: 2rem;
		margin: 0 0 2rem;
		background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	
	.progress {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 3rem;
	}
	
	.step {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		color: #666;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		transition: all 0.3s ease;
	}
	
	.step.active {
		background: #3B82F6;
		color: white;
	}
	
	.step.completed {
		background: #10B981;
		color: white;
	}
	
	.line {
		width: 48px;
		height: 2px;
		background: rgba(255, 255, 255, 0.1);
		margin: 0 8px;
		transition: all 0.3s ease;
	}
	
	.line.completed {
		background: #10B981;
	}
	
	.step-content {
		margin-bottom: 2rem;
	}
	
	h2 {
		font-size: 1.5rem;
		margin: 0 0 0.5rem;
		color: #fff;
	}
	
	.description {
		color: #aaa;
		margin: 0 0 2rem;
		font-size: 0.95rem;
	}
	
	.form-group {
		margin-bottom: 1.5rem;
		text-align: left;
	}
	
	input {
		width: 100%;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: #fff;
		font-size: 1.1rem;
		text-align: center;
		transition: all 0.3s ease;
	}
	
	input:focus {
		outline: none;
		border-color: #3B82F6;
		background: rgba(255, 255, 255, 0.08);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}
	
	input::placeholder {
		color: #666;
	}
	
	.pin-hint {
		text-align: center;
		font-size: 0.85rem;
		color: #888;
		margin-top: 0.5rem;
	}
	
	button.primary {
		width: 100%;
		padding: 1rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 12px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	button.primary:hover:not(:disabled) {
		background: #2563EB;
		transform: translateY(-1px);
	}
	
	button.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}
	
	.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #EF4444;
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}
	
	.footer {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 1.5rem;
		margin-top: 2rem;
	}
	
	.footer p {
		color: #888;
		font-size: 0.9rem;
		margin: 0;
	}
	
	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		* {
			transition: none !important;
		}
		
		button.primary:hover:not(:disabled) {
			transform: none;
		}
	}
	
	@media (prefers-contrast: high) {
		input:focus {
			border-color: #1E40AF;
			box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.5);
		}
	}
</style>