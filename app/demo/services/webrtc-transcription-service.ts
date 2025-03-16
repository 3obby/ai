import { v4 as uuidv4 } from 'uuid';

// Define types for transcript data 
export interface WhisperTranscriptionResult {
  text: string;
  duration: number;
  language: string;
  segments: any[];
  task: string;
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
export type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error', error?: Error) => void;
export type AIResponseCallback = (response: string) => void;

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
  maxResponseTokens?: number; // Max tokens per response, default 4096
  audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw'; // Audio format
  toolSettings?: {
    enabled: boolean;
    allowedTools: string[];
    braveSearchApiKey?: string;
  };
}

// Define ConnectionStatus type
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'warning';

/**
 * Service to handle real-time transcription using WebRTC directly with the transcription service
 */
export class WebRTCTranscriptionService {
  private static instance: WebRTCTranscriptionService | null = null;
  private sessionId: string | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private transcriptionCallbacks: TranscriptionUpdateCallback[] = [];
  private statusCallbacks: ConnectionStatusCallback[] = [];
  private isRecording = false;
  private isStreaming = false;
  private recordingInterval: any = null;
  private processingAudio = false;
  private voiceConfig: VoiceConfig = {
    voice: 'sage',
    vadMode: 'auto',
    modality: 'both'
  };

  private constructor() {}

  public static getInstance(): WebRTCTranscriptionService {
    if (!WebRTCTranscriptionService.instance) {
      WebRTCTranscriptionService.instance = new WebRTCTranscriptionService();
    }
    return WebRTCTranscriptionService.instance;
  }

  /**
   * Subscribe to transcription updates
   */
  public subscribeToTranscriptionUpdates(callback: TranscriptionUpdateCallback): void {
    this.transcriptionCallbacks.push(callback);
  }

  /**
   * Unsubscribe from transcription updates
   */
  public unsubscribeFromTranscriptionUpdates(callback: TranscriptionUpdateCallback): void {
    this.transcriptionCallbacks = this.transcriptionCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Subscribe to connection status changes
   */
  public subscribeToConnectionStatus(callback: ConnectionStatusCallback): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Unsubscribe from connection status changes
   */
  public unsubscribeFromConnectionStatus(callback: ConnectionStatusCallback): void {
    this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.mediaStream !== null;
  }

  /**
   * Check if currently recording
   */
  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Check if currently streaming
   */
  public isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Start a WebRTC transcription session
   */
  public async startTranscription(): Promise<void> {
    try {
      this.notifyStatusChange('connecting');
      
      // Generate a unique session ID for this transcription session
      this.sessionId = uuidv4();
      
      // Request microphone access with enhanced audio settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Configure the media recorder to capture audio
      const mimeType = 'audio/webm';
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 16000
      });

      // Set up the data available event to collect audio chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.processAudioChunk();
        }
      };

      // Start recording
      this.mediaRecorder.start(2000); // Collect data every 2 seconds
      this.isRecording = true;
      this.isStreaming = true;
      
      // Notify of successful connection
      this.notifyStatusChange('connected');

      console.log('Transcription started successfully');
    } catch (error) {
      console.error('Error starting transcription:', error);
      this.notifyStatusChange('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async processAudioChunk(): Promise<void> {
    if (this.processingAudio || this.recordedChunks.length === 0) return;
    
    try {
      this.processingAudio = true;
      
      // Create a blob from the collected chunks
      const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      this.recordedChunks = []; // Clear for next batch
      
      // Create form data for the API request
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      
      // Send to OpenAI API directly
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        return;
      }
      
      const data = await response.json();
      
      // Process the transcription result
      if (data && data.text) {
        const result: WhisperTranscriptionResult = {
          text: data.text.trim(),
          duration: data.duration || 0,
          language: data.language || 'en',
          segments: data.segments || [],
          task: 'transcribe'
        };
        
        // Notify all subscribers of the transcription result
        this.notifyTranscriptionUpdate(result.text, result);
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    } finally {
      this.processingAudio = false;
    }
  }

  /**
   * Notify all transcription update callbacks
   */
  private notifyTranscriptionUpdate(text: string, result?: WhisperTranscriptionResult): void {
    this.transcriptionCallbacks.forEach(callback => {
      try {
        callback(text, result);
      } catch (error) {
        console.error('Error in transcription callback:', error);
      }
    });
  }

  /**
   * Notify all connection status callbacks
   */
  private notifyStatusChange(status: 'connecting' | 'connected' | 'disconnected' | 'error', error?: Error): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status, error);
      } catch (callbackError) {
        console.error('Error in status callback:', callbackError);
      }
    });
  }

  /**
   * Stop a WebRTC transcription session
   */
  public stopTranscription(): void {
    try {
      // Stop media recorder if active
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        this.isRecording = false;
      }

      // Stop all media tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Clear any intervals
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      // Reset state
      this.isStreaming = false;
      this.sessionId = null;
      this.recordedChunks = [];
      
      // Notify of disconnection
      this.notifyStatusChange('disconnected');
      
      console.log('Transcription stopped successfully');
    } catch (error) {
      console.error('Error stopping transcription:', error);
      this.notifyStatusChange('error', error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export default WebRTCTranscriptionService; 