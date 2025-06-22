<script lang="ts">
  import { cn } from '../utils/cn';
  import Button from './Button.svelte';
  import { createEventDispatcher } from 'svelte';

  export let contact;
  export let showActions = true;
  export let className = '';

  const dispatch = createEventDispatcher();

  $: trustColor = contact?.trustLevel ? {
    verified: 'text-green-600 dark:text-green-400',
    trusted: 'text-volli-primary-600 dark:text-volli-primary-400',
    untrusted: 'text-volli-gray-500 dark:text-volli-gray-400'
  }[contact.trustLevel] || '' : '';

  $: trustIcon = contact?.trustLevel ? {
    verified: '✓',
    trusted: '●',
    untrusted: '○'
  }[contact.trustLevel] || '○' : '○';

  function formatLastSeen(date) {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function truncateKey(key) {
    return `${key.slice(0, 6)}...${key.slice(-6)}`;
  }
</script>

<div class={cn('volli-card p-4', className)}>
  <div class="flex items-start gap-4">
    <div class="relative flex-shrink-0">
      {#if contact.avatar}
        <img
          src={contact.avatar}
          alt={contact.name}
          class="w-16 h-16 rounded-full object-cover"
        />
      {:else}
        <div class="w-16 h-16 rounded-full bg-volli-primary-100 dark:bg-volli-primary-900 flex items-center justify-center">
          <span class="text-xl font-medium text-volli-primary-600 dark:text-volli-primary-400">
            {contact.name.charAt(0).toUpperCase()}
          </span>
        </div>
      {/if}
      {#if contact.isOnline}
        <span class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-volli-gray-800 rounded-full"></span>
      {/if}
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <h3 class="text-lg font-medium text-volli-gray-900 dark:text-volli-gray-100">
          {contact.name}
        </h3>
        {#if contact.trustLevel}
          <span class={cn('text-sm font-medium', trustColor)}>
            {trustIcon} {contact.trustLevel}
          </span>
        {/if}
      </div>

      <p class="text-sm text-volli-gray-600 dark:text-volli-gray-400 font-mono mb-2">
        {truncateKey(contact.publicKey)}
      </p>

      <p class="text-xs text-volli-gray-500 dark:text-volli-gray-500">
        {contact.isOnline ? 'Online' : `Last seen ${formatLastSeen(contact.lastSeen)}`}
      </p>

      {#if showActions}
        <div class="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="primary"
            on:click={() => dispatch('message', { contactId: contact.id })}
          >
            Message
          </Button>
          {#if contact.trustLevel !== 'verified'}
            <Button
              size="sm"
              variant="secondary"
              on:click={() => dispatch('verify', { contactId: contact.id })}
            >
              Verify
            </Button>
          {/if}
          <Button
            size="sm"
            variant="ghost"
            on:click={() => dispatch('remove', { contactId: contact.id })}
          >
            Remove
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>