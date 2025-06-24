<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { initializeCore } from '$lib/stores/core';
	
	let ready = false;
	
	onMount(async () => {
		try {
			// Initialize core first
			await initializeCore();
			
			// Initialize auth
			await auth.initialize();
			
			// Load dev tools in development
			if (import.meta.env.DEV) {
				import('$lib/dev-tools');
			}
			
			// Check if already authenticated
			const unsubscribe = auth.subscribe(state => {
				if (state.isAuthenticated) {
					goto('/app');
				}
			});
			
			ready = true;
			
			return unsubscribe;
		} catch (error) {
			console.error('Failed to initialize:', error);
			ready = true; // Show UI even if there's an error
		}
	});
	
	function getStarted() {
		goto('/auth');
	}
</script>

<svelte:head>
	<title>Volli - Secure Messaging</title>
	<meta name="description" content="Post-quantum secure, local-first messaging platform" />
</svelte:head>

<main class="container">
	<div class="hero">
		<h1>🔐 Volli</h1>
		<p class="tagline">Post-quantum secure, local-first messaging</p>
		
		{#if ready}
			<div class="features">
				<div class="feature">
					<h3>🔒 Post-Quantum Security</h3>
					<p>Kyber-1024 & Dilithium-3 algorithms protect against future quantum threats</p>
				</div>
				
				<div class="feature">
					<h3>📱 Multi-Platform</h3>
					<p>One codebase for Web, iOS, Android, and Desktop</p>
				</div>
				
				<div class="feature">
					<h3>🌐 Local-First</h3>
					<p>Works 100% offline with P2P sync when online</p>
				</div>
				
				<div class="feature">
					<h3>🔌 Extensible</h3>
					<p>WASM plugin system with capability-based security</p>
				</div>
			</div>
			
			<div class="cta">
				<button class="primary" on:click={getStarted}>Get Started</button>
				<button class="secondary">Learn More</button>
			</div>
		{:else}
			<p class="loading">Loading...</p>
		{/if}
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #0a0a0a;
		color: #ffffff;
	}
	
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
	
	.loading {
		color: #666;
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