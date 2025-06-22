<script lang="ts">
  import { cn } from '../utils/cn';
  import Button from './Button.svelte';
  import { createEventDispatcher } from 'svelte';

  export let placeholder = 'Type a message...';
  export let maxLength = 5000;
  export let disabled = false;
  export let className = '';

  let message = '';
  let textareaElement;
  let isComposing = false;

  const dispatch = createEventDispatcher();

  $: remainingChars = maxLength - message.length;
  $: canSend = message.trim().length > 0 && !disabled;

  function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function sendMessage() {
    if (!canSend) return;

    dispatch('send', { message: message.trim() });
    message = '';
    adjustHeight();
  }

  function handleInput() {
    adjustHeight();
    
    if (!isComposing && message.length > 0) {
      isComposing = true;
      dispatch('typing', { isTyping: true });
    } else if (isComposing && message.length === 0) {
      isComposing = false;
      dispatch('typing', { isTyping: false });
    }
  }

  function adjustHeight() {
    if (!textareaElement) return;
    
    textareaElement.style.height = 'auto';
    textareaElement.style.height = `${Math.min(textareaElement.scrollHeight, 200)}px`;
  }

  function handlePaste(event) {
    // Handle file paste in the future
  }

  function attachFile() {
    // Implement file attachment
    console.log('File attachment not yet implemented');
  }
</script>

<div class={cn('volli-card p-3', className)}>
  <div class="flex flex-col gap-2">
    <div class="relative">
      <textarea
        bind:this={textareaElement}
        bind:value={message}
        {placeholder}
        {disabled}
        maxlength={maxLength}
        class={cn(
          'w-full resize-none rounded-md px-3 py-2 pr-10',
          'bg-volli-gray-50 dark:bg-volli-gray-900',
          'border border-volli-gray-200 dark:border-volli-gray-700',
          'text-volli-gray-900 dark:text-volli-gray-100',
          'placeholder:text-volli-gray-400 dark:placeholder:text-volli-gray-500',
          'volli-transition volli-focus volli-scrollbar',
          'min-h-[44px] max-h-[200px]'
        )}
        rows={1}
        on:keydown={handleKeydown}
        on:input={handleInput}
        on:paste={handlePaste}
      />
      
      <button
        type="button"
        class={cn(
          'absolute right-2 top-2 p-1.5 rounded-md',
          'text-volli-gray-400 hover:text-volli-gray-600',
          'dark:text-volli-gray-500 dark:hover:text-volli-gray-300',
          'volli-transition volli-focus'
        )}
        on:click={attachFile}
        {disabled}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>
    </div>

    <div class="flex items-center justify-between">
      <span class={cn(
        'text-xs',
        remainingChars < 100 ? 'text-red-500' : 'text-volli-gray-500 dark:text-volli-gray-400'
      )}>
        {remainingChars} characters remaining
      </span>

      <Button
        size="sm"
        variant="primary"
        disabled={!canSend}
        on:click={sendMessage}
      >
        Send
      </Button>
    </div>
  </div>
</div>