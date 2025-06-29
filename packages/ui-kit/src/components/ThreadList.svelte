<script lang="ts">
  import { cn } from '../utils/cn';
  import { createEventDispatcher } from 'svelte';

  interface Thread {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount?: number;
  }

  export let threads: Thread[] = [];
  export let selectedThreadId: string | null = null;
  export let className = '';

  const dispatch = createEventDispatcher();

  function formatTime(date: Date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short'
      }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
  }

  function selectThread(threadId: string) {
    dispatch('select', { threadId });
  }
</script>

<div class={cn('flex flex-col divide-y divide-volli-gray-200 dark:divide-volli-gray-700', className)}>
  {#each threads as thread (thread.id)}
    <button
      class={cn(
        'flex items-center gap-3 p-4 text-left hover:bg-volli-gray-50 dark:hover:bg-volli-gray-800',
        'volli-transition focus:outline-none focus:bg-volli-gray-50 dark:focus:bg-volli-gray-800',
        selectedThreadId === thread.id ? 'bg-volli-gray-50 dark:bg-volli-gray-800' : ''
      )}
      on:click={() => selectThread(thread.id)}
    >
      <div class="relative flex-shrink-0">
        {#if thread.avatar}
          <img
            src={thread.avatar}
            alt={thread.name}
            class="w-12 h-12 rounded-full object-cover"
          />
        {:else}
          <div class="w-12 h-12 rounded-full bg-volli-primary-100 dark:bg-volli-primary-900 flex items-center justify-center">
            <span class="text-lg font-medium text-volli-primary-600 dark:text-volli-primary-400">
              {thread.name.charAt(0).toUpperCase()}
            </span>
          </div>
        {/if}
        {#if thread.isOnline}
          <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-volli-gray-900 rounded-full"></span>
        {/if}
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between mb-1">
          <h3 class="text-sm font-medium text-volli-gray-900 dark:text-volli-gray-100 truncate">
            {thread.name}
          </h3>
          <span class="text-xs text-volli-gray-500 dark:text-volli-gray-400 flex-shrink-0 ml-2">
            {formatTime(thread.lastMessageTime)}
          </span>
        </div>
        <p class="text-sm text-volli-gray-600 dark:text-volli-gray-400 truncate">
          {thread.lastMessage}
        </p>
      </div>

      {#if thread.unreadCount && thread.unreadCount > 0}
        <div class="flex-shrink-0">
          <span class="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-volli-primary-600 dark:bg-volli-primary-500 text-white">
            {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
          </span>
        </div>
      {/if}
    </button>
  {/each}

  {#if threads.length === 0}
    <div class="p-8 text-center text-volli-gray-500 dark:text-volli-gray-400">
      <p class="text-sm">No conversations yet</p>
    </div>
  {/if}
</div>