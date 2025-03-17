import { AudioTrack } from 'livekit-client';
import { EventEmitter } from 'events';

export interface VoiceActivityOptions {
  mode: 'auto' | 'sensitive' | 'manual';
  threshold?: number; // 0.1-0.9, default 0.3
  silenceDurationMs?: number; // default 1000
  prefixPaddingMs?: number; // default 500
}

export interface VoiceActivityState {
  isSpeaking: boolean;
  level: number;
  timestamp: number;
}

export type VoiceActivityCallback = (state: VoiceActivityState) => void;

export class VoiceActivityService {
  private options: VoiceActivityOptions = {
    mode: 'auto',
    threshold: 0.3,
    silenceDurationMs: 1000,
    prefixPaddingMs: 500,
  };
  
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  
  private isSpeaking: boolean = false;
  private lastVoiceActivityTime: number = 0;
  private level: number = 0;
  
  private pollingInterval: NodeJS.Timeout | null = null;
  private callbacks: VoiceActivityCallback[] = [];
  private isActive: boolean = false;
  private audioTrack: AudioTrack | null = null;
  private threshold: number = 0.3;
  private emitter: EventEmitter = new EventEmitter();

  /**
   * Initialize voice activity detection
   */
  public initialize(options?: Partial<VoiceActivityOptions>): void {
    this.options = { ...this.options, ...options };
    this.threshold = this.options.threshold || 0.3;
    
    // Set default values based on mode
    if (this.options.mode === 'sensitive') {
      this.threshold = options?.threshold || 0.2;
    } else if (this.options.mode === 'auto') {
      this.threshold = options?.threshold || 0.3;
    } else {
      this.threshold = options?.threshold || 0.4;
    }
    
    console.log('Voice activity detection initialized with options:', this.options, 'threshold:', this.threshold);
  }

  /**
   * Start voice activity detection with an audio track
   */
  public async startDetection(audioTrack: AudioTrack): Promise<void> {
    if (!audioTrack) {
      throw new Error('Audio track is required for voice activity detection');
    }
    
    this.audioTrack = audioTrack;
    this.isActive = true;
    
    try {
      // Get MediaStream from the track
      const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
      
      // Set up audio processing
      this.audioContext = new AudioContext();
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyzer
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Connect nodes
      this.mediaStreamSource.connect(this.analyser);
      
      // Start polling for voice activity
      this.startPolling();
    } catch (error) {
      console.error('Failed to start voice activity detection:', error);
      this.stopDetection();
    }
  }

  /**
   * Stop voice activity detection
   */
  public stopDetection(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isActive = false;
    this.audioTrack = null;
    
    if (this.audioContext) {
      // Only close if context is in a state that can be closed
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(err => {
          console.error('Error closing audio context:', err);
        });
      }
      this.audioContext = null;
    }
    
    this.mediaStreamSource = null;
    this.analyser = null;
    this.dataArray = null;
    this.isSpeaking = false;
  }

  /**
   * Register a callback for voice activity events
   */
  public onVoiceActivity(callback: VoiceActivityCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a voice activity callback
   */
  public offVoiceActivity(callback: VoiceActivityCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Update voice activity detection options
   */
  public updateOptions(options: Partial<VoiceActivityOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get the current voice activity state
   */
  public getState(): VoiceActivityState {
    return {
      isSpeaking: this.isSpeaking,
      level: this.level,
      timestamp: Date.now(),
    };
  }

  /**
   * Set speaking state manually (for manual mode)
   */
  public setSpeaking(isSpeaking: boolean): void {
    if (this.options.mode === 'manual') {
      this.updateSpeakingState(isSpeaking, this.level);
    }
  }

  /**
   * Start polling for voice activity
   */
  private startPolling(): void {
    // Poll every 50ms (20 times per second)
    this.pollingInterval = setInterval(() => {
      this.detectVoiceActivity();
    }, 50);
  }

  /**
   * Detect voice activity using the audio analyzer
   */
  private detectVoiceActivity(): void {
    if (!this.analyser || !this.dataArray) return;
    
    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    
    const average = sum / this.dataArray.length;
    const normalizedLevel = average / 255; // 0 to 1
    this.level = normalizedLevel;
    
    // Determine if speaking based on threshold
    const isSpeakingNow = normalizedLevel > (this.options.threshold || 0.3);
    
    // Handle voice activity state transitions
    if (isSpeakingNow) {
      this.lastVoiceActivityTime = Date.now();
      
      if (!this.isSpeaking) {
        this.updateSpeakingState(true, normalizedLevel);
      }
    } else if (
      this.isSpeaking &&
      Date.now() - this.lastVoiceActivityTime > (this.options.silenceDurationMs || 1000)
    ) {
      this.updateSpeakingState(false, normalizedLevel);
    }
  }

  /**
   * Update the speaking state and notify callbacks
   */
  private updateSpeakingState(isSpeaking: boolean, level: number): void {
    this.isSpeaking = isSpeaking;
    
    const state: VoiceActivityState = {
      isSpeaking,
      level,
      timestamp: Date.now(),
    };
    
    // Notify all callbacks
    this.callbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in voice activity callback:', error);
      }
    });
  }

  /**
   * Automatically adjust VAD sensitivity based on background noise
   * @param sampleDuration Duration in milliseconds to sample background noise
   * @returns Promise resolving with the adjusted threshold
   */
  public async autoAdjustVadSensitivity(sampleDuration: number = 2000): Promise<number> {
    if (!this.isActive || !this.audioTrack) {
      console.warn('Cannot auto-adjust VAD sensitivity: VAD not active');
      return this.threshold;
    }

    console.log('Auto-adjusting VAD sensitivity...');
    
    // Collect audio samples to analyze background noise
    const samples: number[] = [];
    const originalThreshold = this.threshold;
    
    // Temporarily set a very low threshold to capture all audio levels
    this.threshold = 0.1;
    
    // Set up a listener for energy levels during sampling period
    const energyLevelListener = (level: number) => {
      samples.push(level);
    };
    
    // Add temporary listener
    this.emitter.on('energy-level', energyLevelListener);
    
    // Sample for the specified duration
    await new Promise(resolve => setTimeout(resolve, sampleDuration));
    
    // Remove temporary listener
    this.emitter.off('energy-level', energyLevelListener);
    
    // Calculate a new threshold based on the samples
    // We use the 80th percentile of the background noise as our baseline
    // and add a buffer to reduce false positives
    if (samples.length > 0) {
      samples.sort((a, b) => a - b);
      const percentile80Index = Math.floor(samples.length * 0.8);
      const baseNoiseLevel = samples[percentile80Index];
      
      // Set threshold above the background noise level with a buffer
      // Minimum 0.15, maximum 0.9
      const newThreshold = Math.min(Math.max(baseNoiseLevel + 0.1, 0.15), 0.9);
      
      console.log(`Auto-adjusted VAD threshold: ${originalThreshold} -> ${newThreshold} (based on ${samples.length} samples)`);
      this.threshold = newThreshold;
      
      // Emit event for updated threshold
      this.emitter.emit('threshold-updated', this.threshold);
      
      return this.threshold;
    }
    
    // If we couldn't get samples, keep the original threshold
    console.log('Could not auto-adjust VAD threshold: no samples collected');
    this.threshold = originalThreshold;
    return this.threshold;
  }
}

// Create a singleton instance
const voiceActivityService = new VoiceActivityService();
export default voiceActivityService; 