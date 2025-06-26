<script lang="ts">
  import { cn } from '../utils/cn';
  import Button from './Button.svelte';
  import { createEventDispatcher } from 'svelte';

  export let contact;
  export let showActions = true;
  export let className = '';

  const dispatch = createEventDispatcher();

  $: trustColor = contact?.trustLevel ? {
    verified: 'text-volli-success-600 dark:text-volli-success-400',
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

<div class={cn('volli-card-interactive p-volli-lg', className)}>
  <div class="flex items-start space-volli-lg">
    <div class="relative flex-shrink-0">
      {#if contact.avatar}
        <img
          src={contact.avatar}
          alt={contact.name}
          class="w-16 h-16 rounded-full object-cover"
        />
      {:else}
        <div class="w-16 h-16 rounded-volli-full bg-volli-primary-100 dark:bg-volli-primary-900 flex items-center justify-center">
          <span class="text-volli-xl font-volli-medium text-volli-primary-600 dark:text-volli-primary-400">
            {contact.name.charAt(0).toUpperCase()}
          </span>
        </div>
      {/if}
      {#if contact.isOnline}
        <span class="absolute bottom-0 right-0 w-4 h-4 bg-volli-success-500 border-2 border-white dark:border-volli-gray-800 rounded-volli-full" aria-label="Online"></span>
      {/if}
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center space-volli-sm mb-volli-sm">
        <h3 class="text-volli-lg font-volli-medium text-volli-gray-900 dark:text-volli-gray-100">
          {contact.name}
        </h3>
        {#if contact.trustLevel}
          <span class={cn('text-volli-sm font-volli-medium', trustColor)}>
            <span aria-hidden="true">{trustIcon}</span>
            <span class="ml-volli-xs">{contact.trustLevel}</span>
          </span>
        {/if}
      </div>

      <p class="text-volli-sm text-volli-gray-600 dark:text-volli-gray-400 font-mono mb-volli-sm">
        {truncateKey(contact.publicKey)}
      </p>

      <p class="text-volli-xs text-volli-gray-500 dark:text-volli-gray-500">
        {contact.isOnline ? 'Online' : `Last seen ${formatLastSeen(contact.lastSeen)}`}
      </p>

      {#if showActions}
        <div class="flex space-volli-sm mt-volli-md">
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