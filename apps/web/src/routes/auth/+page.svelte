<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { KeyboardShortcuts } from '$lib/utils/accessibility';
	
	let ready = false;
	let keyboardShortcuts: KeyboardShortcuts;

	onMount(async () => {
		try {
			// Check if already authenticated
			const unsubscribe = auth.subscribe(state => {
				if (state.isAuthenticated) {
					goto('/app');
				}
			});
			
			// Set up keyboard shortcuts
			keyboardShortcuts = new KeyboardShortcuts();
			keyboardShortcuts.register('enter', getStarted);
			keyboardShortcuts.register('g', getStarted); // 'g' for get started
			keyboardShortcuts.register('c', createIdentity); // 'c' for create
			keyboardShortcuts.register('s', setupIdentity); // 's' for setup
			
			ready = true;
			
			return () => {
				unsubscribe();
				keyboardShortcuts?.destroy();
			};
		} catch (error) {
			console.error('Failed to initialize auth page:', error);
			ready = true; // Show UI even if there's an error
		}
	});
	
	function getStarted() {
		goto('/auth/identity/create');
	}
	
	function createIdentity() {
		goto('/auth/identity/create');
	}
	
	function setupIdentity() {
		goto('/auth/identity/setup');
	}
</script>

<svelte:head>
	<title>Volly - Secure Messaging</title>
	<meta name="description" content="Post-quantum secure, local-first messaging platform" />
</svelte:head>

<main class="container">
	<div class="hero">
		<h1>
			<span class="logo-icon" role="img" aria-label="Lock icon">🔐</span>
			Volly
		</h1>
		<p class="tagline">Post-quantum secure, local-first messaging</p>
		
		{#if ready}
			<section class="features" aria-label="Key features">
				<div class="feature">
					<h3>
						<span class="feature-icon" role="img" aria-label="Lock icon">🔒</span>
						Post-Quantum Security
					</h3>
					<p>ML-KEM & ML-DSA algorithms protect against future quantum threats</p>
				</div>
				
				<div class="feature">
					<h3>
						<span class="feature-icon" role="img" aria-label="Mobile phone icon">📱</span>
						Multi-Platform
					</h3>
					<p>One codebase for Web, iOS, Android, and Desktop</p>
				</div>
				
				<div class="feature">
					<h3>
						<span class="feature-icon" role="img" aria-label="Globe icon">🌐</span>
						Local-First
					</h3>
					<p>Works 100% offline with P2P sync when online</p>
				</div>
				
				<div class="feature">
					<h3>
						<span class="feature-icon" role="img" aria-label="Plug icon">🔌</span>
						Hybrid Security
					</h3>
					<p>Classical + post-quantum crypto for transition security</p>
				</div>
			</section>
			
			<div class="cta" role="group" aria-label="Main actions">
				<button 
					class="primary" 
					on:click={getStarted}
					aria-describedby="get-started-hint"
				>
					Create New Identity
				</button>
				<button 
					class="secondary" 
					on:click={setupIdentity}
					aria-describedby="setup-hint"
				>
					Setup Existing Identity
				</button>
				<div class="sr-only">
					<div id="get-started-hint">Create a new secure identity (Keyboard shortcut: G, C, or Enter)</div>
					<div id="setup-hint">Setup an existing identity from backup (Keyboard shortcut: S)</div>
				</div>
			</div>
		{:else}
			<div class="loading" role="status" aria-live="polite">
				<div class="spinner" aria-hidden="true"></div>
				<p>Loading secure environment...</p>
			</div>
		{/if}
	</div>
</main>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.hero {
		text-align: center;
	}
	
	h1 {
		font-size: 4rem;
		margin: 0 0 1rem;
		background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	
	.tagline {
		font-size: 1.5rem;
		color: #888;
		margin-bottom: 3rem;
	}
	
	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
		margin: 3rem 0;
	}
	
	.feature {
		background: rgba(255, 255, 255, 0.05);
		padding: 2rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.3s ease;
	}
	
	.feature:hover {
		background: rgba(255, 255, 255, 0.08);
		transform: translateY(-4px);
		border-color: rgba(59, 130, 246, 0.5);
	}
	
	.feature:focus-within {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(59, 130, 246, 0.7);
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
	}
	
	.feature h3 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
	}
	
	.feature p {
		color: #aaa;
		line-height: 1.6;
		margin: 0;
	}
	
	.cta {
		margin-top: 3rem;
		display: flex;
		gap: 1rem;
		justify-content: center;
	}
	
	button {
		padding: 0.75rem 2rem;
		font-size: 1.1rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s ease;
		font-weight: 600;
		position: relative;
	}
	
	button:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 3px;
	}
	
	.primary {
		background: #3B82F6;
		color: white;
	}
	
	.primary:hover {
		background: #2563EB;
		transform: translateY(-2px);
	}
	
	.secondary {
		background: transparent;
		color: #3B82F6;
		border: 2px solid #3B82F6;
	}
	
	.secondary:hover {
		background: rgba(59, 130, 246, 0.1);
	}
	
	.secondary:focus {
		background: rgba(59, 130, 246, 0.15);
	}
	
	.loading {
		color: #666;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	
	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: #3B82F6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
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
		button:focus {
			outline: 3px solid #1E40AF;
		}
		
		.feature:focus-within {
			outline: 3px solid #1E40AF;
		}
	}
	
	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.feature {
			transition: none;
		}
		
		button {
			transition: none;
		}
		
		.spinner {
			animation: none;
		}
		
		.feature:hover {
			transform: none;
		}
		
		.primary:hover {
			transform: none;
		}
	}
	
	@media (max-width: 768px) {
		h1 {
			font-size: 3rem;
		}
		
		.tagline {
			font-size: 1.25rem;
		}
		
		.features {
			grid-template-columns: 1fr;
		}
		
		.cta {
			flex-direction: column;
		}
		
		button {
			width: 100%;
		}
	}
</style>