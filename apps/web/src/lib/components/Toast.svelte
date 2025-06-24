<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { toasts } from '$lib/stores/toasts';
  
  function getIcon(type: string) {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }
  
  function getClass(type: string) {
    switch (type) {
      case 'success': return 'toast-success';
      case 'error': return 'toast-error';
      case 'warning': return 'toast-warning';
      case 'info': return 'toast-info';
      default: return '';
    }
  }
</script>

{#if $toasts.length > 0}
  <div class="toast-container">
    {#each $toasts as toast (toast.id)}
      <div
        class="toast {getClass(toast.type)}"
        in:fly={{ y: 20, duration: 300 }}
        out:fade={{ duration: 200 }}
      >
        <span class="toast-icon">{getIcon(toast.type)}</span>
        <span class="toast-message">{toast.message}</span>
        <button 
          class="toast-close"
          on:click={() => toasts.remove(toast.id)}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 400px;
  }
  
  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    color: #fff;
    font-size: 0.95rem;
    min-width: 250px;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .toast-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }
  
  .toast-message {
    flex: 1;
    word-wrap: break-word;
  }
  
  .toast-close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }
  
  .toast-close:hover {
    color: rgba(255, 255, 255, 0.8);
  }
  
  .toast-success {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.4);
  }
  
  .toast-error {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }
  
  .toast-warning {
    background: rgba(245, 158, 11, 0.2);
    border-color: rgba(245, 158, 11, 0.4);
  }
  
  .toast-info {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.4);
  }
  
  @media (max-width: 640px) {
    .toast-container {
      left: 1rem;
      right: 1rem;
      max-width: none;
    }
  }
</style>