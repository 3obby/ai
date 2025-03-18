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
    audioSampleRate: 48000
  };

  private isListening: boolean = false;
  private isProcessing: boolean = false;
  private transcriptionHandlers: TranscriptionHandler[] = [];
  private audioOutputHandlers: AudioOutputHandler[] = [];
  private localAudioTrack: AudioTrack | null = null;
  private activeRoomName: string | null = null;
  private isSynthesizing: boolean = false;
  private synthQueue: Array<{ text: string; options: { voice?: string; speed?: number; quality?: 'standard' | 'high-quality'; } }> = [];
  private emitter: EventEmitter = new EventEmitter();
  private currentAudioLevel: number = 0;
  private isProcessingToolCall: boolean = false;
  private availableTools: ToolDefinition[] = [];
  private interimTranscriptionTimer: NodeJS.Timeout | null = null;
  private isSpeakingState: boolean = false;
  private latestOpenAIModel: string = 'gpt-4o';
  private latestRealtimeModel: string = 'gpt-4o-realtime-preview-2024-12-17';
  private speechRecognition: any = null;
  private recognitionActive: boolean = false;
  private recognitionTranscript: string = '';
  private speechRecognitionErrorCount: number = 0;
  private _connected: boolean = false;

  /**
   * Initialize the multimodal agent with the given configuration
   */
  public initialize(config: Partial<MultimodalAgentConfig> = {}): void {
    // Try to get the latest OpenAI model version
    this.fetchLatestModelVersions();
    
    // Initialize Web Speech API if available
    this.initializeSpeechRecognition();
    
    // Use latest realtime models by default if not specified
    const defaultConfig = {
      ...this.config,
      model: this.latestRealtimeModel || 'gpt-4o-realtime-preview-2024-12-17',
      voice: config.voice || 'ash',
      preferredVoices: config.preferredVoices || ['ash', 'coral'],
      voiceQuality: 'high-quality' as 'high-quality',
      enhancedAudioProcessing: true,
      audioSampleRate: 48000
    };
    
    this.config = { ...defaultConfig, ...config };
    
    // Initialize voice activity service with our VAD options
    voiceActivityService.initialize(this.config.vadOptions);
    
    // Set up listeners for tool calling events
    voiceToolCallingService.on('voiceTool:executed', this.handleToolExecution);
    voiceToolCallingService.on('voiceTool:error', this.handleToolError);
    
    // Configure echo cancellation and audio processing
    this.setupAudioProcessing();
    
    console.log('Multimodal agent initialized with config:', this.config);
  }

  /**
   * Configure advanced audio processing options
   */
  private setupAudioProcessing(): void {
    if (typeof window !== 'undefined' && this.config.enhancedAudioProcessing) {
      // Set up audio processing constraints
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: this.config.audioSampleRate,
        channelCount: 1
      };
      
      // Store these constraints for later use when starting the audio
      (window as any).__enhancedAudioConstraints = audioConstraints;
      
      console.log('Enhanced audio processing configured:', audioConstraints);
    }
  }

  /**
   * Initialize Web Speech API for speech recognition
   */
  private initializeSpeechRecognition(): void {
    // Reset error count
    this.speechRecognitionErrorCount = 0;
    
    // Check if browser supports speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = 'en-US';
        
        // Set up event handlers
        this.speechRecognition.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1];
          const transcript = lastResult[0].transcript;
          const isFinal = lastResult.isFinal;
          
          this.recognitionTranscript = transcript;
          
          // Notify handlers with the transcription
          this.notifyTranscriptionHandlers(transcript, isFinal);
        };
        
        this.speechRecognition.onerror = (event: any) => {
          this.speechRecognitionErrorCount++;
          console.error('Speech recognition error:', event.error, `(Count: ${this.speechRecognitionErrorCount})`);
          
          if (this.recognitionActive) {
            // Only try to restart if we haven't had too many errors
            if (this.speechRecognitionErrorCount < 5) {
              // Try to restart recognition
              this.stopSpeechRecognition();
              setTimeout(() => {
                if (this.recognitionActive) {
                  this.startSpeechRecognition();
                }
              }, 1000);
            } else {
              // Too many errors, stop trying to restart
              console.warn('Too many speech recognition errors, stopping auto-restart');
              this.recognitionActive = false;
              this.emitter.emit('speech-recognition-failed', {
                errorCount: this.speechRecognitionErrorCount,
                lastError: event.error
              });
            }
          }
        };
        
        this.speechRecognition.onend = () => {
          if (this.recognitionActive) {
            // Restart recognition if it ends unexpectedly
            // But only if we haven't had too many errors
            if (this.speechRecognitionErrorCount < 5) {
              console.log('Speech recognition ended unexpectedly, restarting...');
              this.speechRecognition.start();
            }
          }
        };
        
        console.log('Speech recognition initialized successfully');
      } else {
        console.warn('Speech recognition not supported in this browser');
      }
    }
  }
  
  /**
   * Start speech recognition
   */
  private startSpeechRecognition(): void {
    if (!this.speechRecognition) {
      console.warn('Speech recognition not initialized');
      return;
    }
    
    try {
      this.speechRecognition.start();
      this.recognitionActive = true;
      console.log('Speech recognition started');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }
  
  /**
   * Stop speech recognition
   */
  private stopSpeechRecognition(): void {
    if (!this.speechRecognition || !this.recognitionActive) return;
    
    try {
      this.speechRecognition.stop();
      this.recognitionActive = false;
      console.log('Speech recognition stopped');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  /**
   * Start listening for speech input with enhanced audio quality
   */
  public async startListening(): Promise<boolean> {
    if (this.isListening) {
      console.log('Already listening');
      return true;
    }

    try {
      // Ensure LiveKit is connected - attempt to initialize connection if needed
      await this.ensureLiveKitConnection();

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
        
        // Try to automatically initialize LiveKit
        try {
          console.log('Attempting to automatically initialize LiveKit connection...');
          const liveKitInitialized = await this.initializeLiveKitConnection();
          if (liveKitInitialized) {
            console.log('Successfully initialized LiveKit connection automatically');
            // Try getting session again
            const newSession = roomSessionManager.getActiveSession();
            if (!newSession) {
              console.error('Still no active LiveKit session after initialization');
              return false;
            }
            this.activeRoomName = newSession.roomName;
          } else {
            return false;
          }
        } catch (initError) {
          console.error('Failed to automatically initialize LiveKit:', initError);
          return false;
        }
      } else {
        this.activeRoomName = session.roomName;
      }
      
      // Enable local audio in the room session with enhanced quality
      console.log('Enabling local audio with enhanced quality settings...');
      const audioConstraints = this.config.enhancedAudioProcessing ? 
        (window as any).__enhancedAudioConstraints : undefined;
      
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
      console.log('Started listening for speech input with enhanced quality');
      return true;
    } catch (error) {
      console.error('Error starting listening:', error);
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
    
    // Stop speech recognition
    this.stopSpeechRecognition();
    
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
   * Synthesize speech with enhanced quality
   */
  public async synthesizeSpeech(text: string, options: {
    voice?: string;
    speed?: number;
    quality?: 'standard' | 'high-quality';
  } = {}): Promise<void> {
    // Add to synthesis queue
    this.synthQueue.push({
      text,
      options: {
        voice: options.voice || this.getNextVoice(),
        speed: options.speed || this.config.voiceSpeed,
        quality: options.quality || this.config.voiceQuality
      }
    });
    
    // Start processing if not already in progress
    if (!this.isSynthesizing) {
      await this.processNextSynthesisItem();
    }
  }

  /**
   * Get the next voice in the rotation for more natural conversations
   */
  private getNextVoice(): string {
    // If we have preferred voices, alternate between them
    if (this.config.preferredVoices && this.config.preferredVoices.length > 0) {
      const nextVoiceIndex = Math.floor(Math.random() * this.config.preferredVoices.length);
      return this.config.preferredVoices[nextVoiceIndex];
    }
    
    // Otherwise, use the default voice
    return this.config.voice;
  }

  // Update the process synthesis method to handle the new high-quality option
  private processNextSynthesisItem = async (): Promise<void> => {
    if (this.synthQueue.length === 0) {
      this.isSynthesizing = false;
      return;
    }
    
    const next = this.synthQueue.shift();
    if (!next) {
      this.isSynthesizing = false;
      return;
    }
    
    this.isSynthesizing = true;
    this.emitter.emit('synthesis:start', { text: next.text });
    
    try {
      // Set speaking state before audio starts
      this.setSpeaking(true);
      
      // Configure synthesis options based on quality setting
      const synthesisOptions: any = {
        voice: next.options.voice || this.config.voice,
        speed: next.options.speed || this.config.voiceSpeed,
        model: next.options.quality === 'high-quality' ? 'tts-1-hd' : 'tts-1'
      };
      
      // If preventing echo, temporarily suspend voice activity detection
      // This will be controlled by the interrupt toggle in the UI
      if (this.config.preventEchoDetection) {
        // We don't need to manually disable voice activity here anymore
        // The interrupt toggle will handle this through the speaking-state-change event
        console.log('Bot starting to speak - echo prevention handled by interrupt toggle');
      }
      
      // Request speech synthesis with high quality settings
      const response = await fetch('/api/synthesize-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: next.text,
          options: synthesisOptions
        })
      });
      
      if (!response.ok) {
        throw new Error(`Speech synthesis failed: ${response.status} ${response.statusText}`);
      }
      
      // Get audio data and play it
      const audioData = await response.arrayBuffer();
      this.notifyAudioOutputHandlers(audioData);
      
      this.emitter.emit('synthesis:complete', { text: next.text });
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      this.emitter.emit('synthesis:error', { 
        text: next.text, 
        error 
      });
    } finally {
      // Reset speaking state
      this.setSpeaking(false);
      
      // Process next item in queue
      await this.processNextSynthesisItem();
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
    // For UI purposes, indicate that speech processing has started
    console.log('Starting speech processing with real transcription...');
    
    // Set speaking state
    this.setSpeaking(true);
    
    // Start speech recognition
    this.startSpeechRecognition();
    
    // Clear any existing timer
    if (this.interimTranscriptionTimer) {
      clearInterval(this.interimTranscriptionTimer);
    }
    
    // Send initial listening message
    this.notifyTranscriptionHandlers('Listening...', false);
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
    
    console.log('Finalizing speech processing...');
    
    // Stop speech recognition
    this.stopSpeechRecognition();
    
    // If we have a transcript from speech recognition, use it
    if (this.recognitionTranscript) {
      // Send the final transcription
      this.notifyTranscriptionHandlers(this.recognitionTranscript, true);
      
      // Reset the transcript
      this.recognitionTranscript = '';
    } else {
      // Fallback if no transcript was captured
      this.notifyTranscriptionHandlers("Sorry, I couldn't understand that. Please try again.", true);
    }
    
    // Log that we've processed speech
    console.log('Speech processed - voice input detected');
    
    // Stop the "speaking" state
    this.setSpeaking(false);
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
   * Get the current audio level (0-1)
   */
  public getCurrentAudioLevel(): number {
    return this.currentAudioLevel;
  }

  /**
   * Check if the bot is currently speaking
   */
  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  /**
   * Set the speaking state
   */
  public setSpeaking(isSpeaking: boolean): void {
    this.isSpeakingState = isSpeaking;
    this.emitter.emit('speaking-state-change', isSpeaking);
  }

  /**
   * Listen for speaking state changes
   */
  public onSpeakingStateChange(callback: (isSpeaking: boolean) => void): void {
    this.emitter.on('speaking-state-change', callback);
  }

  /**
   * Stop listening for speaking state changes
   */
  public offSpeakingStateChange(callback: (isSpeaking: boolean) => void): void {
    this.emitter.off('speaking-state-change', callback);
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

  /**
   * Get the current configuration
   */
  public getConfig(): MultimodalAgentConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  public updateConfig(config: Partial<MultimodalAgentConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Updated multimodal agent config:', this.config);
    
    // If voice activity options were updated, propagate to the voice activity service
    if (config.vadOptions) {
      voiceActivityService.updateOptions(config.vadOptions);
    }
    
    // Emit config change event
    this.emitter.emit('config-changed', this.config);
  }

  /**
   * Get Web Speech API status
   */
  public getWebSpeechStatus(): { available: boolean, active: boolean, errorCount?: number } {
    return {
      available: !!this.speechRecognition,
      active: this.recognitionActive,
      errorCount: this.speechRecognitionErrorCount
    };
  }

  /**
   * Check if the Web Speech API is available
   */
  public isWebSpeechAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Ensure LiveKit is connected before starting voice mode
   */
  private async ensureLiveKitConnection(): Promise<boolean> {
    // Check if LiveKit is already connected
    if (livekitService.getRoom()?.state === 'connected') {
      console.log('LiveKit connection already established');
      return true;
    }
    
    // If not connected, initialize the connection
    return await this.initializeLiveKitConnection();
  }

  /**
   * Initialize LiveKit connection
   */
  private async initializeLiveKitConnection(): Promise<boolean> {
    try {
      console.log('Initializing LiveKit connection...');
      
      // Get LiveKit URL from environment
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!livekitUrl) {
        console.error('LiveKit URL not configured in environment variables');
        return false;
      }
      
      // Get a LiveKit token from our API with error handling and retry logic
      let token = '';
      let roomName = 'default-room';
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Fetching LiveKit token (attempt ${retryCount + 1}/${maxRetries})...`);
          const response = await fetch('/usergroupchatcontext/api/livekit-token');
          
          if (!response.ok) {
            throw new Error(`Failed to get LiveKit token: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          if (!data.token) {
            throw new Error('No token received from LiveKit token API');
          }
          
          token = data.token;
          roomName = data.roomName || 'default-room';
          break; // Successfully got token, exit retry loop
        } catch (tokenError) {
          console.error(`Token fetch error (attempt ${retryCount + 1}):`, tokenError);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            console.error('Failed to get LiveKit token after multiple attempts');
            return false;
          }
          
          // Wait before retrying (increasing delay)
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        }
      }
      
      // Connect to LiveKit using roomSessionManager with proper error handling
      try {
        console.log('Creating LiveKit session with token, length:', token.length);
        await roomSessionManager.createSession(roomName, token, livekitUrl);
        console.log('LiveKit connection established successfully');
        return true;
      } catch (sessionError) {
        console.error('Failed to create LiveKit session:', sessionError);
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize LiveKit connection:', error);
      return false;
    }
  }
}

// Create a singleton instance
const multimodalAgentService = new MultimodalAgentService();
export default multimodalAgentService; 