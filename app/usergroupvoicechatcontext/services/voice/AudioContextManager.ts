/**
 * AudioContextManager
 * 
 * Responsible for managing and initializing the AudioContext,
 * which is required for working with Web Audio API.
 */

import { EventEmitter } from 'events';

export interface AudioContextOptions {
  sampleRate?: number;
  latencyHint?: 'interactive' | 'playback' | 'balanced' | number;
}

export class AudioContextManager extends EventEmitter {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private isInitialized: boolean = false;
  private resumeAttempted: boolean = false;
  private lastResumeTimestamp: number = 0;
  private options: AudioContextOptions = {
    sampleRate: 48000,
    latencyHint: 'interactive'
  };

  private constructor() {
    super();
  }

  /**
   * Get the singleton instance of AudioContextManager
   */
  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  /**
   * Initialize the AudioContext with options
   */
  public initialize(options?: AudioContextOptions): void {
    if (this.isInitialized) return;

    this.options = { ...this.options, ...options };
    this.createAudioContext();
    this.isInitialized = true;
    this.emit('initialized', { context: this.audioContext });
  }

  /**
   * Create the AudioContext
   */
  private createAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.options.sampleRate,
        latencyHint: this.options.latencyHint
      });
      
      if (this.audioContext) {
        console.log('AudioContext created with state:', this.audioContext.state);
        
        // Add state change event listener
        this.audioContext.addEventListener('statechange', () => {
          if (this.audioContext) {
            console.log('AudioContext state changed to:', this.audioContext.state);
            this.emit('statechange', { state: this.audioContext.state });
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to create AudioContext:', error);
      this.emit('error', { error, type: 'creation' });
    }
  }

  /**
   * Resume the AudioContext
   * Required by browsers before audio processing can begin
   * Must be called from a user gesture (click, tap, etc.)
   */
  public async resumeAudioContext(): Promise<boolean> {
    if (!this.audioContext) {
      console.error('Cannot resume AudioContext: not initialized');
      return false;
    }

    const currentState = this.audioContext.state;
    
    // If already running, no need to resume
    if (currentState === 'running') {
      console.log('AudioContext already running');
      return true;
    }
    
    // If closed, we can't resume
    if (currentState === 'closed') {
      console.log('AudioContext is closed and cannot be resumed');
      return false;
    }

    // Prevent multiple rapid resume attempts
    const now = Date.now();
    if (this.resumeAttempted && (now - this.lastResumeTimestamp < 1000)) {
      console.log('Resume recently attempted, waiting before retry');
      return false;
    }

    this.resumeAttempted = true;
    this.lastResumeTimestamp = now;

    try {
      console.log('Attempting to resume AudioContext...');
      await this.audioContext.resume();
      
      if (this.audioContext.state === 'running') {
        console.log('AudioContext resumed successfully');
        this.emit('resumed');
        return true;
      } else {
        console.warn('Failed to resume AudioContext: still in state', this.audioContext.state);
        this.emit('resume:failed', { state: this.audioContext.state });
        return false;
      }
    } catch (error) {
      console.error('Error resuming AudioContext:', error);
      this.emit('error', { error, type: 'resume' });
      return false;
    }
  }

  /**
   * Close the AudioContext to free up resources
   */
  public async closeAudioContext(): Promise<void> {
    if (!this.audioContext) return;
    
    try {
      // State can be "suspended", "running", or "closed"
      if (this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        console.log('AudioContext closed');
        this.emit('closed');
      }
    } catch (error) {
      console.error('Error closing AudioContext:', error);
      this.emit('error', { error, type: 'close' });
    } finally {
      this.audioContext = null;
      this.isInitialized = false;
      this.resumeAttempted = false;
    }
  }

  /**
   * Get the AudioContext instance
   */
  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get the current state of the AudioContext
   */
  public getState(): 'suspended' | 'running' | 'closed' | 'not_initialized' {
    return this.audioContext ? this.audioContext.state : 'not_initialized';
  }

  /**
   * Check if the AudioContext is running
   */
  public isRunning(): boolean {
    return this.audioContext?.state === 'running';
  }

  /**
   * Check if the AudioContext is available in this browser
   */
  public static isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }
}

// Export singleton instance
const audioContextManager = AudioContextManager.getInstance();
export default audioContextManager; 