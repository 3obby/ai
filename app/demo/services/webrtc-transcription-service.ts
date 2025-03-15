import { v4 as uuidv4 } from 'uuid';

// Define types for transcript data 
export interface WhisperTranscriptionResult {
  task?: string;
  language?: string;
  duration?: number;
  text: string;
  segments?: WhisperSegment[];
  words?: WhisperWord[];
}

export interface WhisperSegment {
  id: number;
  seek?: number;
  start: number;
  end: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

// Define types for callbacks
export type TranscriptionUpdateCallback = (text: string, result?: WhisperTranscriptionResult) => void;
export type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'warning', message?: string) => void;
export type AIResponseCallback = (text: string, isFinal: boolean) => void;

export interface VoiceConfig {
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  vadMode?: 'auto' | 'sensitive' | 'manual';
  modality?: 'both' | 'text' | 'audio';
  turnDetection?: {
    threshold?: number; // Default 0.5, lower value is more sensitive
    prefixPaddingMs?: number; // Default 300ms
    silenceDurationMs?: number; // Default 500ms
    createResponse?: boolean; // Default true
  };
  temperature?: number; // Sampling temperature (0.6-1.2), default 0.8
  maxResponseTokens?: number | 'inf'; // Max tokens per response, default 'inf'
  audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw'; // Audio format
}

// Update the ConnectionStatus type to include 'warning'
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'warning';

/**
 * Service to handle real-time transcription using WebRTC directly with OpenAI's Realtime API
 */
class WebRTCTranscriptionService {
  private static instance: WebRTCTranscriptionService;
  private sessionId: string | null = null;
  private mediaStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isConnected = false;
  private updateCallbacks: TranscriptionUpdateCallback[] = [];
  private statusCallbacks: ConnectionStatusCallback[] = [];
  private aiResponseCallbacks: AIResponseCallback[] = [];
  private lastTranscription: string = '';
  private currentAIResponse: string = '';
  private ephemeralKey: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private status: string = 'disconnected';
  private voiceConfig: VoiceConfig = {
    voice: 'sage',
    vadMode: 'auto',
    modality: 'both'
  };

  private constructor() {
    // Private constructor for singleton pattern
    this.audioElement = document.createElement('audio');
    this.audioElement.autoplay = true;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): WebRTCTranscriptionService {
    if (!WebRTCTranscriptionService.instance) {
      WebRTCTranscriptionService.instance = new WebRTCTranscriptionService();
    }
    return WebRTCTranscriptionService.instance;
  }

  /**
   * Subscribe to transcription updates
   */
  public subscribeToUpdates(callback: TranscriptionUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  public subscribeToConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to AI response updates
   */
  public subscribeToAIResponses(callback: AIResponseCallback): () => void {
    this.aiResponseCallbacks.push(callback);
    return () => {
      this.aiResponseCallbacks = this.aiResponseCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Start a WebRTC transcription session
   */
  public async startTranscription(): Promise<boolean> {
    if (this.isConnected) {
      console.log('Already connected to transcription service');
      return false;
    }

    try {
      // Generate a new session ID
      this.sessionId = uuidv4();
      
      // Notify status change
      this.notifyStatusChange('connecting');
      
      // Build query params based on voice config
      const params = new URLSearchParams();
      
      // Add basic voice settings
      if (this.voiceConfig.voice) params.append('voice', this.voiceConfig.voice);
      if (this.voiceConfig.vadMode) params.append('vad', this.voiceConfig.vadMode);
      if (this.voiceConfig.modality) params.append('modality', this.voiceConfig.modality);
      
      // Add turn detection settings
      if (this.voiceConfig.turnDetection) {
        if (this.voiceConfig.turnDetection.threshold !== undefined) {
          params.append('threshold', this.voiceConfig.turnDetection.threshold.toString());
        }
        if (this.voiceConfig.turnDetection.prefixPaddingMs !== undefined) {
          params.append('prefix_padding_ms', this.voiceConfig.turnDetection.prefixPaddingMs.toString());
        }
        if (this.voiceConfig.turnDetection.silenceDurationMs !== undefined) {
          params.append('silence_duration_ms', this.voiceConfig.turnDetection.silenceDurationMs.toString());
        }
        if (this.voiceConfig.turnDetection.createResponse !== undefined) {
          params.append('create_response', this.voiceConfig.turnDetection.createResponse.toString());
        }
      }
      
      // Add temperature and max response tokens
      if (this.voiceConfig.temperature !== undefined) {
        params.append('temperature', this.voiceConfig.temperature.toString());
      }
      if (this.voiceConfig.maxResponseTokens !== undefined) {
        params.append('max_tokens', this.voiceConfig.maxResponseTokens.toString());
      }
      
      // Add audio format
      if (this.voiceConfig.audioFormat) {
        params.append('audio_format', this.voiceConfig.audioFormat);
      }
      
      // IMPORTANT: Enable input audio transcription explicitly with multiple settings
      params.append('enable_input_transcription', 'true');
      params.append('input_transcription_model', 'whisper-1');
      params.append('input_transcription_language', 'en');
      
      console.log('Requesting ephemeral token with input transcription enabled');
      
      // Get an ephemeral token from our server with the config params
      const tokenResponse = await fetch(`/api/demo/realtime-transcription/ephemeral-token?${params.toString()}`);
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        let errorDetail = "Unknown error";
        
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = errorJson.error || errorJson.message || errorText;
        } catch (e) {
          errorDetail = errorText || `HTTP error ${tokenResponse.status}`;
        }
        
        console.error(`Failed to obtain ephemeral token: ${errorDetail}`);
        this.notifyStatusChange('error', `Failed to obtain token: ${errorDetail}`);
        return false;
      }
      
      const data = await tokenResponse.json();
      if (!data.client_secret?.value) {
        console.error('Invalid ephemeral token response:', data);
        this.notifyStatusChange('error', 'Invalid token response from server');
        return false;
      }
      
      this.ephemeralKey = data.client_secret.value;
      const tokenPreview = this.ephemeralKey ? this.ephemeralKey.substring(0, 10) + '...' : 'unavailable';
      console.log('Obtained ephemeral token:', tokenPreview);
      
      // Initialize WebRTC connection
      await this.initializeWebRTC();
      
      return true;
    } catch (error) {
      console.error('Error starting transcription:', error);
      this.notifyStatusChange('error', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Stop the transcription session
   */
  public async stopTranscription(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      // Send end session event if data channel is open
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        const endSessionEvent = {
          type: 'session.delete',
        };
        this.dataChannel.send(JSON.stringify(endSessionEvent));
      }
      
      // Close WebRTC connection
      this.closeWebRTCConnection();
      
      // Reset state
      this.isConnected = false;
      this.notifyStatusChange('disconnected');
      this.sessionId = null;
      this.ephemeralKey = null;
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Error stopping transcription:', error);
    }
  }

  /**
   * Get the current media stream (for visualization)
   */
  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Check if currently connected
   */
  public isCurrentlyConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Initialize WebRTC connection with OpenAI's Realtime API
   */
  private async initializeWebRTC(): Promise<void> {
    try {
      // Request microphone access with high-quality audio settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000, // Increased from 16kHz to 48kHz for higher quality
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Use only standard properties
          advanced: [
            {
              echoCancellation: { exact: true },
              noiseSuppression: { exact: true },
              autoGainControl: { exact: true }
            }
          ]
        },
      });
      
      // Create peer connection with improved ICE servers for better connectivity
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
      });
      
      // Set up to play remote audio from the model with optimized settings
      this.peerConnection.ontrack = (event) => {
        if (this.audioElement && event.streams && event.streams.length > 0) {
          this.audioElement.srcObject = event.streams[0];
          // Optimize audio playback settings
          this.audioElement.volume = 1.0;
          this.audioElement.preservesPitch = false; // Allow natural pitch variation
        }
      };
      
      // Add local audio track
      if (this.mediaStream) {
        const audioTracks = this.mediaStream.getAudioTracks();
        if (audioTracks.length > 0) {
          this.peerConnection.addTrack(audioTracks[0], this.mediaStream);
        }
      }
      
      // Set up data channel for events
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannelListeners();
      
      // Create and set local description (offer)
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Send the offer to OpenAI
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview";
      
      if (!this.ephemeralKey || !this.peerConnection.localDescription) {
        throw new Error('Missing ephemeral key or local description');
      }
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: this.peerConnection.localDescription.sdp,
        headers: {
          Authorization: `Bearer ${this.ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`Failed to connect to OpenAI Realtime API: ${sdpResponse.status} ${errorText}`);
      }
      
      // Get the SDP answer from OpenAI
      const answerSdp = await sdpResponse.text();
      
      // Set the remote description
      const answer = {
        type: 'answer',
        sdp: answerSdp,
      } as RTCSessionDescriptionInit;
      
      await this.peerConnection.setRemoteDescription(answer);
      
      // Connection established
      this.isConnected = true;
      this.notifyStatusChange('connected');
      
      console.log('WebRTC connection established with OpenAI Realtime API');
      
      // Send initial request for text-only transcription
      setTimeout(() => {
        this.sendInitialTranscriptionRequest();
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      this.notifyStatusChange('error', error instanceof Error ? error.message : String(error));
      this.closeWebRTCConnection();
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        await this.startTranscription();
      } else {
        console.error('Max reconnect attempts reached');
      }
    }
  }

  /**
   * Set up listeners for the data channel
   */
  private setupDataChannelListeners(): void {
    if (!this.dataChannel) return;
    
    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };
    
    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
    
    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
    
    this.dataChannel.onmessage = (event) => {
      try {
        const realtimeEvent = JSON.parse(event.data);
        this.handleRealtimeEvent(realtimeEvent);
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };
  }

  /**
   * Send a text message to get a voice response
   * This allows sending text-based questions to the AI and getting voice responses
   */
  public async sendTextMessage(text: string): Promise<boolean> {
    if (!this.isConnected || !this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('Cannot send text message: not connected or data channel not open');
      return false;
    }
    
    try {
      // Create a conversation item with text content
      const conversationItemEvent = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: text
            }
          ]
        }
      };
      
      // Send the message to OpenAI
      this.dataChannel.send(JSON.stringify(conversationItemEvent));
      console.log('Sent text message for voice response:', text);
      return true;
    } catch (error) {
      console.error('Error sending text message:', error);
      return false;
    }
  }

  /**
   * Send initial request for transcription
   */
  private sendInitialTranscriptionRequest(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('Data channel not open when trying to send initial request');
      return;
    }
    
    try {
      // First, enable input audio transcription by sending a session update
      // Add more comprehensive settings for input transcription
      const sessionUpdateEvent = {
        type: "session.update",
        session: {
          input_audio_transcription: {
            model: "whisper-1",
            language: "en", // Explicitly set language for better accuracy
            prompt: "Accurately transcribe the user's speech" // Guide the transcription
          }
        }
      };
      
      this.dataChannel.send(JSON.stringify(sessionUpdateEvent));
      console.log('Enabled input audio transcription via session update with enhanced settings');
      
      // Send a response.create event to start transcription with both text and audio modalities
      const responseCreate = {
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
          instructions: `You are a helpful voice assistant. Your name is Nova.
          
VOICE AND PERSONALITY:
- Respond naturally and conversationally with a friendly, warm tone
- Vary your pace and intonation to sound more human-like
- Use brief pauses for natural speech rhythm
- Express appropriate emotion in your voice
- Keep responses concise but informative
- Occasionally use casual language like "hmm", "well", or "you know" for naturalness
- When speaking numbers, dates, or technical terms, speak clearly and at a slightly slower pace

CONVERSATION STYLE:
- Begin responses with brief acknowledgments when appropriate
- Use contractions (I'm, you're, we'll) as people typically do in conversation
- Ask clarifying questions when needed
- Show empathy and understanding in your responses
- Adapt your speech style based on the user's communication style
          `,
        },
      };
      
      this.dataChannel.send(JSON.stringify(responseCreate));
      console.log('Sent initial transcription request with text and audio modalities');
      
      // Send a greeting to start the conversation using conversation.item.create
      setTimeout(() => {
        // Make sure we still have a connection
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
          console.warn('Data channel not open when trying to send greeting');
          return;
        }
        
        // Create a conversation item with the greeting message
        const greetingEvent = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Hello, I'm looking forward to our conversation. How can you help me today?"
              }
            ]
          }
        };
        
        this.dataChannel.send(JSON.stringify(greetingEvent));
        console.log('Sent initial greeting using conversation.item.create');
      }, 1000);
    } catch (error) {
      console.error('Error sending initial transcription request:', error);
    }
  }

  /**
   * Handle events from the Realtime API
   */
  private handleRealtimeEvent(event: any): void {
    // Log all received events with more detail
    console.log(`[WebRTC] Received event type: ${event.type}`);
    
    // Common error message handling
    if (event.error) {
      console.error('[WebRTC] Error in event:', event.type, event.error);
      this.notifyStatusChange('error', event.error.message || 'Unknown error');
      return;
    }
    
    switch (event.type) {
      // Session establishment
      case 'session.created':
        this.sessionId = event.session_id;
        console.log('[WebRTC] Session created, ID:', this.sessionId);
        this.notifyStatusChange('connected');
        this.isConnected = true;
        
        // Send initial configuration after connection
        this.sendInitialTranscriptionRequest();
        break;

      // Text transcription and response
      case 'text.delta':
        // Accumulate partial text response
        this.currentAIResponse += event.delta;
        this.notifyAIResponse(this.currentAIResponse, false);
        break;

      case 'text.done':
        // Process completed text response
        this.notifyAIResponse(this.currentAIResponse, true);
        this.currentAIResponse = '';
        break;

      // Audio generation and playback
      case 'audio.chunk':
        this.handleAudioChunk(event);
        break;
        
      case 'audio.done':
        console.log('[WebRTC] Audio generation complete for item:', event.item_id);
        break;
      
      // Full response handling
      case 'response.created':
        console.log('[WebRTC] Response created with ID:', event.response_id);
        // Reset any existing response data
        this.currentAIResponse = '';
        break;
      
      case 'response.done':
        console.log('[WebRTC] Response complete with ID:', event.response_id);
        break;
      
      // Response items handling
      case 'response.content_part.added':
        console.log('[WebRTC] Content part added:', event.item_id);
        break;
        
      case 'response.output_item.added':
        console.log('[WebRTC] Output item added:', event.item_id);
        this.handleOutputItemAdded(event);
        break;
        
      case 'response.content_part.done':
        console.log('[WebRTC] Content part complete for item:', event.item_id);
        break;
        
      case 'response.output_item.done':
        console.log('[WebRTC] Output item complete:', event.item_id);
        break;
      
      // Handle audio transcript events
      case 'response.audio_transcript.delta':
        this.handleAudioTranscriptDelta(event);
        break;
      
      case 'response.audio_transcript.done':
        this.handleAudioTranscriptDone(event);
        break;
        
      case 'response.audio.done':
        console.log('[WebRTC] Audio playback complete for item:', event.item_id);
        break;
      
      // Handle input audio buffer speech events
      case 'input_audio_buffer.speech_started':
        console.log('[WebRTC-DEBUG] Speech started:', JSON.stringify(event, null, 2));
        this.handleSpeechStarted(event);
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('[WebRTC-DEBUG] Speech stopped:', JSON.stringify(event, null, 2));
        this.handleSpeechStopped(event);
        break;

      // Track when audio is committed for transcription
      case 'input_audio_buffer.committed':
        console.log('[WebRTC-DEBUG] Audio buffer committed:', JSON.stringify(event, null, 2));
        break;

      // Input transcription events - logging extensively to debug
      case 'conversation.item.input_audio_transcription.completed':
        console.log('[WebRTC-DEBUG] Input audio transcription completed:', JSON.stringify(event, null, 2));
        this.handleUserAudioTranscription(event);
        break;

      case 'conversation.item.input_audio_transcription.delta':
      case 'input_audio_transcription.delta':
        console.log('[WebRTC-DEBUG] Input audio transcription delta:', JSON.stringify(event, null, 2));
        this.handleInputTranscriptionDelta(event);
        break;

      case 'conversation.item.input_audio_transcription.done':
      case 'input_audio_transcription.done':
        console.log('[WebRTC-DEBUG] Input audio transcription done:', JSON.stringify(event, null, 2));
        this.handleInputTranscriptionDone(event);
        break;

      // Handle rate limit and session events
      case 'rate_limits.updated':
        console.log('[WebRTC] Rate limits updated:', event.rate_limits);
        this.handleRateLimitsUpdated(event);
        break;
        
      case 'session.updated':
        console.log('[WebRTC] Session update:', event.session);
        this.handleSessionUpdate(event);
        break;
        
      // Conversation item events
      case 'conversation.item.created':
        console.log('[WebRTC] Conversation item created:', event.item);
        this.handleConversationItemCreated(event);
        break;

      // Handle completed conversation items
      case 'conversation.item.completed':
        console.log('[WebRTC] Conversation item completed:', event.item);
        this.handleConversationItemCompleted(event);
        break;
        
      case 'error':
        console.error('[WebRTC] Error from OpenAI Realtime API:', event);
        this.notifyStatusChange('error', event.error?.message || 'Unknown error from OpenAI');
        break;

      // Handle truncated conversation items
      case 'conversation.item.truncated':
        console.log('[WebRTC] Conversation item truncated:', event);
        // No specific handling needed, just acknowledge we've seen it
        break;

      default:
        // Log unhandled event types for debugging
        console.log('[WebRTC] Unhandled event type:', event.type, event);
        break;
    }
  }
  
  /**
   * Handle conversation item created event
   * This is triggered when a new item is added to the conversation history
   */
  private handleConversationItemCreated(event: any): void {
    console.log('Conversation item created:', event);
    
    // Check if this is a user or assistant message with transcription
    if (event.item && event.item.type === 'message') {
      // Process item ID for reference
      const itemId = event.item.id;
      console.log('Processing conversation item:', itemId);
      
      // Check for text content
      const content = event.item.content;
      if (content && content.length > 0) {
        for (const part of content) {
          // Process user input text
          if (part.type === 'input_text' && part.text) {
            const text = part.text.trim();
            console.log('User text input detected:', text);
            
            // Create a transcription result
            const result: WhisperTranscriptionResult = {
              text: text,
              task: 'transcribe'
            };
            
            // Update the last transcription
            this.lastTranscription = text;
            
            // Notify transcription update - critical for UI display
            this.notifyTranscriptionUpdate(text, result);
            
            // Store on server
            this.storeTranscriptionOnServer(text);
          } 
          // Process assistant text
          else if (part.type === 'text' && part.text) {
            const text = part.text.trim();
            console.log('Assistant text from conversation item:', text);
            
            // Notify as AI response
            this.notifyAIResponse(text, true);
          }
          // Log unrecognized content types
          else {
            console.log('Unrecognized content part type:', part.type);
          }
        }
      }
      
      // Check for audio transcription within the item
      if (event.item.input_audio_transcription && event.item.input_audio_transcription.text) {
        const transcript = event.item.input_audio_transcription.text.trim();
        console.log('Audio transcription detected in conversation item:', transcript);
        
        // Create a detailed transcription result with metadata
        const result: WhisperTranscriptionResult = {
          text: transcript,
          task: 'transcribe'
        };
        
        // Add metadata if available
        if (event.item.input_audio_transcription.duration) {
          result.duration = event.item.input_audio_transcription.duration;
        }
        
        if (event.item.input_audio_transcription.language) {
          result.language = event.item.input_audio_transcription.language;
        }
        
        if (event.item.input_audio_transcription.segments) {
          result.segments = event.item.input_audio_transcription.segments;
        }
        
        if (event.item.input_audio_transcription.words) {
          result.words = event.item.input_audio_transcription.words;
        }
        
        // Update the last transcription
        this.lastTranscription = transcript;
        
        // Notify transcription update - this is critical for UI display
        this.notifyTranscriptionUpdate(transcript, result);
        
        // Store on server
        this.storeTranscriptionOnServer(transcript);
        
        console.log('Processed audio transcription with metadata:', 
          `Duration: ${result.duration ?? 'unknown'}, ` +
          `Language: ${result.language ?? 'unknown'}, ` +
          `Segments: ${result.segments ? result.segments.length : 0}, ` +
          `Words: ${result.words ? result.words.length : 0}`
        );
      }
    }
  }
  
  /**
   * Handle completed conversation items
   * This handles the completed event as described in the documentation
   */
  private handleConversationItemCompleted(event: any): void {
    console.log('Conversation item completed:', JSON.stringify(event, null, 2));
    
    // Check if this is an assistant message
    if (event.item && event.item.role === 'assistant' && event.item.content) {
      // Per documentation, extract the text from content[0].text
      if (event.item.content.length > 0 && event.item.content[0].text) {
        const aiResponseText = event.item.content[0].text;
        console.log('AI response text from completed item:', aiResponseText);
        
        // Notify as final AI response
        this.notifyAIResponse(aiResponseText, true);
      }
    } 
    // Check if this contains a user message with transcript
    else if (event.item && event.item.role === 'user') {
      // Per documentation, try to find user transcript
      if (event.item.content && event.item.content.length > 0) {
        if (event.item.content[0].transcript) {
          const userTranscript = event.item.content[0].transcript;
          console.log('User transcript from completed item:', userTranscript);
          
          // Process as user transcription
          this.processTranscript(userTranscript, event);
        }
        else if (event.item.content[0].text) {
          const userText = event.item.content[0].text;
          console.log('User text from completed item:', userText);
          
          // Process as user text input
          const result: WhisperTranscriptionResult = {
            text: userText,
            task: 'transcribe'
          };
          
          this.notifyTranscriptionUpdate(userText, result);
        }
      }
    }
  }
  
  /**
   * Handle user audio transcription completed event
   */
  private handleUserAudioTranscription(event: any): void {
    console.log('User audio transcription completed event received:', JSON.stringify(event, null, 2));
    
    // First check for direct transcript field in the event (based on observed structure)
    if (event.transcript) {
      const transcript = event.transcript.trim();
      console.log('User transcript found directly in event.transcript:', transcript);
      // Process the transcript
      this.processTranscript(transcript, event);
      return;
    }
    
    // Then try to get transcript using the structure shown in the documentation example
    if (event.item && event.item.content && event.item.content.length > 0) {
      const transcript = event.item.content[0].transcript;
      if (transcript) {
        console.log('User transcript found in item.content[0].transcript:', transcript);
        // Process the transcript
        this.processTranscript(transcript, event);
        return;
      }
    }
    
    // If not found using the above structure, try the structure we've been using
    if (event.transcription && event.transcription.text) {
      const transcript = event.transcription.text.trim();
      console.log('User transcript found in transcription.text:', transcript);
      // Process the transcript
      this.processTranscript(transcript, event);
      return;
    }
    
    // If we still don't have a transcript, check for other possible structures
    if (event.item && event.item.input_audio_transcription && event.item.input_audio_transcription.text) {
      const transcript = event.item.input_audio_transcription.text.trim();
      console.log('User transcript found in item.input_audio_transcription.text:', transcript);
      // Process the transcript
      this.processTranscript(transcript, event);
      return;
    }
    
    console.warn('No transcript found in the event. Full event structure:', event);
  }
  
  /**
   * Helper method to process a transcript from any source
   */
  private processTranscript(transcript: string, event: any): void {
    if (!transcript || transcript.trim() === '') {
      console.warn('[WebRTC] Received empty transcript, ignoring');
      return;
    }
    
    // Clean up the transcript (remove trailing newlines, etc.)
    const cleanTranscript = transcript.trim();
    console.log(`[WebRTC] Processing transcript: "${cleanTranscript}"`);
    
    // Update last transcription
    this.lastTranscription = cleanTranscript;
    
    // Create a structured transcription result
    const result: WhisperTranscriptionResult = {
      text: cleanTranscript,
      task: 'transcribe',
    };
    
    // Add metadata if available - check multiple possible locations
    let metadata = null;
    if (event.transcription && event.transcription.metadata) {
      metadata = event.transcription.metadata;
    } else if (event.metadata) {
      metadata = event.metadata;
    } else if (event.item && event.item.metadata) {
      metadata = event.item.metadata;
    } else if (event.item && event.item.input_audio_transcription) {
      metadata = event.item.input_audio_transcription;
    }
    
    if (metadata) {
      if (metadata.duration) result.duration = metadata.duration;
      if (metadata.language) result.language = metadata.language;
      if (metadata.segments) result.segments = metadata.segments;
      if (metadata.words) result.words = metadata.words;
      
      console.log('[WebRTC] Audio transcription metadata:', {
        duration: result.duration,
        language: result.language,
        segments: result.segments?.length || 0,
        words: result.words?.length || 0
      });
    }
    
    // CRITICAL: Make sure we pass the transcript to the UI
    console.log(`[WebRTC] Notifying subscribers about transcript: "${cleanTranscript}"`);
    
    // First call with just the text for immediate display
    this.notifyTranscriptionUpdate(cleanTranscript);
    
    // Then call with the full result object for metadata
    this.notifyTranscriptionUpdate(cleanTranscript, result);
    
    console.log('[WebRTC] Subscribers notified of user audio transcription');
    
    // Store on server
    this.storeTranscriptionOnServer(cleanTranscript);
    console.log('[WebRTC] Transcription stored on server');
  }
  
  /**
   * Handle output item added event
   */
  private handleOutputItemAdded(event: any): void {
    console.log('Output item added:', event);
    
    // Check if the item contains transcriptions
    if (event.item && event.item.content_block && event.item.content_block.type === 'text') {
      const text = event.item.content_block.text?.trim();
      if (text) {
        console.log('Text from output item:', text);
        
        // Notify as AI response
        this.notifyAIResponse(text, false);
      }
    }
  }
  
  /**
   * Handle rate limits updated event
   */
  private handleRateLimitsUpdated(event: any): void {
    console.log('Rate limits updated:', event.rate_limits);
    
    // You can display this information to users or adjust behavior based on limits
    if (event.rate_limits.resets_at) {
      const resetTime = new Date(event.rate_limits.resets_at);
      console.log('Rate limits reset at:', resetTime.toLocaleString());
    }
    
    // Check for critical rate limit warnings
    if (event.rate_limits.remaining && event.rate_limits.remaining.requests < 5) {
      console.warn('Warning: Low remaining API requests:', event.rate_limits.remaining.requests);
      this.notifyStatusChange('warning', `Rate limit: ${event.rate_limits.remaining.requests} requests remaining`);
    }
  }
  
  /**
   * Handle audio transcript delta events
   */
  private handleAudioTranscriptDelta(event: any): void {
    if (event.delta) {
      console.log('Audio transcript delta:', event.delta);
      
      // This is similar to response.text.delta but for audio transcript
      // Accumulate the transcription of audio
      this.currentAIResponse += event.delta;
      
      // Notify AI response callbacks with partial response
      this.notifyAIResponse(this.currentAIResponse, false);
    }
  }

  /**
   * Handle audio transcript done events
   */
  private handleAudioTranscriptDone(event: any): void {
    if (event.transcript) {
      console.log('Audio transcript done:', event.transcript);
      
      // This is the final transcript for the audio
      this.currentAIResponse = event.transcript;
      
      // Notify AI response callbacks with final transcript
      this.notifyAIResponse(this.currentAIResponse, true);
      
      // Reset for next response
      this.currentAIResponse = '';
    }
  }
  
  /**
   * Handle session update events
   */
  private handleSessionUpdate(event: any): void {
    console.log('Session updated:', event.session);
    
    // Check if input audio transcription configuration was updated
    if (event.session.input_audio_transcription) {
      console.log('Input audio transcription updated:', event.session.input_audio_transcription);
    }
  }
  
  /**
   * Handle input transcription created event
   */
  private handleInputTranscriptionCreated(event: any): void {
    console.log('Input transcription created:', event);
    // Reset any previous transcription
    this.lastTranscription = '';
  }
  
  /**
   * Handle input transcription delta event
   */
  private handleInputTranscriptionDelta(event: any): void {
    console.log('[DEBUG] handleInputTranscriptionDelta called with event:', JSON.stringify(event, null, 2));
    
    if (event.delta) {
      // Accumulate partial transcription
      const prevTranscription = this.lastTranscription;
      this.lastTranscription += event.delta;
      
      console.log(`[DEBUG] Input transcription delta: "${event.delta}"`);
      console.log(`[DEBUG] Transcription updated from "${prevTranscription}" to "${this.lastTranscription}"`);
      
      // Create a simple transcription result
      const result: WhisperTranscriptionResult = {
        text: this.lastTranscription,
        task: 'transcribe'
      };
      
      // Notify subscribers with interim transcription - this is critical for UI display
      console.log('[DEBUG] About to notify subscribers of interim transcription');
      this.notifyTranscriptionUpdate(this.lastTranscription, result);
    } else {
      console.warn('[DEBUG] Received input_audio_transcription.delta event without delta property:', event);
    }
  }
  
  /**
   * Handle input transcription done event
   */
  private handleInputTranscriptionDone(event: any): void {
    console.log('[DEBUG] handleInputTranscriptionDone called with event:', JSON.stringify(event, null, 2));
    
    if (event.transcription) {
      const transcription = event.transcription.trim();
      console.log(`[DEBUG] Final input audio transcription: "${transcription}"`);
      
      // Update last transcription
      this.lastTranscription = transcription;
      
      // Create a structured transcription result
      let result: WhisperTranscriptionResult = {
        text: transcription,
        task: 'transcribe'
      };
      
      // Add metadata if available
      if (event.metadata) {
        result = {
          ...result,
          duration: event.metadata.duration,
          language: event.metadata.language,
          segments: event.metadata.segments,
          words: event.metadata.words
        };
        
        console.log('[DEBUG] Transcription metadata received:', {
          duration: event.metadata.duration,
          language: event.metadata.language,
          segments: event.metadata.segments?.length || 0,
          words: event.metadata.words?.length || 0
        });
      }
      
      // Notify subscribers with final transcription - this is critical for UI display
      console.log('[DEBUG] About to notify subscribers of final transcription');
      this.notifyTranscriptionUpdate(transcription, result);
      
      // Store on server
      this.storeTranscriptionOnServer(transcription);
      
      console.log('[DEBUG] Transcription finalized and notified to UI');
    } else {
      console.warn('[DEBUG] Received input_audio_transcription.done event without transcription property:', event);
    }
  }

  /**
   * Notify all AI response callbacks
   */
  private notifyAIResponse(text: string, isFinal: boolean): void {
    this.aiResponseCallbacks.forEach(callback => {
      callback(text, isFinal);
    });
  }

  /**
   * Store transcription data on the server for persistence
   */
  private async storeTranscriptionOnServer(transcription: string): Promise<void> {
    if (!this.sessionId) return;
    
    try {
      await fetch('/api/demo/realtime-transcription/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          transcription,
        }),
      });
    } catch (error) {
      console.error('Error storing transcription on server:', error);
    }
  }

  /**
   * Close the WebRTC connection
   */
  private closeWebRTCConnection(): void {
    // Stop media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Clear audio element
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
  }

  /**
   * Notify all status callbacks
   */
  private notifyStatusChange(status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'warning', message?: string): void {
    this.statusCallbacks.forEach(callback => {
      callback(status, message);
    });
  }

  /**
   * Notify all transcription update callbacks
   */
  private notifyTranscriptionUpdate(text: string, result?: WhisperTranscriptionResult): void {
    console.log(`[DEBUG] notifyTranscriptionUpdate called with text: "${text}" (${this.updateCallbacks.length} subscribers)`);
    
    if (this.updateCallbacks.length === 0) {
      console.warn('[DEBUG] WARNING: No subscribers to transcription updates!');
    }
    
    this.updateCallbacks.forEach((callback, index) => {
      console.log(`[DEBUG] Calling transcription subscriber #${index}...`);
      try {
        callback(text, result);
        console.log(`[DEBUG] Successfully called transcription subscriber #${index}`);
      } catch (error) {
        console.error(`[DEBUG] Error in transcription subscriber #${index}:`, error);
      }
    });
  }

  public setVoiceConfig(config: VoiceConfig): void {
    this.voiceConfig = {
      ...this.voiceConfig,
      ...config
    };
    console.log('Voice config updated:', this.voiceConfig);
  }

  /**
   * Handle audio chunk events
   */
  private handleAudioChunk(event: any): void {
    // Audio chunks are handled automatically by the WebRTC audio stream
    // but we can log them if needed for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Audio chunk received for item:', event.item_id);
    }
  }

  /**
   * Handle speech started event
   * This event is fired when the user starts speaking
   */
  private handleSpeechStarted(event: any): void {
    console.log('User speech started:', event);
    
    // Reset any previous transcription when a new speech segment starts
    // We don't reset lastTranscription yet since we might be getting
    // partial updates for the previous segment
    
    // Notify subscribers that speech has started
    // This can be used to update UI elements to show that the user is speaking
    this.notifyStatusChange('connected', 'User is speaking');
    
    // You could emit an event or call a callback function here to update the UI
    // to show that the user is speaking, like displaying a microphone icon
    // or changing the color of a recording indicator
  }
  
  /**
   * Handle speech stopped event
   * This event is fired when the user stops speaking
   */
  private handleSpeechStopped(event: any): void {
    console.log('User speech stopped:', event);
    
    // At this point, we've detected the end of speech but we're still waiting
    // for the transcription to complete, so we don't reset lastTranscription yet
    
    // Notify subscribers that speech has stopped
    // This can be used to update UI elements to show that the user is no longer speaking
    this.notifyStatusChange('connected', 'Processing speech');
    
    // You could emit an event or call a callback function here to update the UI
    // to show that the system is processing the user's speech, like displaying
    // a loading indicator or "Processing..." message
  }
}

export default WebRTCTranscriptionService; 