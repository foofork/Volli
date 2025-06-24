<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { PassphraseInput } from '$lib/components';
	import { toasts } from '$lib/stores/toasts';
	import { onMount } from 'svelte';
	
	let displayName = '';
	let passphrase = '';
	let confirmPassphrase = '';
	let isCreating = false;
	let error = '';
	let step: 'identity' | 'passphrase' = 'identity';
	let passphraseStrength: any = null;
	
	onMount(async () => {
		// Initialize auth
		await auth.initialize();
		
		// Check if already authenticated
		const unsubscribe = auth.subscribe(state => {
			if (state.isAuthenticated && state.vaultUnlocked) {
				goto('/app');
			} else if (state.currentIdentity && !state.vaultUnlocked) {
				// Identity exists but vault not created/unlocked
				step = 'passphrase';
			}
		});
		
		return unsubscribe;
	});
	
	async function handleCreateIdentity() {
		if (!displayName.trim()) {
			error = 'Please enter a display name';
			return;
		}
		
		isCreating = true;
		error = '';
		
		try {
			await auth.createIdentity(displayName.trim());
			toasts.success('Identity created successfully!');
			step = 'passphrase';
			error = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create identity';
			toasts.error(error);
		} finally {
			isCreating = false;
		}
	}
	
	async function handleCreateVault() {
		if (!passphrase) {
			error = 'Please enter a passphrase';
			return;
		}
		
		if (passphrase !== confirmPassphrase) {
			error = 'Passphrases do not match';
			return;
		}
		
		if (!passphraseStrength || passphraseStrength.entropy < 60) {
			error = 'Passphrase is too weak. Please choose a stronger passphrase.';
			return;
		}
		
		isCreating = true;
		error = '';
		
		try {
			await auth.createVaultWithPassphrase(passphrase);
			toasts.success('Vault created successfully! Redirecting...');
			// Navigation handled by subscription
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create vault';
			toasts.error(error);
		} finally {
			isCreating = false;
		}
	}
	
	function handlePassphraseStrength(event: CustomEvent) {
		passphraseStrength = event.detail;
	}
</script>

<svelte:head>
	<title>Create Identity - Volli</title>
</svelte:head>

<main class="auth-container">
	<div class="auth-card">
		<div class="logo">
			<h1>🔐 Volli</h1>
			<p>Post-quantum secure messaging</p>
		</div>
		
		{#if step === 'identity'}
			<form on:submit|preventDefault={handleCreateIdentity}>
				<h2>Create Your Identity</h2>
				<p class="description">
					Your identity is stored locally and encrypted with post-quantum cryptography.
					No personal data is ever sent to any server.
				</p>
				
				<div class="form-group">
					<label for="displayName">Display Name</label>
					<input
						id="displayName"
						type="text"
						bind:value={displayName}
						placeholder="Enter your name"
						disabled={isCreating}
						required
					/>
				</div>
				
				{#if error}
					<div class="error">{error}</div>
				{/if}
				
				<button type="submit" disabled={isCreating}>
					{isCreating ? 'Creating...' : 'Create Identity'}
				</button>
				
				<div class="security-note">
					<p>🔒 Your keys are generated locally</p>
					<p>🌐 Works 100% offline</p>
					<p>🚫 No tracking or analytics</p>
				</div>
			</form>
		{:else}
			<form on:submit|preventDefault={handleCreateVault}>
				<h2>Secure Your Vault</h2>
				<p class="description">
					Create a strong passphrase to encrypt your vault. This passphrase will be required
					to unlock your messages and cannot be recovered if lost.
				</p>
				
				<div class="form-group">
					<PassphraseInput
						bind:value={passphrase}
						label="Passphrase"
						placeholder="Enter a strong passphrase"
						disabled={isCreating}
						on:strength={handlePassphraseStrength}
					/>
				</div>
				
				<div class="form-group">
					<label for="confirmPassphrase">Confirm Passphrase</label>
					<input
						id="confirmPassphrase"
						type="password"
						bind:value={confirmPassphrase}
						placeholder="Confirm your passphrase"
						disabled={isCreating}
						required
					/>
				</div>
				
				{#if error}
					<div class="error">{error}</div>
				{/if}
				
				<button 
					type="submit" 
					disabled={isCreating || !passphrase || !passphraseStrength || passphraseStrength.entropy < 60}
				>
					{isCreating ? 'Creating Vault...' : 'Create Secure Vault'}
				</button>
				
				<div class="security-note">
					<p>⚠️ Remember your passphrase!</p>
					<p>🔐 It cannot be recovered</p>
					<p>💾 Store it somewhere safe</p>
				</div>
			</form>
		{/if}
	</div>
</main>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
	}
	
	.auth-card {
		width: 100%;
		max-width: 450px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 3rem;
		backdrop-filter: blur(10px);
	}
	
	.logo {
		text-align: center;
		margin-bottom: 3rem;
	}
	
	.logo h1 {
		font-size: 3rem;
		margin: 0;
		background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	
	.logo p {
		color: #888;
		margin-top: 0.5rem;
	}
	
	h2 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
		color: #fff;
	}
	
	.description {
		color: #aaa;
		line-height: 1.6;
		margin-bottom: 2rem;
		font-size: 0.95rem;
	}
	
	.form-group {
		margin-bottom: 1.5rem;
	}
	
	label {
		display: block;
		margin-bottom: 0.5rem;
		color: #ccc;
		font-weight: 500;
	}
	
	input {
		width: 100%;
		padding: 0.75rem 1rem;
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
	}
	
	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	button {
		width: 100%;
		padding: 1rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	button:hover:not(:disabled) {
		background: #2563EB;
		transform: translateY(-1px);
	}
	
	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
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
	
	.security-note {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		text-align: center;
	}
	
	.security-note p {
		color: #888;
		font-size: 0.9rem;
		margin: 0.5rem 0;
	}
</style>