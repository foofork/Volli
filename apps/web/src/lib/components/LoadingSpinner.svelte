<script lang="ts">
	export let size: 'small' | 'medium' | 'large' = 'medium';
	export let color: string = '#3B82F6';
	export let text: string = '';
	export let inline: boolean = false;
</script>

<div class="spinner-container" class:inline>
	<div class="spinner {size}" style="border-top-color: {color}"></div>
	{#if text}
		<p class="spinner-text">{text}</p>
	{/if}
</div>

<style>
	.spinner-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}
	
	.spinner-container.inline {
		flex-direction: row;
		gap: 0.75rem;
	}
	
	.spinner {
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		border-top-color: #3B82F6;
	}
	
	.spinner.small {
		width: 16px;
		height: 16px;
		border-width: 2px;
	}
	
	.spinner.medium {
		width: 32px;
		height: 32px;
		border-width: 3px;
	}
	
	.spinner.large {
		width: 48px;
		height: 48px;
		border-width: 4px;
	}
	
	.spinner-text {
		color: #888;
		font-size: 0.9rem;
		margin: 0;
		text-align: center;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>