<script lang="ts">
  import { cn } from '../utils/cn';

  export let content;
  export let sender;
  export let timestamp;
  export let isOwn = false;
  export let status = 'sent';
  export let className = '';

  $: formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(timestamp);

  $: statusIcon = {
    sending: '⏳',
    sent: '✓',
    delivered: '✓✓',
    read: '✓✓',
    failed: '⚠️'
  }[status] || '✓';
</script>

<div
  class={cn(
    'flex w-full',
    isOwn ? 'justify-end' : 'justify-start',
    className
  )}
>
  <div
    class={cn(
      'max-w-[70%] rounded-2xl px-4 py-2 shadow-sm',
      isOwn
        ? 'bg-volli-primary-600 text-white dark:bg-volli-primary-500'
        : 'bg-volli-gray-100 text-volli-gray-900 dark:bg-volli-gray-800 dark:text-volli-gray-100'
    )}
  >
    {#if !isOwn}
      <p class="text-xs font-medium mb-1 opacity-80">{sender}</p>
    {/if}
    
    <p class="text-sm whitespace-pre-wrap break-words">{content}</p>
    
    <div class={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
      <span class="text-xs opacity-70">{formattedTime}</span>
      {#if isOwn}
        <span 
          class={cn(
            'text-xs',
            status === 'read' ? 'text-volli-primary-200' : 'opacity-70',
            status === 'failed' ? 'text-red-300' : ''
          )}
        >
          {statusIcon}
        </span>
      {/if}
    </div>
  </div>
</div>