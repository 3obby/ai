import { v4 as uuidv4 } from 'uuid';

// Define types for callbacks
export type TranscriptionUpdateCallback = (text: string) => void;
export type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void;
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
      // Create a message event
      const messageEvent = {
        type: "message.create",
        message: {
          content: text,
          role: "user"
        }
      };
      
      // Send the message to OpenAI
      this.dataChannel.send(JSON.stringify(messageEvent));
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
      
      // Send a greeting to start the conversation
      setTimeout(() => {
        this.sendTextMessage("Hello, I'm your AI assistant. How can I help you today?");
      }, 1000);
    } catch (error) {
      console.error('Error sending initial transcription request:', error);
    }
  }

  /**
   * Handle events from the Realtime API
   */
  private handleRealtimeEvent(event: any): void {
    console.log('Received event:', event.type);
    
    // Handle different event types
    switch (event.type) {
      case 'text.created':
        this.handleTextEvent(event);
        break;
      
      case 'response.text.delta':
        this.handleResponseTextDelta(event);
        break;
      
      case 'response.text.done':
        this.handleResponseTextDone(event);
        break;
        
      case 'audio.created':
        // Audio events are automatically handled by the WebRTC audio stream
        console.log('Audio event received - this is handled automatically by WebRTC');
        break;
        
      case 'error':
        console.error('Error from OpenAI Realtime API:', event);
        this.notifyStatusChange('error', event.error?.message || 'Unknown error from OpenAI');
        break;
        
      default:
        // Handle other event types as needed
        console.log('Unhandled event type:', event.type);
        break;
    }
  }

  /**
   * Handle text events from the Realtime API
   */
  private handleTextEvent(event: any): void {
    if (event.text && typeof event.text.value === 'string') {
      const text = event.text.value.trim();
      
      // Append to existing transcription
      const updatedText = this.lastTranscription 
        ? `${this.lastTranscription} ${text}`
        : text;
      
      this.lastTranscription = updatedText;
      
      // Notify listeners
      this.notifyTranscriptionUpdate(updatedText);
      
      // Store the transcription server-side for potential retrieval
      this.storeTranscriptionOnServer(updatedText);
    }
  }
  
  /**
   * Handle response text delta events (AI speaking)
   */
  private handleResponseTextDelta(event: any): void {
    if (event.delta) {
      // Accumulate the AI's response
      this.currentAIResponse += event.delta;
      
      // Notify AI response callbacks with partial response
      this.notifyAIResponse(this.currentAIResponse, false);
    }
  }
  
  /**
   * Handle response text done events (AI finished speaking)
   */
  private handleResponseTextDone(event: any): void {
    if (event.text) {
      // Set the final AI response
      this.currentAIResponse = event.text;
      
      // Notify AI response callbacks with final response
      this.notifyAIResponse(this.currentAIResponse, true);
      
      // Reset for next response
      this.currentAIResponse = '';
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
  private notifyStatusChange(status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string): void {
    this.statusCallbacks.forEach(callback => {
      callback(status, message);
    });
  }

  /**
   * Notify all transcription update callbacks
   */
  private notifyTranscriptionUpdate(text: string): void {
    this.updateCallbacks.forEach(callback => {
      callback(text);
    });
  }

  public setVoiceConfig(config: VoiceConfig): void {
    this.voiceConfig = {
      ...this.voiceConfig,
      ...config
    };
    console.log('Voice config updated:', this.voiceConfig);
  }
}

export default WebRTCTranscriptionService; 