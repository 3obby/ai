/**
 * VoiceActivityDetector
 * 
 * Detects voice activity in an audio stream using the AudioAnalyzerService.
 * Implements configurable thresholds and hysteresis for accurate voice detection.
 */

import { EventEmitter } from 'events';
import audioAnalyzerService, { AudioLevelData } from './AudioAnalyzerService';
import eventBus from '../events/EventBus';

export interface VoiceActivityOptions {
  mode: 'auto' | 'sensitive' | 'manual';
  threshold?: number;             // 0.1-0.9, default 0.3 (more sensitive: lower)
  silenceDurationMs?: number;     // Duration of silence before ending speech, default 1000ms
  prefixPaddingMs?: number;       // Include audio before speech detected, default 500ms
  minSpeechDurationMs?: number;   // Minimum duration to consider speech, default 200ms
}

export interface VoiceActivityState {
  isSpeaking: boolean;
  level: number;
  timestamp: number;
  wasSpeaking: boolean;
  duration?: number;
}

export type VoiceActivityCallback = (state: VoiceActivityState) => void;

export class VoiceActivityDetector extends EventEmitter {
  private static instance: VoiceActivityDetector;
  
  private options: VoiceActivityOptions = {
    mode: 'auto',
    threshold: 0.3,
    silenceDurationMs: 1000,
    prefixPaddingMs: 500,
    minSpeechDurationMs: 200
  };
  
  private isSpeaking: boolean = false;
  private wasSpeaking: boolean = false;
  private speechStartTime: number = 0;
  private lastVoiceActivityTime: number = 0;
  private audioLevel: number = 0;
  private isActive: boolean = false;
  private threshold: number = 0.3;
  private silenceTimer: NodeJS.Timeout | null = null;
  private prefixBuffer: {level: number, timestamp: number}[] = [];
  private callbacks: VoiceActivityCallback[] = [];
  private mediaStream: MediaStream | null = null;

  private constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Get the singleton instance of VoiceActivityDetector
   */
  public static getInstance(): VoiceActivityDetector {
    if (!VoiceActivityDetector.instance) {
      VoiceActivityDetector.instance = new VoiceActivityDetector();
    }
    return VoiceActivityDetector.instance;
  }

  /**
   * Initialize voice activity detection
   */
  public initialize(options?: Partial<VoiceActivityOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Adjust threshold based on mode
    if (this.options.mode === 'sensitive') {
      this.threshold = this.options.threshold || 0.15; // More sensitive
    } else if (this.options.mode === 'auto') {
      this.threshold = this.options.threshold || 0.25; // Default
    } else {
      this.threshold = this.options.threshold || 0.3; // Manual
    }
    
    console.log('Voice activity detector initialized with options:', this.options);
  }

  /**
   * Set up event listeners for audio analyzer
   */
  private setupEventListeners(): void {
    audioAnalyzerService.on('audio:data', this.handleAudioData);
  }

  /**
   * Handle audio data from analyzer
   */
  private handleAudioData = (data: AudioLevelData): void => {
    if (!this.isActive) return;
    
    this.audioLevel = data.level;
    
    // Emit through the EventBus for wider application use
    eventBus.emit('audio:level', { 
      level: data.level, 
      timestamp: data.timestamp 
    });
    
    // Store in prefix buffer (for including audio before speech starts)
    this.prefixBuffer.push({
      level: data.level,
      timestamp: data.timestamp
    });
    
    // Limit buffer size based on prefix padding
    const bufferSize = Math.ceil(
      (this.options.prefixPaddingMs || 500) / 50
    );
    
    while (this.prefixBuffer.length > bufferSize) {
      this.prefixBuffer.shift();
    }
    
    // Detect speech
    if (this.options.mode !== 'manual') {
      this.detectVoiceActivity(data.level, data.timestamp);
    }
  };

  /**
   * Start voice activity detection
   */
  public async startDetection(mediaStream: MediaStream): Promise<boolean> {
    if (this.isActive) {
      console.log('Voice activity detection already active');
      return true;
    }
    
    try {
      this.mediaStream = mediaStream;
      
      // Start audio analyzer
      const success = audioAnalyzerService.startAnalyzing(mediaStream);
      if (!success) {
        throw new Error('Failed to start audio analyzer');
      }
      
      // Reset state
      this.isSpeaking = false;
      this.wasSpeaking = false;
      this.speechStartTime = 0;
      this.lastVoiceActivityTime = Date.now();
      this.prefixBuffer = [];
      this.isActive = true;
      
      this.emit('detection:started');
      console.log('Voice activity detection started');
      
      return true;
    } catch (error) {
      console.error('Failed to start voice activity detection:', error);
      this.emit('error', { error, type: 'start_detection' });
      this.stopDetection();
      return false;
    }
  }

  /**
   * Stop voice activity detection
   */
  public stopDetection(): void {
    audioAnalyzerService.stopAnalyzing();
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    this.isSpeaking = false;
    this.isActive = false;
    this.mediaStream = null;
    this.prefixBuffer = [];
    
    this.emit('detection:stopped');
    console.log('Voice activity detection stopped');
  }

  /**
   * Detect voice activity based on audio level
   */
  private detectVoiceActivity(level: number, timestamp: number): void {
    const now = timestamp;
    const previousState = this.isSpeaking;
    
    // Detect voice activity based on level and threshold
    if (level >= this.threshold) {
      // Voice detected
      this.lastVoiceActivityTime = now;
      
      if (!this.isSpeaking) {
        // Start of speech
        this.isSpeaking = true;
        this.wasSpeaking = true;
        this.speechStartTime = now - (this.options.prefixPaddingMs || 500);
        
        // Clear any silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
        
        // Check if this is quick re-speak (< prefix padding time)
        if (now - this.speechStartTime < (this.options.prefixPaddingMs || 500)) {
          // Adjust start time to include prefix buffer
          this.adjustSpeechStartTime();
        }
        
        // Emit speaking started (with adjusted time)
        this.emitStateChange();
      }
    } else if (this.isSpeaking) {
      // Check if silence has persisted
      const silenceDuration = now - this.lastVoiceActivityTime;
      
      if (silenceDuration >= (this.options.silenceDurationMs || 1000)) {
        // End of speech due to silence duration
        this.endSpeech(now);
      } else if (!this.silenceTimer) {
        // Start silence timer
        this.silenceTimer = setTimeout(() => {
          if (this.isSpeaking) {
            this.endSpeech(Date.now());
          }
          this.silenceTimer = null;
        }, this.options.silenceDurationMs || 1000);
      }
    }
    
    // Always emit state if speaking state changed
    if (previousState !== this.isSpeaking) {
      this.emitStateChange();
    }
  }

  /**
   * Adjust speech start time based on prefix buffer
   */
  private adjustSpeechStartTime(): void {
    if (this.prefixBuffer.length === 0) return;
    
    // Find the earliest point in buffer with significant audio
    const minLevel = this.threshold * 0.5; // Lower threshold for buffer
    
    for (let i = 0; i < this.prefixBuffer.length; i++) {
      const entry = this.prefixBuffer[i];
      if (entry.level >= minLevel) {
        this.speechStartTime = entry.timestamp;
        break;
      }
    }
  }

  /**
   * End speech detection
   */
  private endSpeech(timestamp: number): void {
    // Check for minimum speech duration
    const speechDuration = timestamp - this.speechStartTime;
    
    if (speechDuration < (this.options.minSpeechDurationMs || 200)) {
      console.log('Speech too short, ignoring:', speechDuration, 'ms');
    }
    
    this.isSpeaking = false;
    this.emitStateChange(speechDuration);
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Emit state change event
   */
  private emitStateChange(duration?: number): void {
    const state: VoiceActivityState = {
      isSpeaking: this.isSpeaking,
      level: this.audioLevel,
      timestamp: Date.now(),
      wasSpeaking: this.wasSpeaking,
      duration
    };
    
    // Emit through internal EventEmitter for backward compatibility
    this.emit('state:changed', state);
    
    // Emit through the EventBus for wider application use
    eventBus.emit('voice:activity', {
      isSpeaking: state.isSpeaking,
      level: state.level,
      timestamp: state.timestamp,
      duration: state.duration
    });
    
    // Additional specialized events for starting/stopping speaking
    if (state.isSpeaking && !state.wasSpeaking) {
      eventBus.emit('voice:started', { timestamp: state.timestamp });
    } else if (!state.isSpeaking && state.wasSpeaking && duration) {
      eventBus.emit('voice:stopped', { 
        timestamp: state.timestamp,
        duration
      });
    }
    
    // Notify callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in voice activity callback:', error);
      }
    });
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
    
    // Update threshold based on mode
    if (options.threshold) {
      this.threshold = options.threshold;
    } else if (options.mode === 'sensitive') {
      this.threshold = 0.15;
    } else if (options.mode === 'auto') {
      this.threshold = 0.25;
    } else if (options.mode === 'manual') {
      this.threshold = 0.3;
    }
    
    this.emit('options:updated', this.options);
  }

  /**
   * Get the current voice activity state
   */
  public getState(): VoiceActivityState {
    return {
      isSpeaking: this.isSpeaking,
      level: this.audioLevel,
      timestamp: Date.now(),
      wasSpeaking: this.wasSpeaking
    };
  }

  /**
   * Set speaking state manually (for manual mode)
   */
  public setSpeaking(isSpeaking: boolean): void {
    if (this.options.mode === 'manual') {
      const previousState = this.isSpeaking;
      this.isSpeaking = isSpeaking;
      
      if (isSpeaking && !previousState) {
        // Starting speech
        this.speechStartTime = Date.now();
      } else if (!isSpeaking && previousState) {
        // Ending speech
        const duration = Date.now() - this.speechStartTime;
        this.emitStateChange(duration);
      }
      
      if (previousState !== isSpeaking) {
        this.emitStateChange();
      }
    }
  }

  /**
   * Is the detector currently active
   */
  public isDetecting(): boolean {
    return this.isActive;
  }

  /**
   * Get the current threshold level
   */
  public getThreshold(): number {
    return this.threshold;
  }

  /**
   * Get the current options
   */
  public getOptions(): VoiceActivityOptions {
    return { ...this.options };
  }
}

// Export singleton instance
const voiceActivityDetector = VoiceActivityDetector.getInstance();
export default voiceActivityDetector; 