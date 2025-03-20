/**
 * ConnectionManager
 * 
 * A unified manager for WebRTC connections and media streams.
 * Centralizes connection logic and state management.
 */

import { EventEmitter } from 'events';
import eventBus from '../events/EventBus';

export interface ConnectionConfig {
  roomName?: string;
  userName?: string;
  enableAudio?: boolean;
  enableVideo?: boolean;
  audioConstraints?: MediaTrackConstraints;
  videoConstraints?: MediaTrackConstraints;
  autoReconnect?: boolean;
  reconnectMaxAttempts?: number;
  reconnectDelay?: number;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface MediaStreamInfo {
  stream: MediaStream;
  audioTracks: MediaStreamTrack[];
  videoTracks: MediaStreamTrack[];
  timestamp: number;
}

export class ConnectionManager extends EventEmitter {
  private static instance: ConnectionManager;
  
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private localStream: MediaStream | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private error: Error | null = null;
  
  private config: ConnectionConfig = {
    roomName: 'default',
    userName: 'user',
    enableAudio: true,
    enableVideo: false,
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    videoConstraints: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 }
    },
    autoReconnect: true,
    reconnectMaxAttempts: 5,
    reconnectDelay: 2000
  };
  
  private constructor() {
    super();
    
    // Initialize event listeners
    this.setupEventListeners();
  }
  
  /**
   * Get the singleton instance of ConnectionManager
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }
  
  /**
   * Setup internal event listeners
   */
  private setupEventListeners(): void {
    // Handle browser beforeunload to clean up resources
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }
  
  /**
   * Initialize the connection manager with configuration
   */
  public initialize(config?: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Log initialization
    console.log('ConnectionManager initialized with config:', this.config);
    
    // Emit events
    this.emit('initialized', this.config);
    eventBus.emit('system:initialized', undefined);
  }
  
  /**
   * Connect and get local media stream
   */
  public async connect(): Promise<MediaStreamInfo | null> {
    if (this.state === ConnectionState.CONNECTED) {
      console.log('Already connected');
      
      if (this.localStream) {
        return this.getMediaStreamInfo(this.localStream);
      }
      
      return null;
    }
    
    this.setState(ConnectionState.CONNECTING);
    
    try {
      // Get user media (microphone/camera)
      const stream = await this.getUserMedia();
      
      // Store the local stream
      this.localStream = stream;
      
      // Set connected state
      this.setState(ConnectionState.CONNECTED);
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      
      // Return the stream info
      const streamInfo = this.getMediaStreamInfo(stream);
      
      // Emit audio started event
      eventBus.emit('audio:started', { timestamp: Date.now() });
      
      return streamInfo;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
  
  /**
   * Disconnect and clean up resources
   */
  public disconnect(): void {
    // Stop all tracks in the local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      
      this.localStream = null;
    }
    
    // Clear any reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset state
    this.setState(ConnectionState.DISCONNECTED);
    
    // Emit audio stopped event
    eventBus.emit('audio:stopped', { timestamp: Date.now() });
    
    console.log('Disconnected from media devices');
  }
  
  /**
   * Reconnect after connection failure
   */
  private attemptReconnect(): void {
    if (!this.config.autoReconnect) return;
    
    // Check if we've exceeded max reconnect attempts
    if (this.reconnectAttempts >= (this.config.reconnectMaxAttempts || 5)) {
      console.error('Exceeded maximum reconnect attempts');
      this.setState(ConnectionState.ERROR);
      return;
    }
    
    // Set reconnecting state
    this.setState(ConnectionState.RECONNECTING);
    
    // Increment reconnect attempts
    this.reconnectAttempts++;
    
    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Schedule reconnect attempt
    this.reconnectTimeout = setTimeout(async () => {
      console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.config.reconnectMaxAttempts}`);
      
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnect failed:', error);
        this.attemptReconnect();
      }
    }, this.config.reconnectDelay);
  }
  
  /**
   * Handle connection error
   */
  private handleError(error: Error): void {
    console.error('Connection error:', error);
    
    // Store the error
    this.error = error;
    
    // Set error state
    this.setState(ConnectionState.ERROR);
    
    // Emit error events
    this.emit('error', error);
    eventBus.emit('audio:error', { error, context: 'connection' });
    
    // Attempt reconnect if configured
    if (this.config.autoReconnect) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Set connection state
   */
  private setState(state: ConnectionState): void {
    const prevState = this.state;
    this.state = state;
    
    // Emit state change event
    this.emit('state:changed', { prevState, state });
    
    // Log state change
    console.log(`ConnectionManager state changed: ${prevState} -> ${state}`);
  }
  
  /**
   * Get user media (microphone/camera)
   */
  private async getUserMedia(): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: this.config.enableAudio ? this.config.audioConstraints : false,
      video: this.config.enableVideo ? this.config.videoConstraints : false
    };
    
    try {
      // Request user media
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got user media stream:', stream);
      
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      
      // Handle permission errors specifically
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied by user');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found on this device');
        }
      }
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Get media stream info from stream
   */
  private getMediaStreamInfo(stream: MediaStream): MediaStreamInfo {
    return {
      stream,
      audioTracks: stream.getAudioTracks(),
      videoTracks: stream.getVideoTracks(),
      timestamp: Date.now()
    };
  }
  
  /**
   * Get the current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }
  
  /**
   * Get the current error (if any)
   */
  public getError(): Error | null {
    return this.error;
  }
  
  /**
   * Get the local media stream
   */
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }
  
  /**
   * Get the current configuration
   */
  public getConfig(): ConnectionConfig {
    return { ...this.config };
  }
  
  /**
   * Update the configuration
   */
  public updateConfig(config: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }
  
  /**
   * Check if audio is enabled
   */
  public isAudioEnabled(): boolean {
    if (!this.localStream) return false;
    
    const audioTracks = this.localStream.getAudioTracks();
    return audioTracks.length > 0 && audioTracks[0].enabled;
  }
  
  /**
   * Enable or disable audio
   */
  public setAudioEnabled(enabled: boolean): void {
    if (!this.localStream) return;
    
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
    
    this.emit('audio:enabled', { enabled });
    console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if video is enabled
   */
  public isVideoEnabled(): boolean {
    if (!this.localStream) return false;
    
    const videoTracks = this.localStream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks[0].enabled;
  }
  
  /**
   * Enable or disable video
   */
  public setVideoEnabled(enabled: boolean): void {
    if (!this.localStream) return;
    
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
    
    this.emit('video:enabled', { enabled });
    console.log(`Video ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }
}

// Export singleton instance
const connectionManager = ConnectionManager.getInstance();
export default connectionManager; 