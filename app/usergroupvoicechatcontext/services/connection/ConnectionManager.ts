/**
 * ConnectionManager
 * 
 * A unified manager for WebRTC connections and media streams.
 * Centralizes connection logic and state management.
 */

import { EventEmitter } from 'events';
import eventBus from '../events/EventBus';

// Add proper typings for WebKit prefixed interfaces
interface Window {
  webkitAudioContext: typeof AudioContext;
  webkitSpeechRecognition: any;
}

// Add proper AudioContext options type if needed
interface AudioContextOptions {
  latencyHint?: 'interactive' | 'balanced' | 'playback' | number;
  sampleRate?: number;
}

/**
 * Connection options interface
 */
export interface ConnectionOptions {
  audioOnly?: boolean;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  lowLatency?: boolean;
}

/**
 * Connection state information object
 */
export interface ConnectionStateInfo {
  isConnected: boolean;
  isConnecting: boolean;
  hasStream: boolean;
  hasMicrophonePermission: boolean;
  timestamp: number;
}

/**
 * Connection state enum
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

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

export interface MediaStreamInfo {
  stream: MediaStream;
  audioTracks: MediaStreamTrack[];
  videoTracks: MediaStreamTrack[];
  timestamp: number;
}

export interface BrowserCapabilities {
  supportsWebRTC: boolean;
  supportsMediaDevices: boolean;
  supportsAudioContext: boolean;
  supportsSpeechRecognition: boolean;
  name: string;
  version: string;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  requiresUserGesture: boolean;
}

export function detectBrowserCapabilities(): BrowserCapabilities {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Mobile/.test(ua);
  
  // Detect browser name and version
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edge|Edg/.test(ua);
  const isEdge = /Edge|Edg/.test(ua);
  
  let name = "Unknown";
  let version = "Unknown";
  
  if (isChrome) {
    name = "Chrome";
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    version = match ? match[1] : "Unknown";
  } else if (isFirefox) {
    name = "Firefox";
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    version = match ? match[1] : "Unknown";
  } else if (isSafari) {
    name = "Safari";
    const match = ua.match(/Version\/(\d+\.\d+)/);
    version = match ? match[1] : "Unknown";
  } else if (isEdge) {
    name = "Edge";
    const match = ua.match(/Edge\/(\d+\.\d+)|Edg\/(\d+\.\d+)/);
    version = match ? (match[1] || match[2]) : "Unknown";
  }
  
  // Feature detection is more reliable than browser detection
  const supportsWebRTC = (
    typeof RTCPeerConnection !== 'undefined' && 
    typeof navigator.mediaDevices !== 'undefined' && 
    typeof navigator.mediaDevices.getUserMedia !== 'undefined'
  );
  
  const supportsMediaDevices = (
    typeof navigator.mediaDevices !== 'undefined' && 
    typeof navigator.mediaDevices.enumerateDevices !== 'undefined'
  );
  
  const supportsAudioContext = (
    typeof (window.AudioContext || (window as any).webkitAudioContext) !== 'undefined'
  );
  
  const supportsSpeechRecognition = (
    typeof (window.SpeechRecognition || (window as any).webkitSpeechRecognition) !== 'undefined'
  );
  
  // iOS/Safari requires user gesture to start audio
  const requiresUserGesture = isIOS || isSafari;
  
  return {
    supportsWebRTC,
    supportsMediaDevices,
    supportsAudioContext,
    supportsSpeechRecognition,
    name,
    version,
    isIOS,
    isAndroid,
    isMobile,
    requiresUserGesture
  };
}

/**
 * Enhanced connection state information
 */
export interface EnhancedConnectionStateInfo extends ConnectionStateInfo {
  lastError?: Error;
  reconnectAttempts: number;
  browserCapabilities: BrowserCapabilities;
  fallbackMode: boolean;
  errorDetails?: {
    code?: string;
    name?: string;
    message: string;
    timestamp: number;
    browserInfo: string;
  };
}

export interface EnhancedConnectionOptions extends ConnectionOptions {
  enableFallbackMode?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  useLowLatencyMode?: boolean;
  forcePolyfill?: boolean;
  audioContextOptions?: AudioContextOptions;
  mediaConstraintsOverride?: MediaStreamConstraints;
  iosWorkarounds?: boolean;
}

export function getOptimizedMediaConstraints(capabilities: BrowserCapabilities): MediaStreamConstraints {
  // Base constraints that work for most browsers
  const baseConstraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  };
  
  // Safari doesn't support some of the advanced constraints
  if (capabilities.name === 'Safari') {
    return {
      audio: true,
      video: false
    };
  }
  
  // Chrome/Edge support advanced audio constraints
  if (capabilities.name === 'Chrome' || capabilities.name === 'Edge') {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // @ts-ignore - Chrome-specific properties
        googEchoCancellation: true,
        googNoiseSuppression: true,
        googAutoGainControl: true,
        googHighpassFilter: true
      },
      video: false
    };
  }
  
  // Firefox has different naming for some constraints
  if (capabilities.name === 'Firefox') {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // @ts-ignore - Firefox-specific properties
        mozAutoGainControl: true,
        mozNoiseSuppression: true
      },
      video: false
    };
  }
  
  // For all other browsers or mobile devices
  return baseConstraints;
}

export function handleBrowserSpecificError(error: any, capabilities: BrowserCapabilities): { 
  message: string, 
  retry: boolean,
  fallback: boolean 
} {
  // Default response
  let result = {
    message: error.message || 'Unknown WebRTC error',
    retry: false,
    fallback: false
  };
  
  // NotAllowedError - Permission denied
  if (error.name === 'NotAllowedError' || error.message?.includes('Permission denied')) {
    result.message = 'Microphone access was denied. Please grant permission to use your microphone.';
    result.retry = true;
    return result;
  }
  
  // NotFoundError - No microphone available
  if (error.name === 'NotFoundError' || error.message?.includes('Requested device not found')) {
    result.message = 'No microphone was found. Please connect a microphone and try again.';
    result.retry = false;
    return result;
  }
  
  // NotReadableError - Hardware/OS error
  if (error.name === 'NotReadableError' || error.message?.includes('Could not start audio')) {
    result.message = 'Could not access your microphone. It may be in use by another application.';
    result.retry = true;
    return result;
  }
  
  // Safari-specific issues
  if (capabilities.name === 'Safari') {
    if (capabilities.isIOS && error.message?.includes('audio input')) {
      result.message = 'On iOS, voice mode requires a user gesture. Please tap the voice button again.';
      result.retry = true;
      return result;
    }
    
    if (error.name === 'TypeError' && error.message?.includes('getUserMedia is not a function')) {
      result.message = 'Your browser does not support voice input. Try using Chrome or Firefox.';
      result.fallback = true;
      return result;
    }
  }
  
  // iOS-specific issues
  if (capabilities.isIOS) {
    if (error.message?.includes('audio input')) {
      result.message = 'iOS requires a user gesture to access the microphone. Please tap the voice button again.';
      result.retry = true;
      return result;
    }
  }
  
  // Firefox-specific issues
  if (capabilities.name === 'Firefox') {
    if (error.name === 'MediaDeviceFailedDueToShutdown') {
      result.message = 'Microphone access failed. Please restart Firefox and try again.';
      result.retry = false;
      return result;
    }
  }
  
  // General browser support issue
  if (!capabilities.supportsWebRTC) {
    result.message = 'Your browser does not support voice features. Please use a modern browser like Chrome, Firefox, or Edge.';
    result.fallback = true;
    return result;
  }
  
  // Default case for unhandled errors
  console.error('Unhandled WebRTC error:', error);
  return result;
}

export class FallbackModeHandler {
  private static isActive = false;
  private static capabilities: BrowserCapabilities;
  
  public static initialize(capabilities: BrowserCapabilities) {
    this.capabilities = capabilities;
    this.isActive = !capabilities.supportsWebRTC || 
                    !capabilities.supportsAudioContext ||
                    !capabilities.supportsMediaDevices;
    
    return this.isActive;
  }
  
  public static isEnabled(): boolean {
    return this.isActive;
  }
  
  public static getAlternativeInput(callback: (text: string) => void): (() => void) | null {
    if (!this.isActive) return null;
    
    // Create a simple text input as fallback
    const fallbackContainer = document.createElement('div');
    fallbackContainer.style.position = 'fixed';
    fallbackContainer.style.bottom = '80px';
    fallbackContainer.style.left = '0';
    fallbackContainer.style.right = '0';
    fallbackContainer.style.padding = '10px';
    fallbackContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    fallbackContainer.style.zIndex = '1000';
    fallbackContainer.style.display = 'flex';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type your voice command here...';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = 'none';
    input.style.borderRadius = '4px';
    
    const button = document.createElement('button');
    button.textContent = 'Send';
    button.style.marginLeft = '8px';
    button.style.padding = '8px 16px';
    button.style.backgroundColor = 'var(--primary)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    
    fallbackContainer.appendChild(input);
    fallbackContainer.appendChild(button);
    
    document.body.appendChild(fallbackContainer);
    
    // Set focus to input
    setTimeout(() => input.focus(), 100);
    
    // Handle submit
    const handleSubmit = () => {
      const text = input.value.trim();
      if (text) {
        callback(text);
        input.value = '';
      }
    };
    
    button.addEventListener('click', handleSubmit);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
    
    // Return cleanup function
    return () => {
      document.body.removeChild(fallbackContainer);
    };
  }
  
  public static getCompatibilityMessage(): string {
    if (!this.isActive) return '';
    
    if (!this.capabilities.supportsWebRTC) {
      return 'Voice mode is not available in your browser. Using text input instead.';
    }
    
    if (!this.capabilities.supportsAudioContext) {
      return 'Audio processing is not supported in your browser. Using simplified voice input.';
    }
    
    return 'Using compatibility mode for voice input.';
  }
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