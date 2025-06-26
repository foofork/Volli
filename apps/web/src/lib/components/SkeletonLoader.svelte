<script lang="ts">
	export let variant: 'text' | 'rectangle' | 'circle' | 'card' | 'list-item' = 'text';
	export let width: string = '100%';
	export let height: string = '1rem';
	export let count: number = 1;
	export let animate: boolean = true;
</script>

{#if variant === 'card'}
	<div class="skeleton-card" class:animate>
		<div class="skeleton-image"></div>
		<div class="skeleton-content">
			<div class="skeleton skeleton-title"></div>
			<div class="skeleton skeleton-text"></div>
			<div class="skeleton skeleton-text short"></div>
		</div>
	</div>
{:else if variant === 'list-item'}
	{#each Array(count) as _}
		<div class="skeleton-list-item" class:animate>
			<div class="skeleton-avatar"></div>
			<div class="skeleton-list-content">
				<div class="skeleton skeleton-name"></div>
				<div class="skeleton skeleton-description"></div>
			</div>
			<div class="skeleton skeleton-action"></div>
		</div>
	{/each}
{:else}
	{#each Array(count) as _}
		<div 
			class="skeleton {variant}" 
			class:animate
			style="width: {width}; height: {height};"
		></div>
	{/each}
{/if}

<style>
	.skeleton {
		background: linear-gradient(90deg, 
			rgba(255, 255, 255, 0.05) 25%, 
			rgba(255, 255, 255, 0.1) 50%, 
			rgba(255, 255, 255, 0.05) 75%
		);
		background-size: 200% 100%;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}
	
	.skeleton.animate {
		animation: loading 1.5s infinite;
	}
	
	.skeleton.text {
		height: 1rem;
		border-radius: 2px;
	}
	
	.skeleton.rectangle {
		border-radius: 8px;
	}
	
	.skeleton.circle {
		border-radius: 50%;
	}
	
	/* Card skeleton */
	.skeleton-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
	}
	
	.skeleton-image {
		width: 100%;
		height: 120px;
		background: linear-gradient(90deg, 
			rgba(255, 255, 255, 0.05) 25%, 
			rgba(255, 255, 255, 0.1) 50%, 
			rgba(255, 255, 255, 0.05) 75%
		);
		background-size: 200% 100%;
		border-radius: 8px;
		margin-bottom: 1rem;
	}
	
	.skeleton-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.skeleton-title {
		height: 1.25rem;
		width: 80%;
	}
	
	.skeleton-text {
		height: 1rem;
		width: 100%;
	}
	
	.skeleton-text.short {
		width: 60%;
	}
	
	/* List item skeleton */
	.skeleton-list-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		margin-bottom: 0.5rem;
	}
	
	.skeleton-avatar {
		width: 48px;
		height: 48px;
		background: linear-gradient(90deg, 
			rgba(255, 255, 255, 0.05) 25%, 
			rgba(255, 255, 255, 0.1) 50%, 
			rgba(255, 255, 255, 0.05) 75%
		);
		background-size: 200% 100%;
		border-radius: 50%;
		flex-shrink: 0;
	}
	
	.skeleton-list-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.skeleton-name {
		height: 1.1rem;
		width: 70%;
	}
	
	.skeleton-description {
		height: 0.9rem;
		width: 90%;
	}
	
	.skeleton-action {
		width: 80px;
		height: 32px;
		border-radius: 6px;
	}
	
	@keyframes loading {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>