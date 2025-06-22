<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth, isAuthenticated } from '$lib/stores/auth';
	import { vault } from '$lib/stores/vault';
	import { messages } from '$lib/stores/messages';
	
	let isReady = false;
	
	onMount(async () => {
		// Initialize auth
		await auth.initialize();
		
		// Check authentication
		const unsubscribe = isAuthenticated.subscribe(async (authenticated) => {
			if (!authenticated) {
				goto('/auth');
			} else {
				// Initialize vault and load data
				await vault.initialize();
				if ($vault.isUnlocked) {
					await messages.loadConversations();
				}
				isReady = true;
			}
		});
		
		return unsubscribe;
	});
	
	async function handleLogout() {
		await vault.lock();
		await auth.logout();
		goto('/');
	}
</script>

{#if isReady}
	<div class="app-layout">
		<aside class="sidebar">
			<div class="sidebar-header">
				<h1>🔐 Volli</h1>
				<button class="icon-button" title="New conversation">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					</svg>
				</button>
			</div>
			
			<nav class="nav-menu">
				<a href="/app" class="nav-item" class:active={true}>
					<span class="icon">💬</span>
					<span>Messages</span>
				</a>
				<a href="/app/contacts" class="nav-item">
					<span class="icon">👥</span>
					<span>Contacts</span>
				</a>
				<a href="/app/files" class="nav-item">
					<span class="icon">📁</span>
					<span>Files</span>
				</a>
				<a href="/app/settings" class="nav-item">
					<span class="icon">⚙️</span>
					<span>Settings</span>
				</a>
			</nav>
			
			<div class="sidebar-footer">
				<div class="user-info">
					<div class="avatar">👤</div>
					<div class="user-details">
						<div class="user-name">{$auth.identity?.id.slice(0, 8)}</div>
						<div class="user-status">🟢 Secure</div>
					</div>
				</div>
				<button class="icon-button" on:click={handleLogout} title="Logout">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3M14 10l3-3m0 0l-3-3m3 3H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			</div>
		</aside>
		
		<main class="main-content">
			<slot />
		</main>
	</div>
{:else}
	<div class="loading">
		<div class="spinner"></div>
		<p>Initializing secure environment...</p>
	</div>
{/if}

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
	}
</style>