<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth, isAuthenticated } from '$lib/stores/auth';
	import { vault } from '$lib/stores/vault';
	import { messages } from '$lib/stores/messages';
	import { PassphraseInput, ErrorBoundary } from '$lib/components';
	import { contacts } from '$lib/stores/contacts';
	import { files } from '$lib/stores/files';
	import { toasts } from '$lib/stores/toasts';
	import { KeyboardShortcuts, handleArrowNavigation, announceToScreenReader } from '$lib/utils/accessibility';
	import { networkStore } from '@volli/integration';
	import VaultErrorFallback from '$lib/components/VaultErrorFallback.svelte';
	
	let isReady = false;
	let unlockPassphrase = '';
	let unlockError = '';
	let isUnlocking = false;
	let keyboardShortcuts: KeyboardShortcuts;
	let sidebarElement: HTMLElement;
	
	async function connectToSignaling() {
		try {
			const currentIdentity = $auth.currentIdentity;
			if (!currentIdentity || !currentIdentity.publicKey) {
				console.warn('No identity available for signaling connection');
				return;
			}
			
			await networkStore.connectToSignaling(
				'ws://localhost:8080',
				currentIdentity.id,
				currentIdentity.publicKey
			);
			
			toasts.success('Connected to network');
		} catch (error) {
			console.error('Failed to connect to signaling:', error);
			toasts.warning('Network connection failed - continuing offline');
		}
	}
	
	onMount(async () => {
		// Initialize auth
		await auth.initialize();
		
		// Set up keyboard shortcuts
		keyboardShortcuts = new KeyboardShortcuts();
		keyboardShortcuts.register('ctrl+l', handleLock);
		keyboardShortcuts.register('cmd+l', handleLock);
		keyboardShortcuts.register('ctrl+q', handleLogout);
		keyboardShortcuts.register('cmd+q', handleLogout);
		
		// Check authentication
		const unsubscribe = isAuthenticated.subscribe(async (authenticated) => {
			if (!authenticated) {
				goto('/auth');
			} else {
				// Initialize vault and load data
				await vault.initialize();
				if ($vault.isUnlocked) {
					await messages.loadConversations();
					await contacts.loadContacts();
					await files.loadFiles();
					await connectToSignaling();
					announceToScreenReader('Application ready. Vault unlocked and secure.');
				} else {
					announceToScreenReader('Please unlock your vault to continue.');
				}
				isReady = true;
			}
		});
		
		return () => {
			unsubscribe();
			keyboardShortcuts?.destroy();
		};
	});
	
	async function handleUnlock() {
		if (!unlockPassphrase) {
			unlockError = 'Please enter your passphrase';
			return;
		}
		
		isUnlocking = true;
		unlockError = '';
		
		try {
			const success = await auth.unlockVault(unlockPassphrase);
			if (success) {
				unlockPassphrase = '';
				toasts.success('Vault unlocked successfully!');
				await messages.loadConversations();
				await contacts.loadContacts();
				await files.loadFiles();
				await connectToSignaling();
			} else {
				unlockError = 'Incorrect passphrase';
				toasts.error('Incorrect passphrase');
			}
		} catch (err) {
			unlockError = err instanceof Error ? err.message : 'Failed to unlock vault';
			toasts.error(unlockError);
		} finally {
			isUnlocking = false;
		}
	}
	
	async function handleLock() {
		auth.lockVault();
		messages.reset();
		contacts.reset();
		files.reset();
		toasts.info('Vault locked');
		announceToScreenReader('Vault locked successfully');
	}
	
	async function handleLogout() {
		auth.logout();
		announceToScreenReader('Logged out successfully');
		goto('/');
	}
	
	function handleSidebarKeydown(event: KeyboardEvent) {
		if (sidebarElement) {
			handleArrowNavigation(sidebarElement, event, 'vertical');
		}
	}
</script>

<ErrorBoundary fallback={VaultErrorFallback}>
{#if isReady}
	{#if !$vault.isUnlocked}
		<div class="unlock-screen">
			<div class="unlock-card">
				<h1>
					<span role="img" aria-label="Lock icon">🔐</span>
					Volli
				</h1>
				<h2>Unlock Your Vault</h2>
				<p>Enter your passphrase to decrypt your messages</p>
				
				<form on:submit|preventDefault={handleUnlock} aria-labelledby="unlock-heading">
					<PassphraseInput
						bind:value={unlockPassphrase}
						label="Passphrase"
						placeholder="Enter your passphrase"
						disabled={isUnlocking}
						showStrength={false}
						errorId={unlockError ? 'unlock-error' : ''}
					/>
					
					{#if unlockError}
						<div class="error" id="unlock-error" role="alert" aria-live="assertive">{unlockError}</div>
					{/if}
					
					<button type="submit" disabled={isUnlocking || !unlockPassphrase} aria-describedby="unlock-help">
						{isUnlocking ? 'Unlocking...' : 'Unlock Vault'}
					</button>
					<div class="sr-only" id="unlock-help">Use your secure passphrase to decrypt and access your messages</div>
				</form>
				
				<div class="unlock-footer">
					<button class="text-button" on:click={handleLogout} aria-label="Sign out and return to home page">
						Sign out
					</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="app-layout">
			<aside class="sidebar" bind:this={sidebarElement} role="navigation" aria-label="Main navigation">
				<div class="sidebar-header">
					<h1>
						<span role="img" aria-label="Lock icon">🔐</span>
						Volli
					</h1>
					<button class="icon-button" aria-label="Start new conversation" title="New conversation">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
							<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</button>
				</div>
				
				<nav class="nav-menu">
					<a href="/app" class="nav-item" class:active={true} role="menuitem" aria-current="page">
						<span class="icon" role="img" aria-label="Messages icon">💬</span>
						<span>Messages</span>
					</a>
					<a href="/app/contacts" class="nav-item" role="menuitem">
						<span class="icon" role="img" aria-label="Contacts icon">👥</span>
						<span>Contacts</span>
					</a>
					<a href="/app/files" class="nav-item" role="menuitem">
						<span class="icon" role="img" aria-label="Files icon">📁</span>
						<span>Files</span>
					</a>
					<a href="/app/settings" class="nav-item" role="menuitem">
						<span class="icon" role="img" aria-label="Settings icon">⚙️</span>
						<span>Settings</span>
					</a>
				</nav>
				
				<div class="sidebar-footer">
					<div class="user-info" role="group" aria-label="User information">
						<div class="avatar" role="img" aria-label="User avatar">👤</div>
						<div class="user-details">
							<div class="user-name" aria-label="Current user">{$auth.currentIdentity?.displayName}</div>
							<div class="user-status">
								<span role="img" aria-label="Online status indicator">🟢</span>
								Secure
							</div>
						</div>
					</div>
					<div class="footer-actions" role="group" aria-label="Account actions">
						<button class="icon-button" on:click={handleLock} aria-label="Lock vault (Ctrl+L)" title="Lock vault">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
								<path d="M5 9V7a5 5 0 0110 0v2m-9 0h8a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</button>
						<button class="icon-button" on:click={handleLogout} aria-label="Logout (Ctrl+Q)" title="Logout">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
								<path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3M14 10l3-3m0 0l-3-3m3 3H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</button>
					</div>
				</div>
			</aside>
			
			<main class="main-content">
				<slot />
			</main>
		</div>
	{/if}
{:else}
	<div class="loading" role="status" aria-live="polite">
		<div class="spinner" aria-hidden="true"></div>
		<p>Initializing secure environment...</p>
	</div>
{/if}
</ErrorBoundary>

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		background: #0a0a0a;
		color: #fff;
	}
	
	.sidebar {
		width: 280px;
		background: rgba(255, 255, 255, 0.03);
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
	}
	
	.sidebar-header {
		padding: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.sidebar-header h1 {
		font-size: 1.5rem;
		margin: 0;
		background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	
	.icon-button {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: none;
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
	}
	
	.icon-button:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	
	.icon-button:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
		background: rgba(255, 255, 255, 0.1);
	}
	
	.nav-menu {
		flex: 1;
		padding: 1rem 0;
		overflow-y: auto;
	}
	
	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		color: #aaa;
		text-decoration: none;
		transition: all 0.3s ease;
		position: relative;
	}
	
	.nav-item:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.05);
	}
	
	.nav-item:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
		color: #fff;
		background: rgba(255, 255, 255, 0.05);
	}
	
	.nav-item.active {
		color: #3B82F6;
		background: rgba(59, 130, 246, 0.1);
	}
	
	.nav-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: #3B82F6;
	}
	
	.nav-item .icon {
		font-size: 1.25rem;
	}
	
	.sidebar-footer {
		padding: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: space-between;
	}
	
	.footer-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.user-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	
	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
	}
	
	.user-details {
		flex: 1;
	}
	
	.user-name {
		font-weight: 600;
		font-size: 0.9rem;
	}
	
	.user-status {
		font-size: 0.8rem;
		color: #4ADE80;
	}
	
	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 1.5rem;
	}
	
	.spinner {
		width: 48px;
		height: 48px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #3B82F6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.loading p {
		color: #888;
		font-size: 1.1rem;
	}
	
	/* Unlock Screen Styles */
	.unlock-screen {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: #0a0a0a;
	}
	
	.unlock-card {
		width: 100%;
		max-width: 450px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 3rem;
		backdrop-filter: blur(10px);
		text-align: center;
	}
	
	.unlock-card h1 {
		font-size: 3rem;
		margin: 0 0 1rem;
		background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	
	.unlock-card h2 {
		margin: 0 0 0.5rem;
		color: #fff;
		font-size: 1.5rem;
	}
	
	.unlock-card p {
		color: #888;
		margin-bottom: 2rem;
	}
	
	.unlock-card form {
		text-align: left;
	}
	
	.unlock-card button[type="submit"] {
		width: 100%;
		padding: 0.75rem;
		background: #3B82F6;
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		margin-top: 1rem;
	}
	
	.unlock-card button[type="submit"]:hover:not(:disabled) {
		background: #2563EB;
	}
	
	.unlock-card button[type="submit"]:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	
	.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #EF4444;
		padding: 0.75rem;
		border-radius: 8px;
		margin: 1rem 0;
		font-size: 0.9rem;
		text-align: center;
	}
	
	.unlock-footer {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.text-button {
		background: none;
		border: none;
		color: #3B82F6;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0.5rem;
		transition: color 0.3s ease;
	}
	
	.text-button:hover {
		color: #2563EB;
		text-decoration: underline;
	}
	
	.text-button:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
		color: #2563EB;
	}
	
	.sr-only {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	
	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.icon-button:focus {
			outline: 3px solid #1E40AF;
		}
		
		.nav-item:focus {
			outline: 3px solid #1E40AF;
		}
		
		.text-button:focus {
			outline: 3px solid #1E40AF;
		}
	}
	
	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}
	
	@media (max-width: 768px) {
		.sidebar {
			width: 80px;
		}
		
		.sidebar-header h1 {
			display: none;
		}
		
		.nav-item span:not(.icon) {
			display: none;
		}
		
		.user-details {
			display: none;
		}
		
		.footer-actions {
			flex-direction: column;
		}
	}
</style>