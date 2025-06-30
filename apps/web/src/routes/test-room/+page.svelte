<script lang="ts">
  import { onDestroy } from 'svelte';
  import { generateTestToken } from '$lib/utils/test-token';
  import {
    connectToRoom,
    disconnectFromRoom,
    sendEncryptedMessage,
    sendPublicMessage,
    toggleAudio,
    toggleVideo,
    connected,
    connecting,
    connectionError,
    identity,
    roomName,
    participantList,
    messages,
    localAudioEnabled,
    localVideoEnabled
  } from '$lib/volly/stores';

  // Test configuration
  const SERVER_URL = 'ws://localhost:7880';
  const API_KEY = 'devkey';
  const API_SECRET = 'secret';

  // Form state
  let userName = '';
  let selectedRoom = 'test-room';
  let messageText = '';
  let selectedRecipient = '';

  async function handleConnect() {
    if (!userName) return;

    try {
      const token = generateTestToken(API_KEY, API_SECRET, userName, selectedRoom);
      await connectToRoom(SERVER_URL, token, userName, selectedRoom, {
        enableAudio: true,
        enableVideo: false
      });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }

  async function handleDisconnect() {
    await disconnectFromRoom();
  }

  async function handleSendMessage(encrypted: boolean) {
    if (!messageText.trim()) return;

    try {
      if (encrypted && selectedRecipient) {
        await sendEncryptedMessage(messageText, selectedRecipient);
      } else {
        await sendPublicMessage(messageText);
      }
      messageText = '';
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  // Auto-scroll messages
  let messagesContainer: HTMLDivElement;
  $: if (messagesContainer && $messages.length > 0) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  onDestroy(() => {
    disconnectFromRoom();
  });
</script>

<div class="container mx-auto p-4 max-w-6xl">
  <h1 class="text-3xl font-bold mb-6">Volly Test Room - Post-Quantum WebRTC</h1>

  {#if !$connected}
    <!-- Connection Form -->
    <div class="card bg-base-200 shadow-xl p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Connect to Room</h2>
      
      <div class="form-control w-full max-w-xs mb-4">
        <label class="label">
          <span class="label-text">Your Name</span>
        </label>
        <input
          type="text"
          placeholder="Enter your name"
          class="input input-bordered"
          bind:value={userName}
          disabled={$connecting}
        />
      </div>

      <div class="form-control w-full max-w-xs mb-4">
        <label class="label">
          <span class="label-text">Room</span>
        </label>
        <select class="select select-bordered" bind:value={selectedRoom} disabled={$connecting}>
          <option value="test-room">Test Room</option>
          <option value="room-1">Room 1</option>
          <option value="room-2">Room 2</option>
        </select>
      </div>

      {#if $connectionError}
        <div class="alert alert-error mb-4">
          <span>{$connectionError}</span>
        </div>
      {/if}

      <button
        class="btn btn-primary"
        on:click={handleConnect}
        disabled={!userName || $connecting}
      >
        {#if $connecting}
          <span class="loading loading-spinner"></span>
          Connecting...
        {:else}
          Connect with ML-KEM-768
        {/if}
      </button>
    </div>
  {:else}
    <!-- Connected View -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Participants Panel -->
      <div class="card bg-base-200 shadow-xl p-4">
        <h2 class="text-lg font-semibold mb-4">
          Participants ({$participantList.length})
        </h2>
        
        <div class="space-y-2">
          {#each $participantList as participant}
            <div class="flex items-center justify-between p-2 rounded bg-base-300">
              <div class="flex items-center gap-2">
                <div class="avatar placeholder">
                  <div class="bg-primary text-primary-content rounded-full w-8">
                    <span class="text-xs">{participant.identity.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <span class="font-medium">{participant.identity}</span>
                {#if participant.isSpeaking}
                  <span class="badge badge-success badge-xs">Speaking</span>
                {/if}
              </div>
              {#if participant.publicKey}
                <div class="tooltip" data-tip="ML-KEM-768 Key Available">
                  <svg class="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm0 2a2.5 2.5 0 012.5 2.5V9h-5V5.5A2.5 2.5 0 0110 3z"/>
                  </svg>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="divider"></div>

        <div class="space-y-2">
          <button
            class="btn btn-sm btn-ghost w-full justify-start"
            class:btn-active={$localAudioEnabled}
            on:click={toggleAudio}
          >
            {#if $localAudioEnabled}
              🎤 Mute Audio
            {:else}
              🔇 Unmute Audio
            {/if}
          </button>
          
          <button
            class="btn btn-sm btn-ghost w-full justify-start"
            class:btn-active={$localVideoEnabled}
            on:click={toggleVideo}
          >
            {#if $localVideoEnabled}
              📹 Stop Video
            {:else}
              📷 Start Video
            {/if}
          </button>

          <button
            class="btn btn-sm btn-error w-full"
            on:click={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
      </div>

      <!-- Chat Panel -->
      <div class="card bg-base-200 shadow-xl p-4 col-span-2">
        <h2 class="text-lg font-semibold mb-4">
          Messages - Room: {$roomName}
        </h2>

        <!-- Messages -->
        <div
          bind:this={messagesContainer}
          class="flex-1 overflow-y-auto mb-4 p-4 bg-base-300 rounded-lg h-96"
        >
          {#if $messages.length === 0}
            <p class="text-center text-base-content/50">No messages yet...</p>
          {:else}
            {#each $messages as message}
              <div class="chat" class:chat-start={message.from !== $identity} class:chat-end={message.from === $identity}>
                <div class="chat-header">
                  {message.from}
                  {#if message.encrypted}
                    <span class="badge badge-success badge-xs ml-1">🔐 E2E</span>
                  {/if}
                  <time class="text-xs opacity-50 ml-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </time>
                </div>
                <div class="chat-bubble" class:chat-bubble-primary={message.from === $identity}>
                  {message.content}
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Message Input -->
        <div class="space-y-2">
          <div class="flex gap-2">
            <select
              class="select select-bordered select-sm"
              bind:value={selectedRecipient}
            >
              <option value="">Public Message</option>
              {#each $participantList as participant}
                {#if participant.identity !== $identity && participant.publicKey}
                  <option value={participant.identity}>
                    🔐 {participant.identity}
                  </option>
                {/if}
              {/each}
            </select>
          </div>

          <div class="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              class="input input-bordered flex-1"
              bind:value={messageText}
              on:keydown={(e) => e.key === 'Enter' && handleSendMessage(!!selectedRecipient)}
            />
            <button
              class="btn btn-primary"
              on:click={() => handleSendMessage(!!selectedRecipient)}
              disabled={!messageText.trim()}
            >
              {#if selectedRecipient}
                Send Encrypted
              {:else}
                Send Public
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="mt-6 p-4 bg-base-300 rounded-lg">
      <div class="flex items-center justify-between text-sm">
        <span>
          Connected as: <strong>{$identity}</strong>
        </span>
        <span>
          Encryption: <strong class="text-success">ML-KEM-768 + XChaCha20-Poly1305</strong>
        </span>
        <span>
          Server: <strong>{SERVER_URL}</strong>
        </span>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    min-height: 100vh;
  }
</style>