/**
 * Voice Recording System for Volly
 * Implements WebRTC audio recording with compression and waveform generation
 */

export interface VoiceRecordingOptions {
  maxDuration?: number; // Maximum recording duration in seconds (default: 300 = 5 minutes)
  sampleRate?: number; // Audio sample rate (default: 44100)
  bitRate?: number; // Audio bit rate for compression (default: 64000)
  format?: 'ogg' | 'webm' | 'mp4'; // Output format (default: 'ogg')
  generateWaveform?: boolean; // Whether to generate waveform data (default: true)
  waveformSamples?: number; // Number of waveform samples (default: 100)
}

export interface VoiceRecordingResult {
  audioBlob: Blob;
  duration: number; // Duration in seconds
  waveform: number[]; // Normalized waveform data (0-1)
  size: number; // File size in bytes
  mimeType: string;
}

export interface VoiceRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  currentVolume: number; // Current audio level (0-1)
  error?: string;
}

export class VoiceRecorderError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'VoiceRecorderError';
  }
}

export class VoiceRecorder extends EventTarget {
  private mediaRecorder?: MediaRecorder;
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private mediaStream?: MediaStream;
  private audioChunks: Blob[] = [];
  private startTime?: number;
  private pausedDuration = 0;
  private volumeInterval?: number;
  private waveformData: number[] = [];
  
  private state: VoiceRecorderState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    currentVolume: 0
  };

  private options: Required<VoiceRecordingOptions>;

  constructor(options: VoiceRecordingOptions = {}) {
    super();
    
    this.options = {
      maxDuration: options.maxDuration ?? 300, // 5 minutes
      sampleRate: options.sampleRate ?? 44100,
      bitRate: options.bitRate ?? 64000,
      format: options.format ?? 'ogg',
      generateWaveform: options.generateWaveform ?? true,
      waveformSamples: options.waveformSamples ?? 100
    };
  }

  /**
   * Get current recorder state
   */
  getState(): VoiceRecorderState {
    return { ...this.state };
  }

  /**
   * Check if voice recording is supported
   */
  static isSupported(): boolean {
    return !!(typeof navigator !== 'undefined' && 
              navigator.mediaDevices && 
              typeof navigator.mediaDevices.getUserMedia === 'function' && 
              typeof window !== 'undefined' &&
              window.MediaRecorder &&
              typeof window.MediaRecorder === 'function');
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Test and immediately stop the stream
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (this.state.isRecording) {
      throw new VoiceRecorderError('Already recording', 'ALREADY_RECORDING');
    }

    if (!VoiceRecorder.isSupported()) {
      throw new VoiceRecorderError('Voice recording not supported', 'NOT_SUPPORTED');
    }

    try {
      // Get media stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up audio context for volume monitoring and waveform generation
      this.audioContext = new AudioContext({ sampleRate: this.options.sampleRate });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      // Determine MIME type
      const mimeType = this.getMimeType();
      
      // Set up MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: this.options.bitRate
      });

      // Reset state
      this.audioChunks = [];
      this.waveformData = [];
      this.pausedDuration = 0;
      this.state = {
        isRecording: true,
        isPaused: false,
        duration: 0,
        currentVolume: 0,
        error: undefined
      };

      // Set up event listeners
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.state.isRecording = false;
        this.state.isPaused = false;
        this.dispatchEvent(new CustomEvent('recordingfinished'));
      };

      this.mediaRecorder.onerror = (event) => {
        const error = new VoiceRecorderError('Recording failed', 'RECORDING_FAILED');
        this.state.error = error.message;
        this.state.isRecording = false;
        this.state.isPaused = false;
        this.dispatchEvent(new CustomEvent('error', { detail: error }));
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.startTime = Date.now();

      // Start volume monitoring
      this.startVolumeMonitoring();

      // Set up max duration timer
      setTimeout(() => {
        if (this.state.isRecording) {
          this.stopRecording();
        }
      }, this.options.maxDuration * 1000);

      this.dispatchEvent(new CustomEvent('recordingstarted'));

    } catch (error) {
      const recordingError = new VoiceRecorderError(
        `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'START_FAILED'
      );
      this.state.error = recordingError.message;
      this.cleanup();
      throw recordingError;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (!this.state.isRecording || this.state.isPaused) {
      throw new VoiceRecorderError('Cannot pause: not recording or already paused', 'INVALID_STATE');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.state.isPaused = true;
      this.pausedDuration += Date.now() - (this.startTime || 0);
      this.stopVolumeMonitoring();
      this.dispatchEvent(new CustomEvent('recordingpaused'));
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (!this.state.isRecording || !this.state.isPaused) {
      throw new VoiceRecorderError('Cannot resume: not recording or not paused', 'INVALID_STATE');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.state.isPaused = false;
      this.startTime = Date.now();
      this.startVolumeMonitoring();
      this.dispatchEvent(new CustomEvent('recordingresumed'));
    }
  }

  /**
   * Stop recording and return result
   */
  async stopRecording(): Promise<VoiceRecordingResult> {
    if (!this.state.isRecording) {
      throw new VoiceRecorderError('Not recording', 'NOT_RECORDING');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new VoiceRecorderError('MediaRecorder not initialized', 'INVALID_STATE'));
        return;
      }

      const handleStop = async () => {
        try {
          const result = await this.processRecording();
          this.cleanup();
          resolve(result);
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };

      this.mediaRecorder.addEventListener('stop', handleStop, { once: true });
      this.mediaRecorder.stop();
      this.stopVolumeMonitoring();
    });
  }

  /**
   * Cancel recording
   */
  cancelRecording(): void {
    if (this.state.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.audioChunks = [];
      this.waveformData = [];
    }
    this.cleanup();
    this.dispatchEvent(new CustomEvent('recordingcancelled'));
  }

  /**
   * Get current recording duration
   */
  getCurrentDuration(): number {
    if (!this.state.isRecording || !this.startTime) {
      return 0;
    }

    const currentTime = this.state.isPaused ? 0 : Date.now() - this.startTime;
    return (this.pausedDuration + currentTime) / 1000;
  }

  /**
   * Process the recorded audio
   */
  private async processRecording(): Promise<VoiceRecordingResult> {
    if (this.audioChunks.length === 0) {
      throw new VoiceRecorderError('No audio data recorded', 'NO_DATA');
    }

    // Create final audio blob
    const mimeType = this.getMimeType();
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
    
    // Calculate final duration
    const duration = this.getCurrentDuration();

    // Generate waveform if requested
    let waveform: number[] = [];
    if (this.options.generateWaveform && this.waveformData.length > 0) {
      waveform = this.normalizeWaveform(this.waveformData, this.options.waveformSamples);
    }

    return {
      audioBlob,
      duration,
      waveform,
      size: audioBlob.size,
      mimeType
    };
  }

  /**
   * Start volume monitoring
   */
  private startVolumeMonitoring(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      if (!this.analyser || !this.state.isRecording || this.state.isPaused) {
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const volume = rms / 255; // Normalize to 0-1

      this.state.currentVolume = volume;
      this.state.duration = this.getCurrentDuration();

      // Store waveform data if enabled
      if (this.options.generateWaveform) {
        this.waveformData.push(volume);
      }

      this.dispatchEvent(new CustomEvent('volumechange', { 
        detail: { volume, duration: this.state.duration } 
      }));
    };

    this.volumeInterval = window.setInterval(updateVolume, 100);
  }

  /**
   * Stop volume monitoring
   */
  private stopVolumeMonitoring(): void {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = undefined;
    }
  }

  /**
   * Get appropriate MIME type for recording
   */
  private getMimeType(): string {
    const formats = {
      ogg: 'audio/ogg; codecs=opus',
      webm: 'audio/webm; codecs=opus',
      mp4: 'audio/mp4'
    };

    const preferredMimeType = formats[this.options.format];
    
    if (MediaRecorder.isTypeSupported(preferredMimeType)) {
      return preferredMimeType;
    }

    // Fallback to supported formats
    const fallbacks = Object.values(formats);
    for (const mimeType of fallbacks) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // Last resort
    return 'audio/wav';
  }

  /**
   * Normalize waveform data to specified number of samples
   */
  private normalizeWaveform(data: number[], targetSamples: number): number[] {
    if (data.length === 0) return [];
    
    const samplesPerBucket = Math.ceil(data.length / targetSamples);
    const normalized: number[] = [];

    for (let i = 0; i < targetSamples; i++) {
      const startIdx = i * samplesPerBucket;
      const endIdx = Math.min(startIdx + samplesPerBucket, data.length);
      
      // Calculate average for this bucket
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sum += data[j];
        count++;
      }
      
      normalized.push(count > 0 ? sum / count : 0);
    }

    return normalized;
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.stopVolumeMonitoring();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = undefined;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = undefined;
    }

    this.mediaRecorder = undefined;
    this.analyser = undefined;
    this.state = {
      isRecording: false,
      isPaused: false,
      duration: 0,
      currentVolume: 0
    };
  }

  /**
   * Destroy the recorder instance
   */
  destroy(): void {
    if (this.state.isRecording) {
      this.cancelRecording();
    } else {
      this.cleanup();
    }
  }
}