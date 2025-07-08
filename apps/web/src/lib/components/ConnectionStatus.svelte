<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { smartNetwork, networkStore } from '@volli/integration';
	import StatusIndicator from './StatusIndicator.svelte';
	
	type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
	
	let connectionState: ConnectionState = 'disconnected';
	let reconnectAttempts = 0;
	let serverLatency: number | null = null;
	let showDetails = false;
	let unsubscribe: (() => void) | null = null;
	
	onMount(() => {
		// Subscribe to network state changes
		unsubscribe = networkStore.subscribe(state => {
			if (state.signalingStatus === 'connected') {
				connectionState = 'connected';
			} else if (state.signalingStatus === 'connecting') {
				connectionState = 'connecting';
			} else {
				// Check if we're reconnecting
				const health = smartNetwork.getHealthStatus();
				if (health.isReconnecting) {
					connectionState = 'reconnecting';
					reconnectAttempts = health.reconnectAttempts;
				} else {
					connectionState = 'disconnected';
				}
			}
		});
		
		// Update health status periodically
		const interval = setInterval(() => {
			const health = smartNetwork.getHealthStatus();
			if (health.currentServer) {
				const serverHealth = health.serverHealth.find(s => s.url === health.currentServer);
				serverLatency = serverHealth?.latency !== Infinity ? serverHealth?.latency || null : null;
			}
		}, 5000);
		
		return () => {
			clearInterval(interval);
		};
	});
	
	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});
	
	function getStatusConfig(): { status: string; label: string; animate?: boolean } {
		switch (connectionState) {
			case 'connected':
				return { status: 'online', label: 'Connected' };
			case 'connecting':
				return { status: 'pending', label: 'Connecting...', animate: true };
			case 'reconnecting':
				return { 
					status: 'warning', 
					label: `Reconnecting (${reconnectAttempts})...`, 
					animate: true 
				};
			case 'disconnected':
			default:
				return { status: 'offline', label: 'Disconnected' };
		}
	}
	
	function toggleDetails() {
		showDetails = !showDetails;
	}
	
	function formatLatency(ms: number | null): string {
		if (ms === null) return 'N/A';
		if (ms < 100) return `${ms}ms ⚡`;
		if (ms < 300) return `${ms}ms`;
		return `${ms}ms 🐌`;
	}
</script>

<div class="connection-status" class:expanded={showDetails}>
	<button 
		class="status-button" 
		on:click={toggleDetails}
		aria-label="Connection status: {getStatusConfig().label}"
		aria-expanded={showDetails}
	>
		<StatusIndicator 
			{...getStatusConfig()}
			size="small"
			inline={true}
		/>
		{#if serverLatency !== null && connectionState === 'connected'}
			<span class="latency">{formatLatency(serverLatency)}</span>
		{/if}
	</button>
	
	{#if showDetails}
		<div class="details" role="region" aria-label="Connection details">
			<h3>Connection Details</h3>
			
			<div class="detail-row">
				<span class="label">Status:</span>
				<span class="value">{getStatusConfig().label}</span>
			</div>
			
			{#if connectionState === 'connected' && serverLatency !== null}
				<div class="detail-row">
					<span class="label">Latency:</span>
					<span class="value">{formatLatency(serverLatency)}</span>
				</div>
			{/if}
			
			{#if connectionState === 'reconnecting'}
				<div class="detail-row">
					<span class="label">Attempts:</span>
					<span class="value">{reconnectAttempts}</span>
				</div>
			{/if}
			
			<div class="info">
				{#if connectionState === 'connected'}
					<p>🔒 All messages are end-to-end encrypted</p>
				{:else if connectionState === 'reconnecting'}
					<p>⏳ Attempting to restore connection...</p>
				{:else if connectionState === 'disconnected'}
					<p>📴 Check your internet connection</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.connection-status {
		position: relative;
		display: inline-block;
	}
	
	.status-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s ease;
		color: inherit;
	}
	
	.status-button:hover {
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}
	
	.status-button:focus {
		outline: 2px solid #3B82F6;
		outline-offset: 2px;
	}
	
	.latency {
		font-size: 0.8rem;
		color: #888;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
	}
	
	.details {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		min-width: 250px;
		background: rgba(0, 0, 0, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 1rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		z-index: 1000;
		animation: slideIn 0.2s ease-out;
	}
	
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.details h3 {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
		color: #fff;
		font-weight: 600;
	}
	
	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
		font-size: 0.85rem;
	}
	
	.detail-row .label {
		color: #888;
	}
	
	.detail-row .value {
		color: #fff;
		font-weight: 500;
	}
	
	.info {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.info p {
		margin: 0;
		font-size: 0.8rem;
		color: #888;
		line-height: 1.4;
	}
	
	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.details {
			right: auto;
			left: 0;
		}
	}
</style>