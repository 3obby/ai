// Voice Settings Type
export interface VoiceSettings {
  // Voice Activity Detection
  vadMode: 'auto' | 'sensitive' | 'manual';
  vadThreshold?: number; // 0.1-0.9
  prefixPaddingMs?: number;
  silenceDurationMs?: number;
  
  // Audio Processing
  audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  sampleRate?: number;
  
  // Turn Detection
  turnDetection?: {
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
    createResponse?: boolean;
  };
  
  // Default Voice
  defaultVoice?: string;
  modality?: 'both' | 'text' | 'audio';
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