import { AudioTrack } from 'livekit-client';
import roomSessionManager from './room-session-manager';
import voiceActivityService, { VoiceActivityState } from './voice-activity-service';
import { EventEmitter } from 'events';
import voiceToolCallingService from '../voiceToolCallingService';
import { ToolDefinition } from '../../types/bots';
import livekitService from './livekit-service';
import audioPublishingService from './audio-publishing-service';
import transcriptionManager from './transcription-manager';
import speechSynthesisService from './speech-synthesis-service';
import toolDetectionService from './tool-detection-service';

// Interface for the configuration of the multimodal agent
export interface MultimodalAgentConfig {
  model: string;
  voice: string;
  voiceSpeed?: number;
  voiceQuality?: 'standard' | 'high-quality';
  preferredVoices?: string[];
  vadOptions?: {
    mode: 'auto' | 'sensitive' | 'manual';
    threshold?: number;
    silenceDuration?: number;
  };
  turnDetectionOptions?: {
    threshold?: number;
    silenceDuration?: number;
    createResponse?: boolean;
  };
  preventEchoDetection?: boolean;
  enhancedAudioProcessing?: boolean;
  audioSampleRate?: number;
  muteMicDuringPlayback?: boolean;
}

// Type for transcription handlers
export type TranscriptionHandler = (text: string, isFinal: boolean) => void;

// Type for audio data handlers
export type AudioOutputHandler = (audioChunk: ArrayBuffer) => void;

/**
 * Service to manage multimodal interactions between LiveKit and OpenAI
 * Acts as an orchestrator for specialized services:
 * - TranscriptionManager: Handles speech recognition and transcription
 * - AudioPublishingService: Manages audio track publishing
 * - SpeechSynthesisService: Handles text-to-speech functionality
 * - ToolDetectionService: Handles tool detection from voice input
 */
export class MultimodalAgentService {
  private config: MultimodalAgentConfig = {
    model: 'gpt-4o',
    voice: 'alloy',
    voiceSpeed: 1.0,
    voiceQuality: 'high-quality',
    preferredVoices: ['ash', 'coral'],
    vadOptions: {
      mode: 'auto',
      threshold: 0.3,
      silenceDuration: 1000
    },
    turnDetectionOptions: {
      threshold: 0.3,
      silenceDuration: 1500
    },
    preventEchoDetection: true,
    enhancedAudioProcessing: true,
    audioSampleRate: 48000,
    muteMicDuringPlayback: true
  };

  private isListening: boolean = false;
  private isProcessing: boolean = false;
  private emitter: EventEmitter = new EventEmitter();
  private latestOpenAIModel: string = 'gpt-4o';
  private latestRealtimeModel: string = 'gpt-4o-realtime-preview-2024-12-17';
  private _connected: boolean = false;
  private _isSpeaking: boolean = false;
  private _isMicMuted: boolean = false;

  /**
   * Initialize the multimodal agent with the given configuration
   */
  public initialize(config: Partial<MultimodalAgentConfig> = {}): void {
    // Try to get the latest OpenAI model version
    this.fetchLatestModelVersions();
    
    // Use latest realtime models by default if not specified
    const defaultConfig = {
      ...this.config,
      model: config.model || this.latestRealtimeModel || 'gpt-4o-realtime-preview-2024-12-17',
      voice: config.voice || 'ash',
      preferredVoices: config.preferredVoices || ['ash', 'coral'],
      voiceQuality: config.voiceQuality || 'high-quality' as 'high-quality',
      enhancedAudioProcessing: config.enhancedAudioProcessing !== undefined ? config.enhancedAudioProcessing : true,
      audioSampleRate: config.audioSampleRate || 48000
    };
    
    this.config = { ...defaultConfig, ...config };
    
    // Initialize the specialized services
    this.initializeSpecializedServices();
    
    // Register event handlers
    this.registerEventHandlers();
    
    console.log('Multimodal agent initialized with config:', this.config);
  }

  /**
   * Initialize all the specialized services with appropriate configuration
   */
  private initializeSpecializedServices(): void {
    // Initialize audio publishing service
    audioPublishingService.initialize({
      enhancedAudioProcessing: this.config.enhancedAudioProcessing,
      audioSampleRate: this.config.audioSampleRate
    });
    
    // Initialize transcription manager
    transcriptionManager.initialize({
      lang: 'en-US',
      continuous: true,
      interimResults: true
    });
    
    // Initialize speech synthesis service
    speechSynthesisService.initialize({
      voice: this.config.voice,
      speed: this.config.voiceSpeed,
      quality: this.config.voiceQuality,
      preferredVoices: this.config.preferredVoices
    });
    
    // Initialize tool detection service (tools will be set later)
    toolDetectionService.initialize();
    
    // Initialize voice activity service with VAD options
    if (this.config.vadOptions) {
      voiceActivityService.initialize(this.config.vadOptions);
    }
  }

  /**
   * Register event handlers for the specialized services
   */
  private registerEventHandlers(): void {
    // Register transcription handlers
    transcriptionManager.on('transcription', (data) => {
      this.handleTranscription(data.text, data.isFinal);
    });
    
    // Register audio output handlers from speech synthesis
    speechSynthesisService.onAudioOutput((audioChunk) => {
      this.emitter.emit('audio:output', audioChunk);
    });
    
    // Register speaking state changes
    speechSynthesisService.onSpeakingStateChange((isSpeaking) => {
      this.emitter.emit('speaking-state-change', isSpeaking);
    });
    
    // Register tool detection events
    toolDetectionService.on('tool:detected', (data) => {
      this.emitter.emit('transcription:toolCall', data);
    });
    
    toolDetectionService.on('tool:potentialDetection', (data) => {
      this.emitter.emit('transcription:potentialToolCall', data);
    });
    
    toolDetectionService.on('tool:executed', (data) => {
      this.emitter.emit('tool:executed', data);
    });
    
    toolDetectionService.on('tool:error', (data) => {
      this.emitter.emit('tool:error', data);
    });
    
    // Register voice activity events
    voiceActivityService.onVoiceActivity(this.handleVoiceActivity);
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
      console.log('[DEBUG] Starting multimodal agent listening...');
      
      // Resume audio context
      await this.resumeAudioContext();
      
      // Ensure LiveKit connection is established first
      const sessionActive = await this.ensureConnection();
      if (!sessionActive) {
        console.error('[DEBUG] Cannot start listening - LiveKit connection not established');
        throw new Error('LiveKit connection not ready');
      }
      
      // Start audio publishing
      const audioTrack = await audioPublishingService.startPublishing();
      if (!audioTrack) {
        throw new Error('Failed to start audio publishing');
      }
      
      // Start voice activity detection
      await voiceActivityService.startDetection(audioTrack);
      
      // Explicitly initialize the transcription manager first
      console.log('[DEBUG] Initializing transcription manager');
      transcriptionManager.initialize({
        lang: 'en-US',
        continuous: true,
        interimResults: true
      });
      
      // Explicitly start speech recognition with Web Speech API
      console.log('[DEBUG] Starting speech recognition via transcription manager');
      const recognitionStarted = transcriptionManager.startRecognition();
      if (!recognitionStarted) {
        console.warn('[DEBUG] Failed to start speech recognition with Web Speech API');
        console.log('[DEBUG] Attempting to verify Web Speech API availability');
        
        const isAvailable = transcriptionManager.isAvailable();
        console.log(`[DEBUG] Web Speech API available: ${isAvailable}`);
        
        if (!isAvailable) {
          console.error('[DEBUG] Web Speech API is not available in this browser');
          throw new Error('Speech recognition not supported in this browser');
        }
      } else {
        console.log('[DEBUG] Web Speech API recognition started successfully');
      }
      
      this.isListening = true;
      console.log('[DEBUG] Started listening for speech input');
      
      // Emit a listening started event
      this.emitter.emit('listening-started', { timestamp: Date.now() });
      
      return true;
    } catch (error) {
      console.error('[DEBUG] Error starting listening:', error);
      
      // Clean up any partial state
      this.stopListening();
      
      // Try to show a more helpful error message
      if (error instanceof Error) {
        if (error.message.includes('permission') || error.name === 'NotAllowedError') {
          this.emitter.emit('error', { type: 'permission-denied', message: 'Microphone permission denied' });
        } else if (error.message.includes('timeout') || error.message.includes('publish')) {
          this.emitter.emit('error', { type: 'publish-timeout', message: 'Could not publish audio track' });
        } else if (error.message.includes('connection')) {
          this.emitter.emit('error', { type: 'connection-error', message: 'Could not connect to audio server' });
        }
      }
      
      throw error; // Rethrow so caller can handle it
    }
  }

  /**
   * Ensure that LiveKit connection is established
   */
  private async ensureConnection(): Promise<boolean> {
    try {
      // Use a more comprehensive check approach that handles edge cases
      // First check if roomSessionManager exists
      if (!roomSessionManager) {
        console.warn('[DEBUG] No roomSessionManager instance found');
        return false;
      }
      
      // Get the active session
      const activeSession = roomSessionManager.getActiveSession();
      
      // If no active session, try to access the room directly as a fallback
      if (!activeSession) {
        console.warn('[DEBUG] No active LiveKit session found, checking direct room access');
        const room = livekitService.getRoom();
        const isConnected = room && room.state === 'connected';
        
        if (!isConnected) {
          console.warn('[DEBUG] No active LiveKit connection found');
          return false;
        }
        
        console.log('[DEBUG] LiveKit connection verified via direct room access');
        return true;
      }
      
      // Check session connection state
      const isConnected = activeSession && 
                          activeSession.connectionState === 'connected';
      
      if (!isConnected) {
        console.warn('[DEBUG] LiveKit session exists but is not connected');
        return false;
      }
      
      console.log('[DEBUG] LiveKit connection verified via active session');
      return true;
    } catch (error) {
      console.error('[DEBUG] Error checking LiveKit connection:', error);
      return false;
    }
  }

  /**
   * Stop listening for speech input
   */
  public stopListening(): void {
    if (!this.isListening) return;
    
    // Stop audio track publishing
    audioPublishingService.stopPublishing();
    
    // Stop voice activity detection
    voiceActivityService.stopDetection();
    
    // Stop speech recognition
    transcriptionManager.stopRecognition();
    
    this.isListening = false;
    console.log('Stopped listening for speech input');
    
    // Emit a listening stopped event
    this.emitter.emit('listening-stopped', { timestamp: Date.now() });
  }

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
    console.log('Starting speech processing with real transcription...');
    
    // Start speech recognition
    transcriptionManager.startRecognition();
    
    // Send initial listening message
    this.notifyTranscriptionHandlers('Listening...', false);
  }

  /**
   * Finalize speech processing
   */
  private finalizeSpeechProcessing(): void {
    console.log('Finalizing speech processing...');
    
    // Stop speech recognition
    transcriptionManager.stopRecognition();
    
    // Get the current transcription
    const currentTranscription = transcriptionManager.getCurrentTranscription();
    
    // If we have a transcript, use it
    if (currentTranscription) {
      // Send the final transcription
      this.notifyTranscriptionHandlers(currentTranscription, true);
      
      // Reset the transcript
      transcriptionManager.resetTranscription();
    } else {
      // Fallback if no transcript was captured
      this.notifyTranscriptionHandlers("Sorry, I couldn't understand that. Please try again.", true);
    }
    
    console.log('Speech processed - voice input detected');
  }

  /**
   * Handle transcription results
   */
  private handleTranscription(text: string, isFinal: boolean): void {
    console.log('[DEBUG] MultimodalAgentService received transcription:', { text, isFinal });
    
    // Emit the transcription event to all listeners
    this.emitter.emit('transcription', { text, isFinal });
    
    // Log successful emission of final transcriptions
    if (isFinal && text.trim()) {
      console.log('[DEBUG] Final transcription emitted:', text.trim());
    }
  }

  /**
   * Notify all transcription handlers
   */
  private notifyTranscriptionHandlers(text: string, isFinal: boolean): void {
    // Emit transcription event
    this.emitter.emit('transcription', { text, isFinal });
    
    // Call handlers directly instead of accessing private property
    // This is safer than accessing private property directly
  }

  /**
   * Process transcribed text for potential tool calls
   */
  private async processTranscriptionForTools(text: string, isFinal: boolean): Promise<void> {
    try {
      // Use the tool detection service to process the transcription
      await toolDetectionService.processTranscription(text, isFinal);
    } catch (error) {
      console.error('Error processing transcription for tools:', error);
    }
  }

  /**
   * Register a handler for transcription results
   */
  public onTranscription(handler: TranscriptionHandler): void {
    transcriptionManager.onTranscription(handler);
  }

  /**
   * Remove a transcription handler
   */
  public offTranscription(handler: TranscriptionHandler): void {
    transcriptionManager.offTranscription(handler);
  }

  /**
   * Register a handler for audio output
   */
  public onAudioOutput(handler: AudioOutputHandler): void {
    speechSynthesisService.onAudioOutput(handler);
  }

  /**
   * Remove an audio output handler
   */
  public offAudioOutput(handler: AudioOutputHandler): void {
    speechSynthesisService.offAudioOutput(handler);
  }

  /**
   * Synthesize speech with enhanced quality
   */
  public async synthesizeSpeech(text: string, options: {
    voice?: string;
    speed?: number;
    quality?: 'standard' | 'high-quality';
  } = {}): Promise<void> {
    return speechSynthesisService.synthesizeSpeech(text, options);
  }

  /**
   * Subscribe to speech synthesis events
   */
  public onSynthesisEvent(event: 'synthesis:start' | 'synthesis:complete' | 'synthesis:error', listener: (...args: any[]) => void): void {
    speechSynthesisService.onSynthesisEvent(event, listener);
  }

  /**
   * Unsubscribe from speech synthesis events
   */
  public offSynthesisEvent(event: 'synthesis:start' | 'synthesis:complete' | 'synthesis:error', listener: (...args: any[]) => void): void {
    speechSynthesisService.offSynthesisEvent(event, listener);
  }

  /**
   * Get the current audio level (0-1)
   */
  public getCurrentAudioLevel(): number {
    // Use getState() method from voiceActivityService to get the current level
    return voiceActivityService.getState().level || 0;
  }

  /**
   * Check if the bot is currently speaking
   */
  public isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /**
   * Set the speaking state and trigger mic muting if enabled
   */
  public setSpeaking(isSpeaking: boolean): void {
    const previousState = this._isSpeaking;
    this._isSpeaking = isSpeaking;
    
    // Emit event whenever speaking state changes
    if (previousState !== isSpeaking) {
      this.emitter.emit('speaking-state-change', { isSpeaking });
      
      // Handle mic muting during playback if enabled in config
      if (this.config.preventEchoDetection && this.config.muteMicDuringPlayback) {
        this.handleMicMutingDuringPlayback(isSpeaking);
      }
    }
  }

  /**
   * Handle microphone muting during bot speech playback
   */
  private handleMicMutingDuringPlayback(isBotSpeaking: boolean): void {
    if (isBotSpeaking && !this._isMicMuted) {
      // Bot started speaking - temporarily disable microphone
      console.log('Bot is speaking - temporarily muting microphone input');
      this._isMicMuted = true;
      
      // Stop voice activity detection but keep track that we're in "listening" mode
      if (this.isListening) {
        voiceActivityService.stopDetection();
      }
    } 
    else if (!isBotSpeaking && this._isMicMuted) {
      // Bot stopped speaking - re-enable microphone
      console.log('Bot stopped speaking - re-enabling microphone input');
      this._isMicMuted = false;
      
      // Resume voice activity detection if we were in "listening" mode
      if (this.isListening) {
        // Brief delay to ensure echo has fully dissipated
        setTimeout(async () => {
          const audioTrack = audioPublishingService.getAudioTrack();
          if (audioTrack) {
            try {
              await voiceActivityService.startDetection(audioTrack);
            } catch (error) {
              console.error('Failed to restart voice activity detection:', error);
            }
          }
        }, 300);
      }
    }
  }

  /**
   * Listen for speaking state changes
   */
  public onSpeakingStateChange(callback: (isSpeaking: boolean) => void): void {
    speechSynthesisService.onSpeakingStateChange(callback);
  }

  /**
   * Stop listening for speaking state changes
   */
  public offSpeakingStateChange(callback: (isSpeaking: boolean) => void): void {
    speechSynthesisService.offSpeakingStateChange(callback);
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
    return await audioPublishingService.resumeAudioContext();
  }

  /**
   * Fetch the latest available OpenAI models
   */
  private async fetchLatestModelVersions(): Promise<void> {
    try {
      // Try to fetch the latest model versions from an API endpoint
      const response = await fetch('/usergroupchatcontext/api/latest-openai-models');
      if (response.ok) {
        const data = await response.json();
        if (data.latestModel) {
          this.latestOpenAIModel = data.latestModel;
        }
        if (data.latestRealtimeModel) {
          this.latestRealtimeModel = data.latestRealtimeModel;
        }
        console.log('Fetched latest OpenAI models:', {
          standard: this.latestOpenAIModel,
          realtime: this.latestRealtimeModel
        });
      }
    } catch (error) {
      console.warn('Failed to fetch latest model versions:', error);
      // Fallback to hardcoded recent versions
      this.latestOpenAIModel = 'gpt-4o';
      this.latestRealtimeModel = 'gpt-4o-realtime-preview-2024-12-17';
    }
  }

  /**
   * Update the multimodal agent to use the latest available models
   */
  public async useLatestModels(): Promise<void> {
    await this.fetchLatestModelVersions();
    this.config.model = this.latestOpenAIModel;
    console.log(`Updated to use latest model: ${this.config.model}`);
  }

  /**
   * Set available tools for voice tool detection
   */
  public setAvailableTools(tools: ToolDefinition[]): void {
    toolDetectionService.setAvailableTools(tools);
    console.log('Updated available tools for voice detection:', 
      tools.map(t => t.name).join(', '));
  }

  /**
   * Get the current configuration
   */
  public getConfig(): MultimodalAgentConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration for the multimodal agent
   */
  public updateConfig(config: Partial<MultimodalAgentConfig>): void {
    const previousConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    
    // Apply VAD/echo cancellation settings if they've changed
    if (
      config.vadOptions || 
      config.turnDetectionOptions ||
      config.preventEchoDetection !== previousConfig.preventEchoDetection ||
      config.enhancedAudioProcessing !== previousConfig.enhancedAudioProcessing
    ) {
      // Update VAD options
      if (config.vadOptions) {
        voiceActivityService.updateOptions({
          mode: config.vadOptions.mode || previousConfig.vadOptions?.mode || 'auto',
          threshold: config.vadOptions.threshold || previousConfig.vadOptions?.threshold || 0.3,
          silenceDurationMs: config.vadOptions.silenceDuration || previousConfig.vadOptions?.silenceDuration || 1000
        });
      }
      
      // Apply enhanced audio processing if enabled
      if (config.enhancedAudioProcessing || 
         (config.enhancedAudioProcessing === undefined && previousConfig.enhancedAudioProcessing)) {
        this.applyEnhancedAudioProcessing();
      }
    }
    
    console.log('Updated multimodal agent config:', this.config);
  }

  /**
   * Apply enhanced audio processing settings for echo cancellation
   */
  private async applyEnhancedAudioProcessing(): Promise<void> {
    try {
      await voiceActivityService.configureAudioProcessing({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      });
      console.log('Applied enhanced audio processing settings');
    } catch (error) {
      console.error('Failed to apply enhanced audio processing:', error);
    }
  }

  /**
   * Get Web Speech API status
   */
  public getWebSpeechStatus(): { available: boolean, active: boolean, errorCount?: number } {
    const status = transcriptionManager.getStatus();
    return {
      available: status.available,
      active: status.active,
      errorCount: status.errorCount
    };
  }

  /**
   * Check if the Web Speech API is available
   */
  public isWebSpeechAvailable(): boolean {
    return transcriptionManager.isAvailable();
  }
}

// Create a singleton instance
const multimodalAgentService = new MultimodalAgentService();
export default multimodalAgentService; 