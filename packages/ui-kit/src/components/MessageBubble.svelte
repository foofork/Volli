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
      'max-w-[70%] rounded-volli-lg px-volli-lg py-volli-md shadow-volli-sm',
      'volli-transition-colors',
      isOwn
        ? 'bg-volli-primary-600 text-white dark:bg-volli-primary-500'
        : 'bg-volli-gray-100 text-volli-gray-900 dark:bg-volli-gray-800 dark:text-volli-gray-100'
    )}
  >
    {#if !isOwn}
      <p class="text-volli-xs font-volli-medium mb-volli-xs opacity-80">{sender}</p>
    {/if}
    
    <p class="text-volli-sm whitespace-pre-wrap break-words leading-volli-normal">{content}</p>
    
    <div class={cn('flex items-center space-volli-xs mt-volli-xs', isOwn ? 'justify-end' : 'justify-start')}>
      <span class="text-volli-xs opacity-70">{formattedTime}</span>
      {#if isOwn}
        <span 
          class={cn(
            'text-volli-xs',
            status === 'read' ? 'text-volli-primary-200' : 'opacity-70',
            status === 'failed' ? 'text-volli-error-300' : ''
          )}
        >
          {statusIcon}
        </span>
      {/if}
    </div>
  </div>
</div>