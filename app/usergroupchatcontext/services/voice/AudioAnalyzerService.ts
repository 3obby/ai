/**
 * AudioAnalyzerService
 * 
 * Responsible for analyzing audio streams to detect voice activity,
 * measure audio levels, and provide realtime audio metrics.
 */

import { EventEmitter } from 'events';
import audioContextManager from './AudioContextManager';

export interface AudioAnalyzerOptions {
  fftSize?: number;               // Size of FFT (power of 2), default: 1024
  smoothingTimeConstant?: number; // 0-1, default: 0.5
  minDecibels?: number;           // Default: -100
  maxDecibels?: number;           // Default: -30
  frequencyRange?: {
    min: number;                  // Lower frequency bound in Hz, default: 85
    max: number;                  // Upper frequency bound in Hz, default: 255
  }
}

export interface AudioLevelData {
  level: number;                // Overall audio level (0-1)
  peak: number;                 // Peak audio level (0-1)
  frequencyData: Uint8Array;    // Raw frequency data
  timeData: Uint8Array;         // Raw time domain data 
  timestamp: number;            // Timestamp of the measurement
}

export class AudioAnalyzerService extends EventEmitter {
  private static instance: AudioAnalyzerService;
  
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isAnalyzing: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;
  
  private options: AudioAnalyzerOptions = {
    fftSize: 1024,
    smoothingTimeConstant: 0.5,
    minDecibels: -100,
    maxDecibels: -30,
    frequencyRange: {
      min: 85,  // Lower frequency for voice
      max: 255  // Upper frequency for voice
    }
  };

  private constructor() {
    super();
  }

  /**
   * Get the singleton instance of AudioAnalyzerService
   */
  public static getInstance(): AudioAnalyzerService {
    if (!AudioAnalyzerService.instance) {
      AudioAnalyzerService.instance = new AudioAnalyzerService();
    }
    return AudioAnalyzerService.instance;
  }

  /**
   * Initialize the audio analyzer with options
   */
  public initialize(options?: Partial<AudioAnalyzerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Start analyzing the provided media stream
   */
  public startAnalyzing(mediaStream: MediaStream): boolean {
    if (this.isAnalyzing) {
      console.log('Already analyzing audio');
      return true;
    }

    const audioContext = audioContextManager.getAudioContext();
    if (!audioContext) {
      console.error('AudioContext not initialized');
      this.emit('error', { message: 'AudioContext not initialized' });
      return false;
    }

    try {
      // Create analyzer node
      this.analyser = audioContext.createAnalyser();
      this.analyser.fftSize = this.options.fftSize || 1024;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant || 0.5;
      this.analyser.minDecibels = this.options.minDecibels || -100;
      this.analyser.maxDecibels = this.options.maxDecibels || -30;

      // Initialize data arrays
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);

      // Create source from media stream and connect to analyzer
      this.source = audioContext.createMediaStreamSource(mediaStream);
      this.source.connect(this.analyser);

      // Start polling for audio data
      this.startPolling();
      
      this.isAnalyzing = true;
      this.emit('analyzing:started');
      
      return true;
    } catch (error) {
      console.error('Failed to start audio analyzer:', error);
      this.emit('error', { error, type: 'analyzer_start' });
      this.stopAnalyzing();
      return false;
    }
  }

  /**
   * Stop analyzing audio
   */
  public stopAnalyzing(): void {
    this.stopPolling();
    
    // Disconnect and clean up
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    this.analyser = null;
    this.frequencyData = null;
    this.timeData = null;
    this.isAnalyzing = false;
    
    this.emit('analyzing:stopped');
  }

  /**
   * Start polling for audio data
   */
  private startPolling(intervalMs: number = 50): void {
    this.stopPolling();
    
    this.pollingInterval = setInterval(() => {
      const data = this.captureAudioData();
      if (data) {
        this.emit('audio:data', data);
      }
    }, intervalMs);
  }

  /**
   * Stop polling for audio data
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Capture current audio data
   */
  private captureAudioData(): AudioLevelData | null {
    if (!this.analyser || !this.frequencyData || !this.timeData) {
      return null;
    }
    
    // Get frequency and time domain data
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeData);
    
    // Calculate overall level
    let sum = 0;
    let peak = 0;
    
    // Focus on the frequency range most relevant to human voice
    // Convert Hz to FFT bin index
    const binCount = this.analyser.frequencyBinCount;
    const sampleRate = audioContextManager.getAudioContext()?.sampleRate || 48000;
    
    const minBin = Math.floor((this.options.frequencyRange?.min || 85) * binCount / (sampleRate / 2));
    const maxBin = Math.ceil((this.options.frequencyRange?.max || 255) * binCount / (sampleRate / 2));
    
    // Calculate average and peak values, focusing on voice frequency range
    for (let i = minBin; i < maxBin; i++) {
      sum += this.frequencyData[i];
      peak = Math.max(peak, this.frequencyData[i]);
    }
    
    // Normalize to 0-1 range (0-255 byte data)
    const avgLevel = sum / (maxBin - minBin) / 255;
    const peakLevel = peak / 255;
    
    return {
      level: avgLevel,
      peak: peakLevel,
      frequencyData: this.frequencyData,
      timeData: this.timeData,
      timestamp: Date.now()
    };
  }

  /**
   * Get the current audio level (0-1)
   */
  public getCurrentLevel(): number {
    if (!this.analyser || !this.frequencyData) {
      return 0;
    }
    
    const data = this.captureAudioData();
    return data ? data.level : 0;
  }

  /**
   * Is the service currently analyzing
   */
  public isActive(): boolean {
    return this.isAnalyzing;
  }
}

// Export singleton instance
const audioAnalyzerService = AudioAnalyzerService.getInstance();
export default audioAnalyzerService; 