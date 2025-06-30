<script lang="ts">
  /**
   * Voice Message Recorder Component
   * Provides UI for recording voice messages with waveform visualization
   */
  
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { VoiceMessageHandler, type VoiceMessageResult, type VoiceMessageState } from '../lib/audio/voice-message-handler.js';
  import type { EncryptionInfo } from '../lib/types/messaging.js';
  
  // Props
  export let senderId: string;
  export let recipientIds: string[];
  export let conversationId: string;
  export let encryptionInfo: EncryptionInfo;
  export let maxDuration: number = 300; // 5 minutes
  export let autoSend: boolean = false;
  export let disabled: boolean = false;
  export let compact: boolean = false;
  
  // Component state
  let voiceHandler: VoiceMessageHandler;
  let state: VoiceMessageState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    currentVolume: 0,
    isProcessing: false
  };
  let permissionGranted: boolean = false;
  let waveformData: number[] = [];
  let currentWaveform: number[] = [];
  let error: string = '';
  
  // UI state
  let showWaveform: boolean = true;
  let recordButton: HTMLButtonElement;
  
  const dispatch = createEventDispatcher<{
    voicemessage: VoiceMessageResult;
    error: Error;
    permissiondenied: void;
  }>();
  
  onMount(async () => {
    if (!VoiceMessageHandler.isSupported()) {
      error = 'Voice recording is not supported in this browser';
      return;
    }
    
    try {
      voiceHandler = new VoiceMessageHandler({
        maxDuration,
        autoSendOnStop: autoSend,
        generateWaveform: true,
        waveformSamples: compact ? 50 : 100
      });
      
      setupEventListeners();
      
      // Request permissions
      permissionGranted = await voiceHandler.requestPermissions();
      if (!permissionGranted) {
        error = 'Microphone permission is required for voice messages';
        dispatch('permissiondenied');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize voice recorder';
      dispatch('error', err as Error);
    }
  });
  
  onDestroy(() => {
    if (voiceHandler) {
      voiceHandler.destroy();
    }
  });
  
  function setupEventListeners() {
    voiceHandler.addEventListener('voicerecordingstarted', () => {
      state = voiceHandler.getState();
      currentWaveform = [];
      error = '';
    });
    
    voiceHandler.addEventListener('voicerecordingpaused', () => {
      state = voiceHandler.getState();
    });
    
    voiceHandler.addEventListener('voicerecordingresumed', () => {
      state = voiceHandler.getState();
    });
    
    voiceHandler.addEventListener('voicerecordingcancelled', () => {
      state = voiceHandler.getState();
      currentWaveform = [];
      waveformData = [];
    });
    
    voiceHandler.addEventListener('volumechange', (event: Event) => {
      const { volume, duration } = (event as CustomEvent).detail;
      state = { ...state, currentVolume: volume, duration };
      
      // Update real-time waveform
      if (state.isRecording && !state.isPaused) {
        currentWaveform = [...currentWaveform, volume];
        if (currentWaveform.length > (compact ? 50 : 100)) {
          currentWaveform.shift(); // Keep fixed size
        }
      }
    });
    
    voiceHandler.addEventListener('voicemessagecreated', (event: Event) => {
      const result = (event as CustomEvent).detail as VoiceMessageResult;
      waveformData = result.waveform;
      state = voiceHandler.getState();
      dispatch('voicemessage', result);
    });
    
    voiceHandler.addEventListener('error', (event: Event) => {
      const err = (event as CustomEvent).detail;
      error = err.message || 'An error occurred';
      state = voiceHandler.getState();
      dispatch('error', err);
    });
  }
  
  async function toggleRecording() {
    if (!permissionGranted || disabled) return;
    
    try {
      if (state.isRecording) {
        if (state.isPaused) {
          await voiceHandler.resumeRecording();
        } else {
          await voiceHandler.stopRecording(senderId, recipientIds, conversationId, encryptionInfo);
        }
      } else {
        await voiceHandler.startRecording();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Recording failed';
      dispatch('error', err as Error);
    }
  }
  
  function pauseRecording() {
    if (!state.isRecording || state.isPaused) return;
    
    try {
      voiceHandler.pauseRecording();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Pause failed';
    }
  }
  
  function cancelRecording() {
    if (!state.isRecording) return;
    
    voiceHandler.cancelRecording();
    currentWaveform = [];
    waveformData = [];
  }
  
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function getVolumeLevel(volume: number): number {
    // Convert to percentage for visual feedback
    return Math.min(Math.max(volume * 100, 0), 100);
  }
  
  $: canRecord = permissionGranted && !disabled && !state.isProcessing;
  $: recordingProgress = maxDuration > 0 ? (state.duration / maxDuration) * 100 : 0;
  $: displayWaveform = state.isRecording ? currentWaveform : waveformData;
</script>

<!-- Recording Interface -->
<div class="voice-recorder" class:compact class:disabled>
  {#if error}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      <span>{error}</span>
    </div>
  {:else if !permissionGranted}
    <div class="permission-prompt">
      <span class="mic-icon">🎤</span>
      <span>Microphone access required</span>
    </div>
  {:else}
    <!-- Recording Controls -->
    <div class="recording-controls">
      <!-- Main Record Button -->
      <button
        bind:this={recordButton}
        class="record-button"
        class:recording={state.isRecording}
        class:paused={state.isPaused}
        class:processing={state.isProcessing}
        disabled={!canRecord}
        on:click={toggleRecording}
        aria-label={state.isRecording 
          ? (state.isPaused ? 'Resume recording' : 'Stop recording')
          : 'Start recording'
        }
      >
        {#if state.isProcessing}
          <div class="spinner"></div>
        {:else if state.isRecording}
          {#if state.isPaused}
            <span class="play-icon">▶️</span>
          {:else}
            <span class="stop-icon">⏹️</span>
          {/if}
        {:else}
          <span class="mic-icon">🎤</span>
        {/if}
      </button>
      
      <!-- Pause/Cancel buttons when recording -->
      {#if state.isRecording && !compact}
        <button
          class="control-button pause-button"
          class:active={state.isPaused}
          disabled={state.isProcessing}
          on:click={pauseRecording}
          aria-label={state.isPaused ? 'Recording paused' : 'Pause recording'}
        >
          {state.isPaused ? '⏸️' : '⏸️'}
        </button>
        
        <button
          class="control-button cancel-button"
          disabled={state.isProcessing}
          on:click={cancelRecording}
          aria-label="Cancel recording"
        >
          ❌
        </button>
      {/if}
    </div>
    
    <!-- Recording Status -->
    {#if state.isRecording || waveformData.length > 0}
      <div class="recording-status">
        <!-- Duration Display -->
        <div class="duration">
          <span class="time">{formatDuration(state.duration)}</span>
          {#if maxDuration > 0}
            <span class="max-time">/ {formatDuration(maxDuration)}</span>
          {/if}
        </div>
        
        <!-- Progress Bar -->
        {#if maxDuration > 0}
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              style="width: {recordingProgress}%"
            ></div>
          </div>
        {/if}
        
        <!-- Real-time Volume Indicator -->
        {#if state.isRecording && !state.isPaused}
          <div class="volume-indicator">
            <div 
              class="volume-level" 
              style="height: {getVolumeLevel(state.currentVolume)}%"
            ></div>
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- Waveform Visualization -->
    {#if showWaveform && displayWaveform.length > 0}
      <div class="waveform-container">
        <div class="waveform">
          {#each displayWaveform as amplitude, i}
            <div 
              class="waveform-bar"
              class:active={state.isRecording && !state.isPaused}
              style="height: {Math.max(amplitude * 100, 2)}%"
              style:animation-delay="{i * 20}ms"
            ></div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Recording State Indicator -->
    {#if state.isRecording}
      <div class="status-indicator" class:paused={state.isPaused}>
        <div class="pulse-dot"></div>
        <span class="status-text">
          {#if state.isPaused}
            Paused
          {:else if state.isProcessing}
            Processing...
          {:else}
            Recording...
          {/if}
        </span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .voice-recorder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--bg-primary, #ffffff);
    border-radius: 12px;
    border: 1px solid var(--border-light, #e5e7eb);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }
  
  .voice-recorder.compact {
    padding: 8px;
    gap: 8px;
  }
  
  .voice-recorder.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
  
  .error-message,
  .permission-prompt {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    background: var(--bg-error, #fef2f2);
    color: var(--text-error, #dc2626);
    border: 1px solid var(--border-error, #fecaca);
  }
  
  .permission-prompt {
    background: var(--bg-warning, #fffbeb);
    color: var(--text-warning, #d97706);
    border-color: var(--border-warning, #fed7aa);
  }
  
  .recording-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .record-button {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: none;
    background: var(--primary-500, #3b82f6);
    color: white;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    position: relative;
    overflow: hidden;
  }
  
  .record-button:hover:not(:disabled) {
    background: var(--primary-600, #2563eb);
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }
  
  .record-button:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  .record-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .record-button.recording {
    background: var(--danger-500, #ef4444);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    animation: pulse-red 2s infinite;
  }
  
  .record-button.paused {
    background: var(--warning-500, #f59e0b);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    animation: none;
  }
  
  .record-button.processing {
    background: var(--gray-500, #6b7280);
    animation: none;
  }
  
  .control-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--border-light, #e5e7eb);
    background: var(--bg-secondary, #f9fafb);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }
  
  .control-button:hover:not(:disabled) {
    background: var(--bg-tertiary, #f3f4f6);
    transform: scale(1.05);
  }
  
  .pause-button.active {
    background: var(--warning-100, #fef3c7);
    border-color: var(--warning-300, #fcd34d);
  }
  
  .cancel-button:hover:not(:disabled) {
    background: var(--danger-100, #fee2e2);
    border-color: var(--danger-300, #fca5a5);
  }
  
  .recording-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    max-width: 240px;
  }
  
  .duration {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono, 'Courier New', monospace);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #111827);
  }
  
  .max-time {
    color: var(--text-secondary, #6b7280);
    font-weight: 400;
  }
  
  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--bg-tertiary, #f3f4f6);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: var(--primary-500, #3b82f6);
    transition: width 0.1s ease;
    border-radius: 2px;
  }
  
  .volume-indicator {
    width: 20px;
    height: 40px;
    background: var(--bg-tertiary, #f3f4f6);
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }
  
  .volume-level {
    width: 100%;
    background: linear-gradient(to top, 
      var(--success-500, #10b981) 0%, 
      var(--warning-500, #f59e0b) 70%, 
      var(--danger-500, #ef4444) 100%);
    transition: height 0.1s ease;
    border-radius: 0 0 10px 10px;
    min-height: 2px;
  }
  
  .waveform-container {
    width: 100%;
    max-width: 300px;
    height: 60px;
    padding: 8px;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 8px;
    border: 1px solid var(--border-light, #e5e7eb);
  }
  
  .waveform {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    height: 100%;
    gap: 2px;
  }
  
  .waveform-bar {
    flex: 1;
    max-width: 4px;
    background: var(--primary-400, #60a5fa);
    border-radius: 2px;
    transition: height 0.1s ease;
    min-height: 2px;
  }
  
  .waveform-bar.active {
    background: var(--primary-500, #3b82f6);
    animation: waveform-pulse 0.5s ease-in-out infinite alternate;
  }
  
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
  }
  
  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--danger-500, #ef4444);
    animation: pulse-dot 1s infinite;
  }
  
  .status-indicator.paused .pulse-dot {
    background: var(--warning-500, #f59e0b);
    animation: none;
  }
  
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .compact .record-button {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
  
  .compact .waveform-container {
    height: 40px;
    max-width: 200px;
  }
  
  .compact .control-button {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  /* Animations */
  @keyframes pulse-red {
    0%, 100% { box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
    50% { box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6); }
  }
  
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  
  @keyframes waveform-pulse {
    0% { transform: scaleY(1); }
    100% { transform: scaleY(1.2); }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .voice-recorder {
      --bg-primary: #1f2937;
      --bg-secondary: #374151;
      --bg-tertiary: #4b5563;
      --text-primary: #f9fafb;
      --text-secondary: #d1d5db;
      --border-light: #4b5563;
    }
  }
  
  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .record-button,
    .control-button,
    .waveform-bar,
    .volume-level,
    .progress-fill {
      transition: none;
    }
    
    .pulse-red,
    .pulse-dot,
    .waveform-pulse,
    .spin {
      animation: none;
    }
  }
  
  /* Focus styles */
  .record-button:focus-visible,
  .control-button:focus-visible {
    outline: 2px solid var(--primary-500, #3b82f6);
    outline-offset: 2px;
  }
</style>