<script lang="ts">
  import { cn } from '../utils/cn';
  import MessageBubble from './MessageBubble.svelte';
  import MessageComposer from './MessageComposer.svelte';
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import type { Message } from '../types';

  export let thread = null;
  export let messages = [];
  export let currentUserId;
  export let isTyping = false;
  export let typingUser = '';
  export let className = '';

  let messagesContainer;
  let autoScroll = true;

  const dispatch = createEventDispatcher();

  onMount(() => {
    scrollToBottom();
  });

  afterUpdate(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  });

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function handleScroll() {
    if (!messagesContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    autoScroll = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;

    // Load more messages when scrolled to top
    if (scrollTop < 100 && thread) {
      dispatch('loadMore', { threadId: thread.id });
    }
  }

  function handleSendMessage(event) {
    if (thread) {
      dispatch('sendMessage', { threadId: thread.id, message: event.detail.message });
    }
  }

  function groupMessagesByDate(messages) {
    const groups = new Map<string, Message[]>();
    
    messages.forEach(message => {
      const dateKey = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(message.timestamp);
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(message);
    });

    return groups;
  }

  $: messageGroups = groupMessagesByDate(messages);
</script>

<div class={cn('flex flex-col h-full', className)}>
  {#if thread}
    <!-- Thread Header -->
    <div class="volli-card rounded-b-none border-b-0 px-4 py-3 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-medium text-volli-gray-900 dark:text-volli-gray-100">
          {thread.name}
        </h2>
        <p class="text-sm text-volli-gray-500 dark:text-volli-gray-400">
          {thread.participants} participant{thread.participants > 1 ? 's' : ''}
          {#if thread.isOnline}
            <span class="ml-2">● Online</span>
          {/if}
        </p>
      </div>
    </div>

    <!-- Messages Area -->
    <div
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto volli-scrollbar p-4 space-y-4 bg-volli-gray-50 dark:bg-volli-gray-900"
      on:scroll={handleScroll}
    >
      {#each [...messageGroups] as [date, dayMessages]}
        <div class="flex items-center gap-3 my-6">
          <div class="flex-1 h-px bg-volli-gray-300 dark:bg-volli-gray-700"></div>
          <span class="text-xs text-volli-gray-500 dark:text-volli-gray-400 px-3">
            {date}
          </span>
          <div class="flex-1 h-px bg-volli-gray-300 dark:bg-volli-gray-700"></div>
        </div>

        {#each dayMessages as message (message.id)}
          <div class="animate-fade-in">
            <MessageBubble
              content={message.text}
              sender={message.senderId}
              timestamp={message.timestamp}
              isOwn={message.senderId === currentUserId}
              status={message.status}
            />
          </div>
        {/each}
      {/each}

      {#if isTyping}
        <div class="flex items-center gap-2 text-sm text-volli-gray-500 dark:text-volli-gray-400 animate-pulse-subtle">
          <span>{typingUser} is typing</span>
          <span class="flex gap-1">
            <span class="w-2 h-2 bg-current rounded-full animate-bounce" style:animation-delay="0ms"></span>
            <span class="w-2 h-2 bg-current rounded-full animate-bounce" style:animation-delay="150ms"></span>
            <span class="w-2 h-2 bg-current rounded-full animate-bounce" style:animation-delay="300ms"></span>
          </span>
        </div>
      {/if}

      {#if messages.length === 0}
        <div class="flex items-center justify-center h-full text-volli-gray-500 dark:text-volli-gray-400">
          <p class="text-center">
            No messages yet.<br />
            Start the conversation!
          </p>
        </div>
      {/if}
    </div>

    <!-- Message Composer -->
    <div class="border-t border-volli-gray-200 dark:border-volli-gray-700">
      <MessageComposer
        on:send={handleSendMessage}
        className="rounded-t-none border-0"
      />
    </div>
  {:else}
    <div class="flex items-center justify-center h-full text-volli-gray-500 dark:text-volli-gray-400">
      <p class="text-center">
        Select a conversation to start messaging
      </p>
    </div>
  {/if}
</div>