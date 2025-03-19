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
    
    // Set more sensitive defaults for Mac users
    const isMac = typeof navigator !== 'undefined' && 
      (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
       navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);
    
    // Use a more sensitive threshold by default, especially on Mac
    if (this.options.mode === 'sensitive' || isMac) {
      this.threshold = options?.threshold || 0.15; // Much more sensitive for Mac
    } else if (this.options.mode === 'auto') {
      this.threshold = options?.threshold || 0.25; // Lower than before
    } else {
      this.threshold = options?.threshold || 0.3;
    }
    
    console.log('Voice activity detection initialized with options:', this.options, 
      'threshold:', this.threshold, 'isMac:', isMac);
  }

  /**
   * Start voice activity detection with an audio track
   */
  public async startDetection(audioTrack: AudioTrack): Promise<void> {
    if (!audioTrack) {
      throw new Error('Audio track is required for voice activity detection');
    }
    
    // First, ensure we have microphone permissions
    try {
      // Double check we have permissions by requesting the mic directly
      console.log('Explicitly requesting microphone permission...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted!');
    } catch (permError) {
      console.error('Failed to get microphone permission:', permError);
      throw new Error('Microphone permission denied. Please allow microphone access and try again.');
    }
    
    this.audioTrack = audioTrack;
    this.isActive = true;
    
    try {
      // Get MediaStream from the track
      const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
      
      // Log detailed track info for debugging
      console.log('Audio track info:', {
        trackId: audioTrack.mediaStreamTrack.id,
        trackLabel: audioTrack.mediaStreamTrack.label,
        trackEnabled: audioTrack.mediaStreamTrack.enabled,
        trackMuted: audioTrack.mediaStreamTrack.muted,
        trackReadyState: audioTrack.mediaStreamTrack.readyState
      });
      
      // Set up audio processing
      this.audioContext = new AudioContext();
      
      // Log the audio context state
      console.log('AudioContext created with state:', this.audioContext.state);
      
      // Ensure the AudioContext is running
      if (this.audioContext.state === 'suspended') {
        console.log('AudioContext is suspended, attempting to resume...');
        await this.audioContext.resume();
        console.log('After resume attempt, AudioContext state:', this.audioContext.state);
      }
      
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyzer with more sensitive settings
      this.analyser.fftSize = 1024; // Higher resolution for better speech detection
      this.analyser.smoothingTimeConstant = 0.5; // Less smoothing for more responsive detection
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Connect nodes
      this.mediaStreamSource.connect(this.analyser);
      
      // Log that we've set up audio processing successfully
      console.log('Audio processing chain set up successfully with fftSize:', 
        this.analyser.fftSize, 'frequencyBinCount:', this.analyser.frequencyBinCount);
      
      // Start polling for voice activity
      this.startPolling();
    } catch (error) {
      console.error('Failed to start voice activity detection:', error);
      this.stopDetection();
      
      // More detailed error
      if (error instanceof DOMException) {
        console.error('DOM Exception details:', {
          name: error.name,
          message: error.message,
          code: error.code
        });
      }
      
      throw new Error(`Failed to initialize audio processing: ${error instanceof Error ? error.message : String(error)}`);
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
    let maxValue = 0;
    
    // Focus on frequency ranges most common in human speech (roughly 85-255Hz)
    // This helps filter out some background noise
    const speechFrequencyStartIndex = Math.floor(this.dataArray.length * 0.1);
    const speechFrequencyEndIndex = Math.floor(this.dataArray.length * 0.6);
    
    for (let i = 0; i < this.dataArray.length; i++) {
      // Give more weight to frequencies in the speech range
      const value = this.dataArray[i];
      sum += value;
      
      // Track maximum value
      if (value > maxValue) {
        maxValue = value;
      }
    }
    
    // Calculate normal average
    const average = sum / this.dataArray.length;
    
    // Calculate weighted average focusing on speech frequencies
    let speechSum = 0;
    for (let i = speechFrequencyStartIndex; i < speechFrequencyEndIndex; i++) {
      speechSum += this.dataArray[i];
    }
    const speechAverage = speechSum / (speechFrequencyEndIndex - speechFrequencyStartIndex);
    
    // Use a combination of full spectrum and speech-focused averages
    // This gives us better sensitivity to actual human speech
    const combinedLevel = (average * 0.3) + (speechAverage * 0.7);
    
    // Normalize to 0-1 range
    const normalizedLevel = combinedLevel / 255;
    this.level = normalizedLevel;
    
    // On Mac, we might need to use max value for better sensitivity
    const isMac = typeof navigator !== 'undefined' && 
      (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
       navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);
       
    // On Mac, use a combination that gives more weight to maximum values
    if (isMac) {
      // Give more weight to max value on Mac
      const maxNormalized = maxValue / 255;
      this.level = Math.max(normalizedLevel, maxNormalized * 0.8);
    }
    
    // Determine if speaking based on threshold
    const isSpeakingNow = this.level > this.threshold;
    
    // More frequent logging to debug microphone issues
    if (Date.now() % 200 < 50) { // Log roughly 5 times per second
      console.log(
        `Audio levels - Level: ${this.level.toFixed(2)}, ` +
        `Raw Avg: ${(average/255).toFixed(2)}, ` + 
        `Max: ${(maxValue/255).toFixed(2)}, ` +
        `Speaking: ${isSpeakingNow}, ` +
        `Threshold: ${this.threshold.toFixed(2)}`
      );
    }
    
    // Always emit the current energy level for other components to use
    this.emitter.emit('energy-level', this.level);
    
    // Handle voice activity state transitions
    if (isSpeakingNow) {
      this.lastVoiceActivityTime = Date.now();
      
      if (!this.isSpeaking) {
        console.log(`Voice activity started - level: ${this.level.toFixed(2)}, threshold: ${this.threshold.toFixed(2)}`);
        this.updateSpeakingState(true, this.level);
      }
    } else if (
      this.isSpeaking &&
      Date.now() - this.lastVoiceActivityTime > (this.options.silenceDurationMs || 1000)
    ) {
      console.log(`Voice activity ended - last activity: ${Date.now() - this.lastVoiceActivityTime}ms ago`);
      this.updateSpeakingState(false, this.level);
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

  /**
   * Resume the AudioContext if suspended
   * This should be called in response to a user gesture
   */
  public async resumeAudioContext(): Promise<boolean> {
    try {
      // If there's no audio context yet, it's not an error - we'll create one 
      // when the user starts recording
      if (!this.audioContext) {
        console.log('AudioContext not initialized yet');
        return true;
      }
      
      const state = this.audioContext.state;
      
      if (state === 'suspended') {
        console.log('Resuming suspended AudioContext after user interaction');
        await this.audioContext.resume();
        console.log(`AudioContext state after resume: ${this.audioContext.state}`);
        
        // Simply return true if we've reached this point without errors
        return true;
      }
      
      // If it's already running, that's success
      if (state === 'running') {
        console.log('AudioContext is already in running state');
        return true;
      }
      
      // If we get here, it's in some other state (like 'closed')
      console.warn(`AudioContext is in ${state} state, cannot resume`);
      return false;
    } catch (error) {
      console.error('Failed to resume AudioContext:', error);
      
      // If it's a NotAllowedError, that's usually because it wasn't triggered 
      // by a user gesture
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.warn('NotAllowedError when resuming AudioContext - this usually means it wasn\'t triggered by a user gesture');
      }
      
      return false;
    }
  }

  /**
   * Configure audio processing for better echo cancellation and quality
   */
  public async configureAudioProcessing(constraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }): Promise<boolean> {
    try {
      // We don't have direct access to the mediaStream in this architecture
      // Instead, we'll store these constraints to be used when starting detection
      if (typeof window !== 'undefined') {
        (window as any).__enhancedAudioConstraints = constraints;
        console.log('Stored enhanced audio constraints for future use:', constraints);
      }
      
      // If we have an active audio track, try to apply constraints
      if (this.audioTrack && this.audioTrack.mediaStreamTrack) {
        await this.audioTrack.mediaStreamTrack.applyConstraints(constraints);
        console.log('Applied audio constraints to existing track:', constraints);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to configure audio processing:', error);
      return false;
    }
  }

  /**
   * Simplified auto-adjust sensitivity that works with our architecture
   */
  public async autoAdjustSensitivity(durationMs: number = 3000): Promise<number> {
    return this.autoAdjustVadSensitivity(durationMs);
  }
}

// Create a singleton instance
const voiceActivityService = new VoiceActivityService();
export default voiceActivityService; 