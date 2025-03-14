'use client';

import { v4 as uuidv4 } from 'uuid';

export type TranscriptionUpdateCallback = (text: string) => void;
export type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error', error?: string) => void;

/**
 * Service to handle real-time transcription using WebSockets via the server API
 */
class RealtimeTranscriptionService {
  private static instance: RealtimeTranscriptionService;
  private sessionId: string | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private isRecording = false;
  private updateCallbacks: TranscriptionUpdateCallback[] = [];
  private statusCallbacks: ConnectionStatusCallback[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private lastTranscription: string = '';
  private consecutiveErrors: number | undefined = undefined;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RealtimeTranscriptionService {
    if (!RealtimeTranscriptionService.instance) {
      RealtimeTranscriptionService.instance = new RealtimeTranscriptionService();
    }
    return RealtimeTranscriptionService.instance;
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
   * Start a real-time transcription session
   */
  public async startTranscription(): Promise<boolean> {
    if (this.isRecording) {
      console.log('Already recording');
      return false;
    }

    try {
      // Generate a new session ID
      this.sessionId = uuidv4();
      
      // Notify status change
      this.notifyStatusChange('connecting');
      
      // Start the server-side WebSocket connection
      const response = await fetch('/api/demo/realtime-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          action: 'connect',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to connect to transcription service:', response.status, error);
        this.notifyStatusChange('error', error.error || `Failed to connect (${response.status})`);
        return false;
      }
      
      // Start polling for transcription updates
      this.startPollingForUpdates();
      
      // Start capturing audio
      await this.startAudioCapture();
      
      // Update status
      this.notifyStatusChange('connected');
      this.isRecording = true;
      
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
    if (!this.isRecording || !this.sessionId) {
      return;
    }

    // Stop the media recorder
    this.stopAudioCapture();
    
    // Stop polling for updates
    this.stopPollingForUpdates();
    
    try {
      // Disconnect the WebSocket connection
      await fetch('/api/demo/realtime-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          action: 'disconnect',
        }),
      });
      
      // Reset state
      this.isRecording = false;
      this.notifyStatusChange('disconnected');
      this.sessionId = null;
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
   * Check if currently recording
   */
  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Start polling for transcription updates
   */
  private startPollingForUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Poll for updates every 500ms
    this.updateInterval = setInterval(() => {
      this.pollForTranscriptionUpdates();
    }, 500);
  }

  /**
   * Stop polling for updates
   */
  private stopPollingForUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Poll the server for transcription updates
   */
  private async pollForTranscriptionUpdates(): Promise<void> {
    if (!this.sessionId) return;
    
    try {
      const response = await fetch(`/api/demo/realtime-transcription/updates?sessionId=${this.sessionId}`);
      
      if (!response.ok) {
        // Stop polling if we get a 404 (connection closed)
        if (response.status === 404) {
          console.warn('Transcription session not found (404). Attempting to reconnect...');
          
          // Try to reconnect
          const reconnectResult = await this.attemptReconnect();
          if (!reconnectResult) {
            this.stopPollingForUpdates();
            this.notifyStatusChange('disconnected');
          }
          return;
        }
        
        return;
      }
      
      const data = await response.json();
      
      // Only notify if the transcription has changed
      if (data.transcription && data.transcription !== this.lastTranscription) {
        this.lastTranscription = data.transcription;
        this.notifyTranscriptionUpdate(data.transcription);
      }
    } catch (error) {
      console.error('Error polling for updates:', error);
    }
  }

  /**
   * Attempt to reconnect after a connection loss
   */
  private async attemptReconnect(): Promise<boolean> {
    console.log('Attempting to reconnect transcription service...');
    
    if (!this.sessionId) return false;
    
    try {
      // Try to reconnect the WebSocket
      const response = await fetch('/api/demo/realtime-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          action: 'connect',
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to reconnect:', response.status);
        return false;
      }
      
      console.log('Reconnection successful');
      return true;
    } catch (error) {
      console.error('Error during reconnection attempt:', error);
      return false;
    }
  }

  /**
   * Start capturing audio
   */
  private async startAudioCapture(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      
      // Determine the best MIME type
      const mimeType = this.getSupportedMimeType();
      
      // Create the media recorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      
      // Set up event handlers
      this.mediaRecorder.ondataavailable = this.handleAudioDataAvailable.bind(this);
      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
      };
      
      // Start recording in 1 second chunks
      this.mediaRecorder.start(1000);
      console.log('MediaRecorder started', mimeType);
    } catch (error) {
      console.error('Error starting audio capture:', error);
      this.notifyStatusChange('error', 'Failed to access microphone');
      throw error;
    }
  }

  /**
   * Stop audio capture
   */
  private stopAudioCapture(): void {
    // Stop the media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    
    // Reset state
    this.mediaRecorder = null;
    this.mediaStream = null;
  }

  /**
   * Handle audio data from the media recorder
   */
  private async handleAudioDataAvailable(event: BlobEvent): Promise<void> {
    if (!this.sessionId || !this.isRecording || event.data.size === 0) {
      return;
    }
    
    try {
      // Skip very small chunks (likely silence)
      if (event.data.size < 1000) {
        console.log('Skipping small audio chunk (likely silence)');
        return;
      }
      
      // Convert the blob to base64
      const base64Data = await this.blobToBase64(event.data);
      
      // Send the audio data to the server
      const response = await fetch('/api/demo/realtime-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          action: 'sendAudio',
          audioData: base64Data,
        }),
      });
      
      // Handle errors
      if (!response.ok) {
        // If we get a 404, the session may have expired or been reset
        if (response.status === 404) {
          console.warn('Session not found when sending audio. Attempting to reconnect...');
          const reconnectResult = await this.attemptReconnect();
          if (!reconnectResult) {
            // If reconnection failed, stop recording
            this.stopTranscription();
          }
        } else if (response.status === 400) {
          // For 400 Bad Request errors, get the detailed error message
          let errorDetails = 'Unknown error';
          try {
            const errorResponse = await response.json();
            errorDetails = errorResponse.details || errorResponse.error || 'Unknown error';
          } catch (parseError) {
            // If we can't parse the JSON, use the status text
            errorDetails = response.statusText;
          }
          
          console.error(`Error sending audio data (400 Bad Request): ${errorDetails}`);
          
          // If this is a consistent error, we might need to restart the session
          if (this.consecutiveErrors === undefined) {
            this.consecutiveErrors = 1;
          } else {
            this.consecutiveErrors++;
          }
          
          // If we get too many consecutive errors, reconnect
          if (this.consecutiveErrors > 3) {
            console.warn('Too many consecutive errors. Attempting to reconnect...');
            this.consecutiveErrors = 0;
            const reconnectResult = await this.attemptReconnect();
            if (!reconnectResult) {
              // If reconnection failed, stop recording
              this.stopTranscription();
            }
          }
        } else {
          console.error(`Error sending audio data: ${response.status}`);
          
          // For server errors (500+), we should also try to reconnect
          if (response.status >= 500) {
            const reconnectResult = await this.attemptReconnect();
            if (!reconnectResult) {
              this.stopTranscription();
            }
          }
        }
      } else {
        // Reset consecutive errors counter on success
        this.consecutiveErrors = 0;
      }
    } catch (error) {
      console.error('Error sending audio data:', error);
    }
  }

  /**
   * Convert a blob to a base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Extract the base64 data
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get the best supported MIME type for audio recording
   */
  private getSupportedMimeType(): string {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
    ];
    
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    
    return '';
  }

  /**
   * Notify all update callbacks of a new transcription
   */
  private notifyTranscriptionUpdate(text: string): void {
    for (const callback of this.updateCallbacks) {
      callback(text);
    }
  }

  /**
   * Notify all status callbacks of a connection status change
   */
  private notifyStatusChange(status: 'connecting' | 'connected' | 'disconnected' | 'error', error?: string): void {
    for (const callback of this.statusCallbacks) {
      callback(status, error);
    }
  }
}

export default RealtimeTranscriptionService; 