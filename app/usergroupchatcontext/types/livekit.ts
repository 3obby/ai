import { Room } from 'livekit-client';
import { RoomSession } from './voice';
import { VideoGrant } from 'livekit-server-sdk';

// LiveKit Context Type
export interface LiveKitContextType {
  isConnected: boolean;
  isConnecting: boolean;
  room: Room | null;
  activeSession: RoomSession | undefined;
  error: Error | null;
  connect: (roomName: string, token: string, url: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  isSpeaking: boolean;
}

// LiveKit Provider Props
export interface LiveKitProviderProps {
  children: React.ReactNode;
  initialRoomName?: string;
  initialToken?: string;
  initialUrl?: string;
  autoConnect?: boolean;
}

// MultimodalAgent Hook Return Type
export interface MultimodalAgentHook {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  
  // Voice state
  isSpeaking: boolean;
  voiceLevel: number;
  
  // Transcription
  transcript: string;
  isFinalTranscript: boolean;
  
  // Audio output
  isGeneratingSpeech: boolean;
  synthesizeSpeech: (text: string, options?: { voice?: string; speed?: number }) => Promise<void>;
  
  // Session management
  startConversation: (roomName: string, token: string, url: string) => Promise<boolean>;
  endConversation: () => void;
  
  // Raw LiveKit access
  room: Room | null;
  error: Error | null;
}

// Token Generation Options
export interface LiveKitTokenOptions {
  identity: string;
  name?: string;
  ttl?: number;
  metadata?: string;
  room?: string;
  permissions?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
  };
}

// LiveKit Server Configuration
export interface LiveKitServerConfig {
  apiKey: string;
  apiSecret: string;
  wsUrl: string;
}

// Voice Activity Event
export interface VoiceActivityEvent {
  type: 'started' | 'ended' | 'level';
  level: number;
  timestamp: number;
}

// Transcription Event
export interface TranscriptionEvent {
  type: 'interim' | 'final';
  text: string;
  confidence?: number;
  timestamp: number;
}

// Audio Track Info
export interface AudioTrackInfo {
  trackId: string;
  participantId: string;
  muted: boolean;
  audioLevel: number;
  type: 'local' | 'remote';
}

export interface RoomSession {
  roomName: string;
  token: string;
  url: string;
}

export interface LiveKitConnectionOptions {
  url: string;
  token: string;
  roomName: string;
  autoConnect?: boolean;
} 