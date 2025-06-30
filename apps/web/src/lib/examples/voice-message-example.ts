/**
 * Voice Message System Example
 * Demonstrates how to integrate voice recording and playback with the Volly messaging system
 */

import { VoiceMessageHandler } from '../audio/voice-message-handler.js';
import type { VoiceMessageResult } from '../audio/voice-message-handler.js';
import { createVoiceMessage, type Message, type EncryptionInfo } from '@volli/messaging';

/**
 * Example usage of the voice message system
 */
export class VoiceMessageExample {
  private voiceHandler: VoiceMessageHandler;
  private currentUserId: string;

  constructor(userId: string) {
    this.currentUserId = userId;
    
    // Initialize voice message handler with custom options
    this.voiceHandler = new VoiceMessageHandler({
      maxDuration: 300, // 5 minutes
      generateWaveform: true,
      waveformSamples: 100,
      encryptAudio: true,
      compressionQuality: 0.8,
      autoSendOnStop: false // Manual send control
    });

    this.setupEventListeners();
  }

  /**
   * Check if voice messages are supported and request permissions
   */
  async initialize(): Promise<boolean> {
    if (!VoiceMessageHandler.isSupported()) {
      console.error('Voice messages are not supported in this browser');
      return false;
    }

    const permissionGranted = await this.voiceHandler.requestPermissions();
    if (!permissionGranted) {
      console.error('Microphone permission denied');
      return false;
    }

    console.log('Voice message system initialized successfully');
    return true;
  }

  /**
   * Start recording a voice message
   */
  async startRecording(): Promise<void> {
    try {
      console.log('Starting voice recording...');
      await this.voiceHandler.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and create a voice message
   */
  async stopRecording(
    recipientIds: string[],
    conversationId: string
  ): Promise<VoiceMessageResult> {
    try {
      console.log('Stopping voice recording...');
      
      // Create encryption info (in real app, this would come from your crypto system)
      const encryptionInfo: EncryptionInfo = {
        algorithm: 'AES-GCM',
        keyId: `voice-key-${Date.now()}`,
        nonce: crypto.randomUUID(),
        encryptedSize: 0, // Will be updated with actual size
        checksum: '', // Will be calculated
        version: 1
      };

      const result = await this.voiceHandler.stopRecording(
        this.currentUserId,
        recipientIds,
        conversationId,
        encryptionInfo
      );

      console.log('Voice message created:', {
        duration: result.duration,
        waveformSamples: result.waveform.length,
        audioSize: result.audioBlob.size
      });

      return result;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Pause current recording
   */
  pauseRecording(): void {
    try {
      this.voiceHandler.pauseRecording();
      console.log('Recording paused');
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }

  /**
   * Resume paused recording
   */
  resumeRecording(): void {
    try {
      this.voiceHandler.resumeRecording();
      console.log('Recording resumed');
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }

  /**
   * Cancel current recording
   */
  cancelRecording(): void {
    this.voiceHandler.cancelRecording();
    console.log('Recording cancelled');
  }

  /**
   * Get current recording state
   */
  getRecordingState() {
    return this.voiceHandler.getState();
  }

  /**
   * Get current recording duration
   */
  getCurrentDuration(): number {
    return this.voiceHandler.getCurrentDuration();
  }

  /**
   * Set up event listeners for voice recording events
   */
  private setupEventListeners(): void {
    // Recording lifecycle events
    this.voiceHandler.addEventListener('voicerecordingstarted', () => {
      console.log('🎤 Voice recording started');
      this.onRecordingStarted();
    });

    this.voiceHandler.addEventListener('voicerecordingpaused', () => {
      console.log('⏸️ Voice recording paused');
      this.onRecordingPaused();
    });

    this.voiceHandler.addEventListener('voicerecordingresumed', () => {
      console.log('▶️ Voice recording resumed');
      this.onRecordingResumed();
    });

    this.voiceHandler.addEventListener('voicerecordingcancelled', () => {
      console.log('❌ Voice recording cancelled');
      this.onRecordingCancelled();
    });

    // Processing events
    this.voiceHandler.addEventListener('voiceprocessingstarted', () => {
      console.log('⚙️ Processing voice message...');
      this.onProcessingStarted();
    });

    this.voiceHandler.addEventListener('voicemessagecreated', (event) => {
      const result = (event as CustomEvent).detail as VoiceMessageResult;
      console.log('✅ Voice message created successfully');
      this.onVoiceMessageCreated(result);
    });

    // Real-time updates
    this.voiceHandler.addEventListener('volumechange', (event) => {
      const { volume, duration } = (event as CustomEvent).detail;
      this.onVolumeChange(volume, duration);
    });

    // Error handling
    this.voiceHandler.addEventListener('error', (event) => {
      const error = (event as CustomEvent).detail;
      console.error('❌ Voice recording error:', error);
      this.onError(error);
    });
  }

  /**
   * Event handler callbacks (override these in your implementation)
   */
  protected onRecordingStarted(): void {
    // Update UI to show recording state
    // Enable pause/cancel buttons
    // Start visual feedback (pulse animation, etc.)
  }

  protected onRecordingPaused(): void {
    // Update UI to show paused state
    // Show resume button
  }

  protected onRecordingResumed(): void {
    // Update UI to show recording state
    // Hide resume button
  }

  protected onRecordingCancelled(): void {
    // Reset UI to initial state
    // Clear any visual feedback
  }

  protected onProcessingStarted(): void {
    // Show processing spinner
    // Disable controls during processing
  }

  protected onVoiceMessageCreated(result: VoiceMessageResult): void {
    // Handle the completed voice message
    // You might want to:
    // - Add it to the message queue for sending
    // - Display it in the chat interface
    // - Store it locally
    
    console.log('Voice message ready to send:', {
      messageId: result.message.id,
      duration: result.duration,
      size: result.audioBlob.size
    });
  }

  protected onVolumeChange(volume: number, duration: number): void {
    // Update real-time visualizations
    // - Volume meter
    // - Waveform animation
    // - Duration counter
  }

  protected onError(error: Error): void {
    // Handle errors appropriately
    // - Show error message to user
    // - Reset UI state
    // - Log error for debugging
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.voiceHandler.destroy();
  }
}

/**
 * Example Svelte store for managing voice recording state
 */
export function createVoiceRecordingStore(userId: string) {
  let voiceExample: VoiceMessageExample | null = null;
  let isInitialized = false;
  let isRecording = false;
  let isPaused = false;
  let isProcessing = false;
  let duration = 0;
  let volume = 0;
  let error: string | null = null;

  // Subscribe to state changes
  const subscribers = new Set<(state: any) => void>();

  function notify() {
    const state = {
      isInitialized,
      isRecording,
      isPaused,
      isProcessing,
      duration,
      volume,
      error
    };
    subscribers.forEach(callback => callback(state));
  }

  return {
    subscribe(callback: (state: any) => void) {
      subscribers.add(callback);
      notify(); // Send initial state
      
      return () => subscribers.delete(callback);
    },

    async initialize() {
      if (!voiceExample) {
        voiceExample = new VoiceMessageExample(userId);
        
        // Override event handlers to update store state
        (voiceExample as any).onRecordingStarted = () => {
          isRecording = true;
          isPaused = false;
          error = null;
          notify();
        };

        (voiceExample as any).onRecordingPaused = () => {
          isPaused = true;
          notify();
        };

        (voiceExample as any).onRecordingResumed = () => {
          isPaused = false;
          notify();
        };

        (voiceExample as any).onRecordingCancelled = () => {
          isRecording = false;
          isPaused = false;
          duration = 0;
          volume = 0;
          notify();
        };

        (voiceExample as any).onProcessingStarted = () => {
          isProcessing = true;
          notify();
        };

        (voiceExample as any).onVoiceMessageCreated = (result: VoiceMessageResult) => {
          isRecording = false;
          isPaused = false;
          isProcessing = false;
          notify();
          
          // Dispatch custom event with the result
          window.dispatchEvent(new CustomEvent('voicemessagecreated', { detail: result }));
        };

        (voiceExample as any).onVolumeChange = (vol: number, dur: number) => {
          volume = vol;
          duration = dur;
          notify();
        };

        (voiceExample as any).onError = (err: Error) => {
          error = err.message;
          isRecording = false;
          isPaused = false;
          isProcessing = false;
          notify();
        };
      }

      isInitialized = await voiceExample.initialize();
      notify();
      return isInitialized;
    },

    async startRecording() {
      if (voiceExample && isInitialized) {
        await voiceExample.startRecording();
      }
    },

    async stopRecording(recipientIds: string[], conversationId: string) {
      if (voiceExample && isRecording) {
        return await voiceExample.stopRecording(recipientIds, conversationId);
      }
    },

    pauseRecording() {
      if (voiceExample && isRecording && !isPaused) {
        voiceExample.pauseRecording();
      }
    },

    resumeRecording() {
      if (voiceExample && isRecording && isPaused) {
        voiceExample.resumeRecording();
      }
    },

    cancelRecording() {
      if (voiceExample && isRecording) {
        voiceExample.cancelRecording();
      }
    },

    destroy() {
      if (voiceExample) {
        voiceExample.destroy();
        voiceExample = null;
      }
      isInitialized = false;
      notify();
    }
  };
}

/**
 * Example of integrating with a chat application
 */
export async function sendVoiceMessage(
  voiceMessageHandler: VoiceMessageHandler,
  senderId: string,
  recipientIds: string[],
  conversationId: string,
  onMessageSent?: (message: Message) => void
): Promise<void> {
  try {
    // Create encryption info (integrate with your crypto system)
    const encryptionInfo: EncryptionInfo = {
      algorithm: 'AES-GCM',
      keyId: 'voice-encryption-key',
      nonce: crypto.randomUUID(),
      encryptedSize: 0,
      checksum: '',
      version: 1
    };

    // Stop recording and get the voice message
    const result = await voiceMessageHandler.stopRecording(
      senderId,
      recipientIds,
      conversationId,
      encryptionInfo
    );

    // Here you would typically:
    // 1. Add the message to your local message store
    // 2. Send the message through your networking layer
    // 3. Update the UI to show the sent message

    console.log('Sending voice message:', result.message.id);
    
    // Simulate sending (replace with your actual send logic)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (onMessageSent) {
      onMessageSent(result.message);
    }

    console.log('Voice message sent successfully');
  } catch (error) {
    console.error('Failed to send voice message:', error);
    throw error;
  }
}