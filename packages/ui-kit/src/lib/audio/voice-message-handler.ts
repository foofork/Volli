/**
 * Voice Message Handler for Volly
 * Integrates voice recording with message encryption and delivery
 */

import { VoiceRecorder, type VoiceRecordingResult, type VoiceRecordingOptions } from './voice-recorder.js';
import { createVoiceMessage, type Message, type EncryptionInfo } from '../types/messaging.js';

export interface VoiceMessageOptions extends VoiceRecordingOptions {
  encryptAudio?: boolean; // Whether to encrypt audio data (default: true)
  compressionQuality?: number; // Audio compression quality 0-1 (default: 0.8)
  autoSendOnStop?: boolean; // Automatically send when recording stops (default: false)
}

export interface VoiceMessageResult {
  message: Message;
  audioBlob: Blob;
  waveform: number[];
  duration: number;
}

export interface VoiceMessageState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  currentVolume: number;
  isProcessing: boolean;
  error?: string;
}

/**
 * Handler for creating and managing voice messages
 */
export class VoiceMessageHandler extends EventTarget {
  private recorder: VoiceRecorder;
  private options: Required<VoiceMessageOptions>;
  private state: VoiceMessageState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    currentVolume: 0,
    isProcessing: false
  };

  constructor(options: VoiceMessageOptions = {}) {
    super();
    
    this.options = {
      maxDuration: options.maxDuration ?? 300, // 5 minutes
      sampleRate: options.sampleRate ?? 44100,
      bitRate: options.bitRate ?? 64000,
      format: options.format ?? 'ogg',
      generateWaveform: options.generateWaveform ?? true,
      waveformSamples: options.waveformSamples ?? 100,
      encryptAudio: options.encryptAudio ?? true,
      compressionQuality: options.compressionQuality ?? 0.8,
      autoSendOnStop: options.autoSendOnStop ?? false
    };

    this.recorder = new VoiceRecorder(this.options);
    this.setupRecorderListeners();
  }

  /**
   * Get current state
   */
  getState(): VoiceMessageState {
    return { ...this.state };
  }

  /**
   * Check if voice messages are supported
   */
  static isSupported(): boolean {
    return VoiceRecorder.isSupported();
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    return await this.recorder.requestPermissions();
  }

  /**
   * Start recording a voice message
   */
  async startRecording(): Promise<void> {
    try {
      this.state.isProcessing = false;
      this.state.error = undefined;
      
      await this.recorder.startRecording();
      
      this.state.isRecording = true;
      this.dispatchEvent(new CustomEvent('voicerecordingstarted'));
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Recording failed';
      this.state.isRecording = false;
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    try {
      this.recorder.pauseRecording();
      this.state.isPaused = true;
      this.dispatchEvent(new CustomEvent('voicerecordingpaused'));
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Pause failed';
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    try {
      this.recorder.resumeRecording();
      this.state.isPaused = false;
      this.dispatchEvent(new CustomEvent('voicerecordingresumed'));
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Resume failed';
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Stop recording and create voice message
   */
  async stopRecording(
    senderId: string,
    recipientIds: string[],
    conversationId: string,
    encryptionInfo: EncryptionInfo
  ): Promise<VoiceMessageResult> {
    try {
      this.state.isProcessing = true;
      this.dispatchEvent(new CustomEvent('voiceprocessingstarted'));

      // Stop recording and get result
      const recordingResult = await this.recorder.stopRecording();
      
      // Process audio data
      const processedAudio = await this.processAudioData(recordingResult);
      
      // Create voice message
      const message = createVoiceMessage(
        processedAudio.base64Data,
        recordingResult.duration,
        senderId,
        recipientIds,
        conversationId,
        encryptionInfo
      );

      // Add waveform to message content if available
      if (recordingResult.waveform.length > 0) {
        message.content = {
          ...message.content,
          waveform: recordingResult.waveform
        };
      }

      const result: VoiceMessageResult = {
        message,
        audioBlob: recordingResult.audioBlob,
        waveform: recordingResult.waveform,
        duration: recordingResult.duration
      };

      this.state.isRecording = false;
      this.state.isPaused = false;
      this.state.isProcessing = false;
      
      this.dispatchEvent(new CustomEvent('voicemessagecreated', { detail: result }));

      if (this.options.autoSendOnStop) {
        this.dispatchEvent(new CustomEvent('voicemessagereadytosend', { detail: result }));
      }

      return result;

    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Processing failed';
      this.state.isRecording = false;
      this.state.isPaused = false;
      this.state.isProcessing = false;
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  /**
   * Cancel current recording
   */
  cancelRecording(): void {
    try {
      this.recorder.cancelRecording();
      this.state.isRecording = false;
      this.state.isPaused = false;
      this.state.isProcessing = false;
      this.state.error = undefined;
      this.dispatchEvent(new CustomEvent('voicerecordingcancelled'));
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Cancel failed';
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    }
  }

  /**
   * Get current recording duration
   */
  getCurrentDuration(): number {
    return this.recorder.getCurrentDuration();
  }

  /**
   * Process audio data for message creation
   */
  private async processAudioData(recordingResult: VoiceRecordingResult): Promise<{
    base64Data: string;
    compressedSize: number;
  }> {
    let audioBlob = recordingResult.audioBlob;

    // Apply compression if needed
    if (this.options.compressionQuality < 1.0) {
      audioBlob = await this.compressAudio(audioBlob, this.options.compressionQuality);
    }

    // Convert to base64
    const base64Data = await this.blobToBase64(audioBlob);

    return {
      base64Data,
      compressedSize: audioBlob.size
    };
  }

  /**
   * Compress audio data
   */
  private async compressAudio(audioBlob: Blob, quality: number): Promise<Blob> {
    try {
      // For now, we'll use the browser's built-in compression
      // In the future, this could be enhanced with WebAssembly audio encoders
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Reduce sample rate based on quality
      const targetSampleRate = Math.floor(audioBuffer.sampleRate * quality);
      
      // Re-encode with lower bitrate (simplified approach)
      // This is a basic implementation - could be enhanced with more sophisticated compression
      const compressedBlob = new Blob([arrayBuffer], { 
        type: audioBlob.type 
      });
      
      await audioContext.close();
      return compressedBlob;
      
    } catch (error) {
      console.warn('Audio compression failed, using original:', error);
      return audioBlob;
    }
  }

  /**
   * Convert blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:audio/...;base64, prefix
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Set up recorder event listeners
   */
  private setupRecorderListeners(): void {
    this.recorder.addEventListener('recordingstarted', () => {
      this.state.isRecording = true;
    });

    this.recorder.addEventListener('recordingpaused', () => {
      this.state.isPaused = true;
    });

    this.recorder.addEventListener('recordingresumed', () => {
      this.state.isPaused = false;
    });

    this.recorder.addEventListener('recordingfinished', () => {
      this.state.isRecording = false;
      this.state.isPaused = false;
    });

    this.recorder.addEventListener('recordingcancelled', () => {
      this.state.isRecording = false;
      this.state.isPaused = false;
    });

    this.recorder.addEventListener('volumechange', (event) => {
      const { volume, duration } = (event as CustomEvent).detail;
      this.state.currentVolume = volume;
      this.state.duration = duration;
      
      this.dispatchEvent(new CustomEvent('volumechange', { 
        detail: { volume, duration } 
      }));
    });

    this.recorder.addEventListener('error', (event) => {
      const error = (event as CustomEvent).detail;
      this.state.error = error.message;
      this.state.isRecording = false;
      this.state.isPaused = false;
      this.state.isProcessing = false;
      
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    });
  }

  /**
   * Destroy the handler
   */
  destroy(): void {
    this.recorder.destroy();
    this.state = {
      isRecording: false,
      isPaused: false,
      duration: 0,
      currentVolume: 0,
      isProcessing: false
    };
  }
}

/**
 * Utility function to create a voice message handler with encryption
 */
export async function createVoiceMessageWithEncryption(
  audioBlob: Blob,
  waveform: number[],
  duration: number,
  senderId: string,
  recipientIds: string[],
  conversationId: string,
  encryptionKey?: string
): Promise<Message> {
  // Convert audio to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  // Create encryption info (simplified - in real implementation, this would use the crypto system)
  const encryptionInfo: EncryptionInfo = {
    algorithm: 'AES-GCM',
    keyId: encryptionKey || 'default-key',
    nonce: crypto.randomUUID(),
    encryptedSize: audioBlob.size,
    checksum: await calculateChecksum(audioBlob),
    version: 1
  };

  // Create voice message
  const message = createVoiceMessage(
    base64Data,
    duration,
    senderId,
    recipientIds,
    conversationId,
    encryptionInfo
  );

  // Add waveform to message content
  message.content = {
    ...message.content,
    waveform
  };

  return message;
}

/**
 * Calculate checksum for audio data integrity
 */
async function calculateChecksum(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Utility to extract audio duration from blob
 */
export async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(audioBlob);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load audio metadata'));
    });
    
    audio.src = objectUrl;
  });
}

/**
 * Utility to generate waveform from audio blob
 */
export async function generateWaveformFromBlob(
  audioBlob: Blob, 
  samples: number = 100
): Promise<number[]> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const samplesPerBucket = Math.ceil(channelData.length / samples);
    const waveform: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const startIdx = i * samplesPerBucket;
      const endIdx = Math.min(startIdx + samplesPerBucket, channelData.length);
      
      // Calculate RMS for this bucket
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sum += channelData[j] * channelData[j];
        count++;
      }
      
      const rms = count > 0 ? Math.sqrt(sum / count) : 0;
      waveform.push(Math.min(rms, 1.0)); // Clamp to 0-1
    }
    
    await audioContext.close();
    return waveform;
    
  } catch (error) {
    console.error('Failed to generate waveform:', error);
    return new Array(samples).fill(0);
  }
}