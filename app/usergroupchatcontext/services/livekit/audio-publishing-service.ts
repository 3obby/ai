import { AudioTrack } from 'livekit-client';
import { EventEmitter } from 'events';
import roomSessionManager from './room-session-manager';
import livekitService from './livekit-service';

export interface AudioPublishingOptions {
  enhancedAudioProcessing?: boolean;
  audioSampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

/**
 * AudioPublishingService handles audio track publishing and management
 * with LiveKit integration
 */
export class AudioPublishingService {
  private localAudioTrack: AudioTrack | null = null;
  private emitter: EventEmitter = new EventEmitter();
  private audioContext: AudioContext | null = null;
  private isPublishing: boolean = false;
  private options: AudioPublishingOptions = {
    enhancedAudioProcessing: true,
    audioSampleRate: 48000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };

  /**
   * Initialize the audio publishing service
   */
  public initialize(options: Partial<AudioPublishingOptions> = {}): void {
    this.options = { ...this.options, ...options };
    this.setupAudioProcessing();
    console.log('Audio publishing service initialized with options:', this.options);
  }

  /**
   * Configure audio processing settings
   */
  private setupAudioProcessing(): void {
    if (typeof window !== 'undefined' && this.options.enhancedAudioProcessing) {
      // Set up audio processing constraints
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: this.options.echoCancellation,
        noiseSuppression: this.options.noiseSuppression,
        autoGainControl: this.options.autoGainControl,
        sampleRate: this.options.audioSampleRate,
        channelCount: this.options.channelCount
      };
      
      // Store these constraints for later use when starting the audio
      (window as any).__enhancedAudioConstraints = audioConstraints;
      
      console.log('Enhanced audio processing configured:', audioConstraints);
    }
  }

  /**
   * Start publishing audio track to LiveKit
   */
  public async startPublishing(): Promise<AudioTrack | null> {
    if (this.isPublishing) {
      console.log('Already publishing audio');
      return this.localAudioTrack;
    }

    try {
      // Ensure AudioContext is resumed first
      await this.resumeAudioContext();
      
      // Check if LiveKit connection exists
      const isConnected = await this.ensureLiveKitConnection();
      if (!isConnected) {
        throw new Error('Failed to establish LiveKit connection');
      }

      // Get audio constraints
      const audioConstraints = this.options.enhancedAudioProcessing ? 
        (window as any).__enhancedAudioConstraints : undefined;
      
      // Try to enable local audio with retries
      let audioTrackAttempts = 0;
      const maxAudioTrackAttempts = 3;
      let audioTrack;
      
      while (!audioTrack && audioTrackAttempts < maxAudioTrackAttempts) {
        try {
          // Use enableLocalAudio without arguments as per the API
          audioTrack = await roomSessionManager.enableLocalAudio();
          if (audioTrack) {
            console.log('Successfully enabled local audio track');
            break;
          } else {
            throw new Error('Failed to get audio track');
          }
        } catch (audioError) {
          audioTrackAttempts++;
          console.error(`Error enabling audio (attempt ${audioTrackAttempts}/${maxAudioTrackAttempts}):`, audioError);
          
          if (audioTrackAttempts >= maxAudioTrackAttempts) {
            throw new Error('Failed to enable audio after multiple attempts');
          }
          
          // Wait before retry with increasing delay
          const delay = Math.min(1000 * audioTrackAttempts, 3000);
          console.log(`Waiting ${delay}ms before retrying audio setup...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      if (!audioTrack) {
        throw new Error('Failed to enable local audio. Check microphone permissions and browser compatibility.');
      }

      this.localAudioTrack = audioTrack;
      this.isPublishing = true;
      
      this.emitter.emit('publishing-started', { 
        track: audioTrack,
        timestamp: Date.now() 
      });
      
      return audioTrack;
    } catch (error) {
      console.error('Error starting audio publishing:', error);
      this.emitter.emit('publishing-error', { 
        error,
        timestamp: Date.now()
      });
      return null;
    }
  }

  /**
   * Stop publishing audio track
   */
  public stopPublishing(): void {
    if (!this.isPublishing) return;
    
    try {
      roomSessionManager.disableLocalAudio();
      this.localAudioTrack = null;
      this.isPublishing = false;
      
      this.emitter.emit('publishing-stopped', {
        timestamp: Date.now()
      });
      
      console.log('Stopped audio publishing');
    } catch (error) {
      console.error('Error stopping audio publishing:', error);
    }
  }

  /**
   * Get the current audio track
   */
  public getAudioTrack(): AudioTrack | null {
    return this.localAudioTrack;
  }

  /**
   * Check if currently publishing
   */
  public isCurrentlyPublishing(): boolean {
    return this.isPublishing;
  }

  /**
   * Resume AudioContext after user interaction
   * This should be called in response to a user gesture (click, tap, etc.)
   */
  public async resumeAudioContext(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      console.log('Attempting to resume AudioContext...');
      
      // Create AudioContext if it doesn't exist
      if (!this.audioContext) {
        console.log('AudioContext does not exist, creating a new one...');
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
          console.log('New AudioContext created with state:', this.audioContext.state);
        } else {
          console.warn('AudioContext not supported in this browser');
          return false;
        }
      } else {
        console.log('Existing AudioContext found with state:', this.audioContext.state);
      }
      
      // If we have a suspended context, try to resume it
      if (this.audioContext.state === 'suspended') {
        console.log('AudioContext is suspended, attempting to resume...');
        try {
          await this.audioContext.resume();
          console.log('AudioContext resume() called, new state:', this.audioContext.state);
        } catch (resumeError) {
          console.error('Error resuming existing AudioContext:', resumeError);
          
          // If resume fails, try creating a new context
          console.log('Attempting to create a new AudioContext after resume failure...');
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            this.audioContext = new AudioContext();
            console.log('New replacement AudioContext created with state:', this.audioContext.state);
          }
        }
      }
      
      // Check final state
      const finalState = this.audioContext.state;
      console.log('Final AudioContext state:', finalState);
      return finalState === 'running';
    } catch (error) {
      console.error('Error managing AudioContext:', error);
      return false;
    }
  }

  /**
   * Ensure LiveKit is connected
   */
  private async ensureLiveKitConnection(): Promise<boolean> {
    // Check if LiveKit is already connected
    if (livekitService.getRoom()?.state === 'connected') {
      console.log('LiveKit connection already established');
      return true;
    }
    
    // If not connected, try to initialize the connection
    try {
      console.log('Attempting to initialize LiveKit connection...');
      
      // Get a token for LiveKit connection
      const response = await fetch('/usergroupchatcontext/api/livekit-token/');
      if (!response.ok) {
        throw new Error(`Failed to get LiveKit token: ${response.status}`);
      }

      // If connected, return true
      return true;
    } catch (error) {
      console.error('Error ensuring LiveKit connection:', error);
      return false;
    }
  }
}