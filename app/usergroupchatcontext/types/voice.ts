import { VoiceModeState } from '../services/voice/VoiceModeManager';

/**
 * Voice Activity Detection modes
 */
export type VadMode = 'auto' | 'sensitive' | 'manual';

/**
 * Voice options available from OpenAI
 */
export type VoiceOption = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'coral';

/**
 * Audio quality settings for voice interactions
 */
export type AudioQuality = 'standard' | 'high-quality';

/**
 * Modality options for interaction
 */
export type Modality = 'text' | 'audio' | 'both';

/**
 * Voice state change event data
 */
export interface VoiceStateChangeEvent {
  prevState: VoiceModeState;
  nextState: VoiceModeState;
  isRecording: boolean;
  isProcessing: boolean;
  timestamp: number;
}

/**
 * Voice settings that control speech recognition and synthesis
 */
export interface VoiceSettings {
  // Voice Activity Detection
  vadMode: VadMode;
  vadThreshold?: number; // 0.1-0.9
  prefixPaddingMs?: number;
  silenceDurationMs?: number;
  
  // Audio format
  audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  sampleRate?: number;
  
  // Turn detection
  turnDetection?: {
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
    createResponse?: boolean;
  };
  
  // Voice options
  defaultVoice?: VoiceOption;
  defaultVoiceModel?: string;
  speed?: number;
  quality?: AudioQuality;
  
  // Voice transition settings
  showTransitionFeedback?: boolean;
  keepPreprocessingHooks?: boolean;
  keepPostprocessingHooks?: boolean;
  preserveVoiceHistory?: boolean;
  automaticVoiceSelection?: boolean;
  
  // Accessibility options
  textToSpeechEnabled?: boolean;
  
  // General settings
  modality?: Modality;
  
  // Echo prevention
  preventEchoDetection?: boolean;
  enhancedAudioProcessing?: boolean;
  muteMicDuringPlayback?: boolean;
}

/**
 * Bot-specific voice settings that override global settings
 */
export interface BotVoiceSettings {
  voice?: VoiceOption;
  speed?: number;
  quality?: AudioQuality;
  model?: string;
}

/**
 * Voice processing metadata for messages
 */
export interface VoiceProcessingMetadata {
  transcriptionConfidence?: number;
  speechDuration?: number;
  speechModel?: string;
  interimTranscripts?: string[];
  wakeWordDetected?: boolean;
  audioLevel?: number;
  isInterim?: boolean;
}

/**
 * Voice ghost data structure
 */
export interface VoiceGhost {
  id: string;
  originalBotId: string;
  bot: any;
  conversationContext?: any[];
  created: number;
  lastActive?: number;
}

/**
 * Voice session data for analytics and debugging
 */
export interface VoiceSessionData {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  messageCount: number;
  botIds: string[];
  errorCount: number;
  lastError?: string;
}

/**
 * Voice transition metrics
 */
export interface VoiceTransitionMetrics {
  direction: 'text-to-voice' | 'voice-to-text';
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
}

// Voice Configuration
export interface VoiceConfig {
  voice: string;  // alloy, echo, fable, onyx, nova, shimmer
  speed: number;  // 0.25 to 4.0
  enabled: boolean;
  useCustomVoice: boolean;
  customVoiceId?: string;
}

// Transcription Metadata
export interface TranscriptionMetadata {
  duration: number;
  confidence: number;
  interim: boolean;
  segments?: Array<TranscriptionSegment>;
}

// Transcription Segment
export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

// Audio Track Metadata
export interface AudioTrackMetadata {
  trackId: string;
  roomId: string;
  duration: number;
}

// LiveKit Room Configuration
export interface LiveKitRoomConfig {
  roomName: string;
  token: string;
  serverUrl: string;
  connectOptions?: {
    autoSubscribe: boolean;
    adaptiveStream: boolean;
    dynacast: boolean;
  };
}

// Multimodal Agent Configuration
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

// Voice Activity Options
export interface VoiceActivityOptions {
  mode: 'auto' | 'sensitive' | 'manual';
  threshold?: number; // 0.1-0.9, default 0.3
  silenceDurationMs?: number; // default 1000
  prefixPaddingMs?: number; // default 500
}

// Voice Activity State
export interface VoiceActivityState {
  isSpeaking: boolean;
  level: number;
  timestamp: number;
}

// Types for Handlers
export type VoiceActivityCallback = (state: VoiceActivityState) => void;
export type TranscriptionHandler = (text: string, isFinal: boolean) => void;
export type AudioOutputHandler = (audioChunk: ArrayBuffer) => void;

// LiveKit Session Types
export interface RoomSession {
  roomName: string;
  participants: Map<string, any>; // LiveKit's RemoteParticipant | LocalParticipant types
  audioTracks: Map<string, any>; // LiveKit's AudioTrack type
}

// LiveKit Connection Options
export interface LiveKitConnectionOptions {
  url: string;
  token: string;
  roomName: string;
  connectOptions?: {
    autoSubscribe?: boolean;
    adaptiveStream?: boolean;
    dynacast?: boolean;
  };
} 