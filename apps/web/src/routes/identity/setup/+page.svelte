<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { toasts } from '$lib/stores/toasts';
	import PinInput from '$lib/components/PinInput.svelte';
	import { onMount } from 'svelte';
	
	let pin = '';
	let isCreating = false;
	let error = '';
	
	onMount(() => {
		// Redirect if no identity created
		if (!$auth.currentIdentity) {
			goto('/identity/create');
		}
	});
	
	async function handleCreateAccount() {
		if (pin.length !== 6) {
			error = 'Please enter a 6-digit PIN';
			return;
		}
		
		isCreating = true;
		error = '';
		
		try {
			await auth.createAccount(pin);
			toasts.success('Account created successfully!');
			goto('/app');
		} catch (err) {
			console.error('Failed to create account:', err);
			// Show user-friendly error message
			error = "We couldn't create your account. Please try again.";
			isCreating = false;
		}
	}
	
	function handlePinInput(event: CustomEvent<{ value: string }>) {
		pin = event.detail.value;
		if (error && pin.length > 0) {
			error = ''; // Clear error when user starts typing
		}
	}
</script>

<svelte:head>
	<title>Secure Your Account - Volly</title>
</svelte:head>

<div class="setup-container">
	<div class="setup-card">
		<div class="logo">🔒</div>
		
		<h1>Secure Your Account</h1>
		<p class="subtitle">
			Choose a 6-digit PIN to protect your messages.
			You'll use this PIN to unlock Volly.
		</p>
		
		<form on:submit|preventDefault={handleCreateAccount}>
			<div class="pin-section">
				<PinInput
					value={pin}
					on:input={handlePinInput}
					label="Choose PIN"
					required={true}
					disabled={isCreating}
					autoFocus={true}
					errorId={error ? 'pin-error' : ''}
				/>
			</div>
			
			{#if error}
				<div id="pin-error" class="error" role="alert">
					{error}
				</div>
			{/if}
			
			<div class="tips">
				<h3>PIN Tips:</h3>
				<ul>
					<li>Choose something memorable but not obvious</li>
					<li>Avoid patterns like 123456 or 111111</li>
					<li>Don't use your birthday or phone number</li>
				</ul>
			</div>
			
			<button
				type="submit"
				class="primary"
				disabled={isCreating || pin.length !== 6}
			>
				{isCreating ? 'Creating Account...' : 'Create Account'}
			</button>
		</form>
		
		<div class="back-link">
			<button on:click={() => goto('/identity/create')} class="link">
				← Back
			</button>
		</div>
	</div>
</div>

<style>
	.setup-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
	}
	
	.setup-card {
		width: 100%;
		max-width: 480px;
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
	
	.pin-section {
		display: flex;
		justify-content: center;
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
	
	.tips {
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 8px;
		padding: 1rem;
	}
	
	.tips h3 {
		margin: 0 0 0.5rem;
		color: #3B82F6;
		font-size: 0.9rem;
		font-weight: 600;
	}
	
	.tips ul {
		margin: 0;
		padding-left: 1.5rem;
		list-style: none;
	}
	
	.tips li {
		color: #888;
		font-size: 0.85rem;
		line-height: 1.6;
		position: relative;
		padding-left: 1rem;
	}
	
	.tips li::before {
		content: '•';
		color: #3B82F6;
		position: absolute;
		left: 0;
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
		.setup-card {
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