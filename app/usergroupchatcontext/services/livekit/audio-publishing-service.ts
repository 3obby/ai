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
      // Create AudioContext if it doesn't exist
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
        } else {
          console.warn('AudioContext not supported in this browser');
          return false;
        }
      }
      
      // Resume the AudioContext if it's in suspended state
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('AudioContext resumed successfully');
      }
      
      return this.audioContext.state === 'running';
    } catch (error) {
      console.error('Error resuming AudioContext:', error);
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
      const response = await fetch('/usergroupchatcontext/api/livekit-token');
      if (!response.ok) {
        throw new Error(`Failed to get LiveKit token: ${response.status}`);
      }
      
      const tokenData = await response.json();
      if (!tokenData?.token) {
        throw new Error('No token received from LiveKit token API');
      }
      
      // Get LiveKit URL
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured in environment variables');
      }
      
      // Create a new LiveKit session
      const roomName = tokenData.roomName || 'default-room';
      await roomSessionManager.createSession(roomName, tokenData.token, livekitUrl);
      
      console.log('LiveKit connection established successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize LiveKit connection:', error);
      return false;
    }
  }

  /**
   * Subscribe to audio publishing events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from audio publishing events
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  /**
   * Update audio publishing options
   */
  public updateOptions(options: Partial<AudioPublishingOptions>): void {
    const prevOptions = this.options;
    this.options = { ...this.options, ...options };
    
    // If we're currently publishing and key options have changed,
    // we need to restart the audio publishing
    if (this.isPublishing) {
      const needsRestart = options.enhancedAudioProcessing !== undefined ||
                          options.audioSampleRate !== undefined ||
                          options.channelCount !== undefined ||
                          options.echoCancellation !== undefined ||
                          options.noiseSuppression !== undefined ||
                          options.autoGainControl !== undefined;
      
      if (needsRestart) {
        console.log('Audio options changed, restarting audio publishing...');
        this.setupAudioProcessing();
        this.stopPublishing();
        this.startPublishing(); // Don't await as this is just a restart
      }
    } else {
      // Just update the configuration for future use
      this.setupAudioProcessing();
    }
    
    console.log('Updated audio publishing options:', {
      previous: prevOptions,
      current: this.options
    });
  }
}

// Create a singleton instance
const audioPublishingService = new AudioPublishingService();
export default audioPublishingService; 