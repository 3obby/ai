import { AudioTrack } from 'livekit-client';
import roomSessionManager from './room-session-manager';
import voiceActivityService, { VoiceActivityState } from './voice-activity-service';
import { EventEmitter } from 'events';
import voiceToolCallingService from '../voiceToolCallingService';
import { ToolDefinition } from '../../types/bots';
import livekitService from './livekit-service';

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
  private isSynthesizing: boolean = false;
  private synthQueue: Array<{ text: string; options: { voice?: string; speed?: number; } }> = [];
  private emitter: EventEmitter = new EventEmitter();
  private currentAudioLevel: number = 0;
  private isProcessingToolCall: boolean = false;
  private availableTools: ToolDefinition[] = [];
  private interimTranscriptionTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the multimodal agent with the given configuration
   */
  public initialize(config: Partial<MultimodalAgentConfig> = {}): void {
    this.config = { ...this.config, ...config };
    
    // Initialize voice activity service with our VAD options
    voiceActivityService.initialize(this.config.vadOptions);
    
    // Set up listeners for tool calling events
    voiceToolCallingService.on('voiceTool:executed', this.handleToolExecution);
    voiceToolCallingService.on('voiceTool:error', this.handleToolError);
    
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
        console.error('No active LiveKit session. Please make sure LiveKit is properly initialized and connected.');
        console.log('Debug info:', {
          roomSessionManagerExists: !!roomSessionManager,
          livekitServiceExists: !!livekitService,
          livekitRoomExists: !!livekitService.getRoom(),
          livekitRoomState: livekitService.getRoom()?.state,
          livekitURL: process.env.NEXT_PUBLIC_LIVEKIT_URL
        });
        return false;
      }

      this.activeRoomName = session.roomName;
      
      // Enable local audio in the room session
      console.log('Enabling local audio...');
      const audioTrack = await roomSessionManager.enableLocalAudio();
      if (!audioTrack) {
        console.error('Failed to enable local audio. Check microphone permissions and browser compatibility.');
        return false;
      }

      this.localAudioTrack = audioTrack;
      
      // Start voice activity detection
      console.log('Starting voice activity detection...');
      await voiceActivityService.startDetection(audioTrack);
      
      // Register for voice activity events
      voiceActivityService.onVoiceActivity(this.handleVoiceActivity);
      
      this.isListening = true;
      console.log('Started listening for speech input');
      return true;
    } catch (error) {
      console.error('Error starting speech input:', error);
      console.log('Error details:', {
        errorName: error instanceof Error ? error.name : 'Unknown error type',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        livekitState: livekitService.getRoom()?.state,
        browserUserMedia: !!navigator.mediaDevices?.getUserMedia,
        livekitURL: process.env.NEXT_PUBLIC_LIVEKIT_URL
      });
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
    // Store the current audio level for visualization
    this.currentAudioLevel = state.level || 0;
    
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
    // For testing purposes, log that we're starting speech processing
    console.log('Starting speech processing with real transcription...');
    
    // Send an empty interim transcription to indicate we're processing
    this.notifyTranscriptionHandlers('', false);
    
    // Set up a timer to simulate interim results
    this.interimTranscriptionTimer = setInterval(() => {
      this.notifyTranscriptionHandlers('Processing...', false);
    }, 1000);
  }

  /**
   * Finalize speech processing
   */
  private finalizeSpeechProcessing(): void {
    // Clear any interim transcription timer
    if (this.interimTranscriptionTimer) {
      clearInterval(this.interimTranscriptionTimer);
      this.interimTranscriptionTimer = null;
    }
    
    console.log('Finalizing speech processing with test transcription...');
    
    // For testing, use a real message instead of a placeholder
    this.notifyTranscriptionHandlers('Testing voice input', true);
  }

  /**
   * Notify all transcription handlers
   */
  private notifyTranscriptionHandlers(text: string, isFinal: boolean): void {
    // Call all registered transcription handlers
    for (const handler of this.transcriptionHandlers) {
      handler(text, isFinal);
    }

    // Process for potential tool calls if this is a final transcription
    if (isFinal) {
      this.processTranscriptionForTools(text, isFinal);
    }
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

  /**
   * Subscribe to speech synthesis events
   * @param event Event type
   * @param listener Event listener
   */
  public onSynthesisEvent(event: 'synthesis:start' | 'synthesis:complete' | 'synthesis:error', listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from speech synthesis events
   * @param event Event type
   * @param listener Event listener
   */
  public offSynthesisEvent(event: 'synthesis:start' | 'synthesis:complete' | 'synthesis:error', listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  /**
   * Get the current audio input level (0-1 range)
   * Returns 0 if not listening
   */
  public getAudioLevel(): number {
    if (!this.isListening) return 0;
    
    // If we have actual audio level data, use it
    if (this.currentAudioLevel > 0) {
      return this.currentAudioLevel;
    }
    
    // Otherwise, return 0 since we don't have access to the voice activity service's level
    return 0;
  }

  /**
   * Set available tools for voice tool detection
   */
  public setAvailableTools(tools: ToolDefinition[]): void {
    this.availableTools = tools;
    console.log('Updated available tools for voice detection:', 
      tools.map(t => t.name).join(', '));
  }

  // Handle successful tool execution
  private handleToolExecution = (result: any) => {
    this.isProcessingToolCall = false;
    this.emitter.emit('tool:executed', result);
  }

  // Handle tool execution error
  private handleToolError = (error: any) => {
    this.isProcessingToolCall = false;
    this.emitter.emit('tool:error', error);
  }

  // Process transcribed text for potential tool calls
  private async processTranscriptionForTools(text: string, isFinal: boolean): Promise<void> {
    // Only process final transcriptions for tool calls
    if (!isFinal || this.availableTools.length === 0) return;
    
    try {
      // Process the voice input to check for tool calls
      const toolProcessingResult = await voiceToolCallingService.processVoiceInput(
        text,
        this.availableTools
      );
      
      // If this was identified as a tool call with high confidence
      if (toolProcessingResult.isToolCall && toolProcessingResult.toolResults) {
        this.isProcessingToolCall = true;
        
        // Emit event with tool results
        this.emitter.emit('transcription:toolCall', {
          text,
          toolResults: toolProcessingResult.toolResults,
          detectedTools: toolProcessingResult.detectedTools
        });
        
        // If no high confidence tool calls but we detected possible tools
      } else if (toolProcessingResult.isToolCall && toolProcessingResult.detectedTools.length > 0) {
        // Emit event with detected tools for confirmation
        this.emitter.emit('transcription:potentialToolCall', {
          text,
          detectedTools: toolProcessingResult.detectedTools
        });
      }
    } catch (error) {
      console.error('Error processing transcription for tools:', error);
    }
  }

  /**
   * Add listener for tool-related events
   */
  public onToolEvent(
    event: 'tool:executed' | 'tool:error' | 'transcription:toolCall' | 'transcription:potentialToolCall',
    listener: (data: any) => void
  ): void {
    this.emitter.on(event, listener);
  }

  /**
   * Remove listener for tool-related events
   */
  public offToolEvent(
    event: 'tool:executed' | 'tool:error' | 'transcription:toolCall' | 'transcription:potentialToolCall',
    listener: (data: any) => void
  ): void {
    this.emitter.off(event, listener);
  }

  /**
   * Remove event listener
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  /**
   * Resume AudioContext after user interaction
   * This should be called in response to a user gesture (click, tap, etc.)
   */
  public async resumeAudioContext(): Promise<boolean> {
    return await voiceActivityService.resumeAudioContext();
  }
}

// Create a singleton instance
const multimodalAgentService = new MultimodalAgentService();
export default multimodalAgentService; 