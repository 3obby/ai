import { AudioTrack } from 'livekit-client';
import roomSessionManager from './room-session-manager';
import voiceActivityService, { VoiceActivityState } from './voice-activity-service';

// Interface for the configuration of the multimodal agent
export interface MultimodalAgentConfig {
  model: string;
  voice: string;
  voiceSpeed?: number;
  vadOptions?: {
    mode: 'auto' | 'sensitive' | 'manual';
    threshold?: number;
    silenceDuration?: number;
  };
  turnDetectionOptions?: {
    threshold?: number;
    silenceDuration?: number;
  };
}

// Type for transcription handlers
export type TranscriptionHandler = (text: string, isFinal: boolean) => void;

// Type for audio data handlers
export type AudioOutputHandler = (audioChunk: ArrayBuffer) => void;

/**
 * Service to manage multimodal interactions between LiveKit and OpenAI
 */
export class MultimodalAgentService {
  private config: MultimodalAgentConfig = {
    model: 'gpt-4o',
    voice: 'nova',
    voiceSpeed: 1.0,
    vadOptions: {
      mode: 'auto',
      threshold: 0.3,
      silenceDuration: 1000
    },
    turnDetectionOptions: {
      threshold: 0.3,
      silenceDuration: 1500
    }
  };

  private isListening: boolean = false;
  private isProcessing: boolean = false;
  private transcriptionHandlers: TranscriptionHandler[] = [];
  private audioOutputHandlers: AudioOutputHandler[] = [];
  private localAudioTrack: AudioTrack | null = null;
  private activeRoomName: string | null = null;

  /**
   * Initialize the multimodal agent with the given configuration
   */
  public initialize(config: Partial<MultimodalAgentConfig> = {}): void {
    this.config = { ...this.config, ...config };
    
    // Initialize voice activity service with our VAD options
    voiceActivityService.initialize(this.config.vadOptions);
    
    console.log('Multimodal agent initialized with config:', this.config);
  }

  /**
   * Start listening for speech input
   */
  public async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('Already listening');
      return true;
    }

    try {
      // Get active session
      const session = roomSessionManager.getActiveSession();
      if (!session) {
        console.error('No active LiveKit session');
        return false;
      }

      this.activeRoomName = session.roomName;
      
      // Enable local audio in the room session
      const audioTrack = await roomSessionManager.enableLocalAudio();
      if (!audioTrack) {
        console.error('Failed to enable local audio');
        return false;
      }

      this.localAudioTrack = audioTrack;
      
      // Start voice activity detection
      await voiceActivityService.startDetection(audioTrack);
      
      // Register for voice activity events
      voiceActivityService.onVoiceActivity(this.handleVoiceActivity);
      
      this.isListening = true;
      console.log('Started listening for speech input');
      return true;
    } catch (error) {
      console.error('Error starting speech input:', error);
      this.stopListening();
      return false;
    }
  }

  /**
   * Stop listening for speech input
   */
  public stopListening(): void {
    if (!this.isListening) return;
    
    // Stop voice activity detection
    voiceActivityService.stopDetection();
    voiceActivityService.offVoiceActivity(this.handleVoiceActivity);
    
    // Disable local audio in the room session
    if (this.activeRoomName) {
      roomSessionManager.disableLocalAudio();
    }
    
    this.localAudioTrack = null;
    this.isListening = false;
    console.log('Stopped listening for speech input');
  }

  /**
   * Register a handler for transcription results
   */
  public onTranscription(handler: TranscriptionHandler): void {
    this.transcriptionHandlers.push(handler);
  }

  /**
   * Remove a transcription handler
   */
  public offTranscription(handler: TranscriptionHandler): void {
    const index = this.transcriptionHandlers.indexOf(handler);
    if (index !== -1) {
      this.transcriptionHandlers.splice(index, 1);
    }
  }

  /**
   * Register a handler for audio output
   */
  public onAudioOutput(handler: AudioOutputHandler): void {
    this.audioOutputHandlers.push(handler);
  }

  /**
   * Remove an audio output handler
   */
  public offAudioOutput(handler: AudioOutputHandler): void {
    const index = this.audioOutputHandlers.indexOf(handler);
    if (index !== -1) {
      this.audioOutputHandlers.splice(index, 1);
    }
  }

  /**
   * Synthesize speech from text
   */
  public async synthesizeSpeech(text: string, options: {
    voice?: string;
    speed?: number;
  } = {}): Promise<void> {
    const voice = options.voice || this.config.voice;
    const speed = options.speed || this.config.voiceSpeed;
    
    try {
      // This will be implemented using OpenAI TTS API integration
      console.log(`Synthesizing speech: "${text}" using voice ${voice} at speed ${speed}`);
      
      // TODO: Implement actual TTS via OpenAI
      // For now, logging placeholder for eventual integration
      
      // Notify handlers (would normally be done with actual audio chunks)
      // this.notifyAudioOutputHandlers(audioChunk);
    } catch (error) {
      console.error('Error synthesizing speech:', error);
    }
  }

  /**
   * Process the next item in the speech synthesis queue
   */
  private processNextSynthesisItem = async (): Promise<void> => {
    if (this.synthQueue.length === 0 || this.isSynthesizing) {
      return;
    }

    const nextItem = this.synthQueue.shift();
    if (nextItem) {
      await this.synthesizeSpeech(nextItem.text, nextItem.options);
    }
  };

  /**
   * Handle voice activity detection events
   */
  private handleVoiceActivity = (state: VoiceActivityState): void => {
    // Log speaking state changes
    if (state.isSpeaking && !this.isProcessing) {
      console.log('Speech detected, starting processing');
      this.isProcessing = true;
      this.startSpeechProcessing();
    } else if (!state.isSpeaking && this.isProcessing) {
      console.log('Speech ended, finalizing processing');
      const silenceDuration = Date.now() - state.timestamp;
      
      // Only end if silence duration exceeds threshold
      if (silenceDuration >= (this.config.turnDetectionOptions?.silenceDuration || 1500)) {
        this.isProcessing = false;
        this.finalizeSpeechProcessing();
      }
    }
  };

  /**
   * Start processing speech
   */
  private startSpeechProcessing(): void {
    // Placeholder - will be implemented with OpenAI API integration
    // This is where we would start streaming audio to OpenAI's Whisper API
    console.log('Starting speech processing...');
    
    // Send interim transcription updates
    this.notifyTranscriptionHandlers('', false);
  }

  /**
   * Finalize speech processing
   */
  private finalizeSpeechProcessing(): void {
    // Placeholder - will be implemented with OpenAI API integration
    // This is where we would finalize the transcription from OpenAI's API
    console.log('Finalizing speech processing...');
    
    // Send final transcription
    this.notifyTranscriptionHandlers('Example transcription', true);
  }

  /**
   * Notify all transcription handlers
   */
  private notifyTranscriptionHandlers(text: string, isFinal: boolean): void {
    this.transcriptionHandlers.forEach(handler => {
      try {
        handler(text, isFinal);
      } catch (error) {
        console.error('Error in transcription handler:', error);
      }
    });
  }

  /**
   * Notify all audio output handlers
   */
  private notifyAudioOutputHandlers(audioChunk: ArrayBuffer): void {
    this.audioOutputHandlers.forEach(handler => {
      try {
        handler(audioChunk);
      } catch (error) {
        console.error('Error in audio output handler:', error);
      }
    });
  }
}

// Create a singleton instance
const multimodalAgentService = new MultimodalAgentService();
export default multimodalAgentService; 