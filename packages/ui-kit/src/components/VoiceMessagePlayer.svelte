<script lang="ts">
  /**
   * Voice Message Player Component
   * Displays and plays voice messages with waveform visualization
   */
  
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { Message } from '../lib/types/messaging.js';
  
  // Props
  export let message: Message;
  export let compact: boolean = false;
  export let autoplay: boolean = false;
  export let showWaveform: boolean = true;
  export let showDuration: boolean = true;
  export let showDownload: boolean = false;
  export let playbackRate: number = 1.0; // 0.5x to 2.0x speed
  
  // Component state
  let audio: HTMLAudioElement;
  let isPlaying: boolean = false;
  let isLoading: boolean = false;
  let currentTime: number = 0;
  let duration: number = 0;
  let progress: number = 0;
  let volume: number = 1.0;
  let isMuted: boolean = false;
  let error: string = '';
  let audioUrl: string = '';
  
  // Waveform data
  let waveform: number[] = [];
  let waveformBars: HTMLElement[] = [];
  
  const dispatch = createEventDispatcher<{
    play: void;
    pause: void;
    ended: void;
    error: Error;
    timeupdate: { currentTime: number; duration: number; progress: number };
  }>();
  
  onMount(async () => {
    if (message.type !== 'voice') {
      error = 'Invalid message type';
      return;
    }
    
    try {
      await initializeAudio();
      if (autoplay) {
        await togglePlayback();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize audio';
      dispatch('error', err as Error);
    }
  });
  
  onDestroy(() => {
    cleanup();
  });
  
  async function initializeAudio() {
    isLoading = true;
    
    try {
      // Convert base64 audio data to blob URL
      const audioData = message.content.data as string;
      const mimeType = message.content.mimeType || 'audio/ogg';
      const audioBlob = base64ToBlob(audioData, mimeType);
      audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element
      audio = new Audio(audioUrl);
      audio.preload = 'metadata';
      audio.playbackRate = playbackRate;
      audio.volume = volume;
      
      // Set up event listeners
      setupAudioListeners();
      
      // Get waveform data from message or generate fallback
      waveform = message.content.waveform || generateFallbackWaveform();
      
      // Get duration from message or wait for metadata
      duration = message.content.duration || 0;
      if (duration === 0) {
        await new Promise((resolve, reject) => {
          const handleLoad = () => {
            duration = audio.duration || 0;
            resolve(void 0);
          };
          const handleError = () => reject(new Error('Failed to load audio metadata'));
          
          audio.addEventListener('loadedmetadata', handleLoad, { once: true });
          audio.addEventListener('error', handleError, { once: true });
          
          // Timeout after 5 seconds
          setTimeout(() => {
            audio.removeEventListener('loadedmetadata', handleLoad);
            audio.removeEventListener('error', handleError);
            reject(new Error('Audio load timeout'));
          }, 5000);
        });
      }
      
    } finally {
      isLoading = false;
    }
  }
  
  function setupAudioListeners() {
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', () => isLoading = true);
    audio.addEventListener('canplay', () => isLoading = false);
  }
  
  function handleTimeUpdate() {
    currentTime = audio.currentTime;
    progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    dispatch('timeupdate', { currentTime, duration, progress });
  }
  
  function handleEnded() {
    isPlaying = false;
    currentTime = 0;
    progress = 0;
    dispatch('ended');
  }
  
  function handlePlay() {
    isPlaying = true;
    dispatch('play');
  }
  
  function handlePause() {
    isPlaying = false;
    dispatch('pause');
  }
  
  function handleError() {
    const audioError = new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`);
    error = audioError.message;
    isPlaying = false;
    dispatch('error', audioError);
  }
  
  async function togglePlayback() {
    if (!audio || isLoading) return;
    
    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Playback failed';
      dispatch('error', err as Error);
    }
  }
  
  function seek(event: MouseEvent) {
    if (!audio || duration === 0) return;
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const seekPercent = clickX / rect.width;
    const seekTime = seekPercent * duration;
    
    audio.currentTime = Math.max(0, Math.min(seekTime, duration));
  }
  
  function changeSpeed(newRate: number) {
    playbackRate = Math.max(0.5, Math.min(2.0, newRate));
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }
  
  function handleSpeedChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    changeSpeed(Number(target.value));
  }
  
  function handleVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    changeVolume(Number(target.value));
  }
  
  function toggleMute() {
    isMuted = !isMuted;
    if (audio) {
      audio.muted = isMuted;
    }
  }
  
  function changeVolume(newVolume: number) {
    volume = Math.max(0, Math.min(1, newVolume));
    if (audio) {
      audio.volume = volume;
    }
  }
  
  async function downloadAudio() {
    if (!audioUrl) return;
    
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `voice-message-${message.id}.${getFileExtension(message.content.mimeType)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      error = 'Download failed';
    }
  }
  
  function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
  
  function getFileExtension(mimeType?: string): string {
    const extensions: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'audio/mpeg': 'mp3'
    };
    return extensions[mimeType || ''] || 'audio';
  }
  
  function generateFallbackWaveform(): number[] {
    // Generate a simple waveform pattern if none provided
    const samples = compact ? 50 : 100;
    const waveform: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      // Create a somewhat realistic waveform pattern
      const t = i / samples;
      const amplitude = Math.sin(t * Math.PI * 4) * Math.exp(-t * 2) * 0.5 + 0.1;
      waveform.push(Math.max(0.05, amplitude));
    }
    
    return waveform;
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function cleanup() {
    if (audio) {
      audio.pause();
      audio = null as any;
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrl = '';
    }
  }
  
  function getWaveformProgress(): number {
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  }
  
  // Reactive statements
  $: if (audio && audio.playbackRate !== playbackRate) {
    audio.playbackRate = playbackRate;
  }
  
  $: if (audio && audio.volume !== volume) {
    audio.volume = volume;
  }
  
  $: waveformProgress = getWaveformProgress();
</script>

<!-- Voice Message Player -->
<div class="voice-player" class:compact class:playing={isPlaying} class:loading={isLoading}>
  {#if error}
    <div class="error-state">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{error}</span>
    </div>
  {:else}
    <!-- Main Player Controls -->
    <div class="player-controls">
      <!-- Play/Pause Button -->
      <button
        class="play-button"
        class:playing={isPlaying}
        class:loading={isLoading}
        disabled={isLoading || !audio}
        on:click={togglePlayback}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {#if isLoading}
          <div class="spinner"></div>
        {:else if isPlaying}
          <span class="pause-icon">⏸️</span>
        {:else}
          <span class="play-icon">▶️</span>
        {/if}
      </button>
      
      <!-- Waveform or Progress Bar -->
      <div class="audio-visualization" on:click={seek} role="button" tabindex="0">
        {#if showWaveform && waveform.length > 0}
          <div class="waveform">
            <div class="waveform-progress" style="width: {waveformProgress}%"></div>
            {#each waveform as amplitude, i}
              <div 
                class="waveform-bar"
                class:active={waveformProgress > (i / waveform.length) * 100}
                style="height: {Math.max(amplitude * 100, 3)}%"
              ></div>
            {/each}
          </div>
        {:else}
          <div class="progress-bar">
            <div class="progress-track"></div>
            <div class="progress-fill" style="width: {progress}%"></div>
            <div class="progress-thumb" style="left: {progress}%"></div>
          </div>
        {/if}
      </div>
      
      <!-- Duration Display -->
      {#if showDuration}
        <div class="duration-display">
          <span class="current-time">{formatTime(currentTime)}</span>
          {#if !compact}
            <span class="separator">/</span>
            <span class="total-time">{formatTime(duration)}</span>
          {/if}
        </div>
      {/if}
    </div>
    
    <!-- Extended Controls (non-compact mode) -->
    {#if !compact}
      <div class="extended-controls">
        <!-- Playback Speed -->
        <div class="speed-control">
          <label for="speed-{message.id}">Speed:</label>
          <select 
            id="speed-{message.id}"
            bind:value={playbackRate} 
            on:change={handleSpeedChange}
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1.0}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2x</option>
          </select>
        </div>
        
        <!-- Volume Control -->
        <div class="volume-control">
          <button 
            class="volume-button"
            class:muted={isMuted}
            on:click={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            bind:value={volume}
            on:input={handleVolumeChange}
            aria-label="Volume"
            class="volume-slider"
          />
        </div>
        
        <!-- Download Button -->
        {#if showDownload}
          <button
            class="download-button"
            on:click={downloadAudio}
            disabled={!audioUrl}
            aria-label="Download voice message"
          >
            📥
          </button>
        {/if}
      </div>
    {/if}
    
    <!-- Message Metadata (if available) -->
    {#if message.metadata?.senderId && !compact}
      <div class="message-info">
        <span class="sender">Voice message</span>
        <span class="timestamp">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .voice-player {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--bg-primary, #ffffff);
    border-radius: 12px;
    border: 1px solid var(--border-light, #e5e7eb);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    max-width: 350px;
  }
  
  .voice-player.compact {
    padding: 8px;
    gap: 6px;
    max-width: 250px;
  }
  
  .voice-player.playing {
    background: var(--bg-accent, #f0f9ff);
    border-color: var(--primary-200, #bfdbfe);
  }
  
  .voice-player.loading {
    opacity: 0.7;
  }
  
  .error-state {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--bg-error, #fef2f2);
    color: var(--text-error, #dc2626);
    border-radius: 8px;
    font-size: 14px;
  }
  
  .player-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .play-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: var(--primary-500, #3b82f6);
    color: white;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .play-button:hover:not(:disabled) {
    background: var(--primary-600, #2563eb);
    transform: scale(1.05);
  }
  
  .play-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .compact .play-button {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  .audio-visualization {
    flex: 1;
    height: 40px;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .compact .audio-visualization {
    height: 32px;
  }
  
  .waveform {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 1px;
    position: relative;
    padding: 4px;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 6px;
  }
  
  .waveform-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, 
      rgba(59, 130, 246, 0.2) 0%, 
      rgba(59, 130, 246, 0.1) 100%);
    border-radius: 6px;
    pointer-events: none;
    transition: width 0.1s ease;
  }
  
  .waveform-bar {
    flex: 1;
    max-width: 3px;
    background: var(--gray-300, #d1d5db);
    border-radius: 1px;
    transition: all 0.1s ease;
    min-height: 3px;
    position: relative;
    z-index: 1;
  }
  
  .waveform-bar.active {
    background: var(--primary-500, #3b82f6);
  }
  
  .progress-bar {
    width: 100%;
    height: 6px;
    position: relative;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .progress-track {
    width: 100%;
    height: 100%;
    background: var(--gray-200, #e5e7eb);
    border-radius: 3px;
  }
  
  .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: var(--primary-500, #3b82f6);
    border-radius: 3px;
    transition: width 0.1s ease;
  }
  
  .progress-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: var(--primary-500, #3b82f6);
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.1s ease;
  }
  
  .duration-display {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono, 'Courier New', monospace);
    font-size: 12px;
    color: var(--text-secondary, #6b7280);
    flex-shrink: 0;
    min-width: 40px;
  }
  
  .compact .duration-display {
    font-size: 11px;
    min-width: 30px;
  }
  
  .extended-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--border-light, #e5e7eb);
  }
  
  .speed-control {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  
  .speed-control label {
    color: var(--text-secondary, #6b7280);
  }
  
  .speed-control select {
    font-size: 11px;
    padding: 2px 4px;
    border: 1px solid var(--border-light, #e5e7eb);
    border-radius: 4px;
    background: var(--bg-primary, #ffffff);
  }
  
  .volume-control {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .volume-button {
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }
  
  .volume-button:hover {
    background: var(--bg-secondary, #f9fafb);
  }
  
  .volume-slider {
    width: 60px;
    height: 4px;
    background: var(--gray-200, #e5e7eb);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  
  .volume-slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--primary-500, #3b82f6);
    border-radius: 50%;
    cursor: pointer;
  }
  
  .download-button {
    background: none;
    border: 1px solid var(--border-light, #e5e7eb);
    padding: 6px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .download-button:hover:not(:disabled) {
    background: var(--bg-secondary, #f9fafb);
    border-color: var(--border-medium, #d1d5db);
  }
  
  .download-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .message-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--text-tertiary, #9ca3af);
    padding-top: 4px;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  /* Animations */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .voice-player {
      --bg-primary: #1f2937;
      --bg-secondary: #374151;
      --bg-accent: #1e3a8a;
      --text-secondary: #d1d5db;
      --text-tertiary: #9ca3af;
      --border-light: #4b5563;
      --border-medium: #6b7280;
    }
  }
  
  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .play-button,
    .waveform-bar,
    .progress-fill,
    .progress-thumb,
    .waveform-progress {
      transition: none;
    }
    
    .spin {
      animation: none;
    }
  }
  
  /* Focus styles */
  .play-button:focus-visible,
  .volume-button:focus-visible,
  .download-button:focus-visible {
    outline: 2px solid var(--primary-500, #3b82f6);
    outline-offset: 2px;
  }
  
  .audio-visualization:focus-visible {
    outline: 2px solid var(--primary-500, #3b82f6);
    outline-offset: 2px;
    border-radius: 6px;
  }
</style>