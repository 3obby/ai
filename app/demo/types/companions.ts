// Define type for pre-configured companions
export interface VoiceConfig {
  voice: string;
  vadMode: 'auto' | 'manual' | 'disabled';
  modality: 'text' | 'voice' | 'both';
}

export interface Companion {
  id: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  interests: string[];
  effort?: number;
  temperature?: number;
  maxResponseTokens?: number;
  toolCalling?: boolean;
  voice?: string;
  vadMode?: string;
  modality?: string;
  turnDetection?: {
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
    createResponse?: boolean;
  };
  audioFormat?: string;
  voiceConfig?: VoiceConfig;
}

// Define type for chat messages
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  senderName: string;
  senderAvatar: string;
  timestamp: string | Date;
  senderId?: string;
  isUser?: boolean;
  isInterim?: boolean;
  messageType?: 'text' | 'tool_call' | 'audio';
  metadata?: {
    transcriptionType?: 'user-audio' | 'assistant-audio';
    duration?: number;
    language?: string;
    segments?: Array<{
      text: string;
      start: number;
      end: number;
      confidence: number;
    }>;
    words?: Array<{
      text: string;
      start: number;
      end: number;
      confidence: number;
    }>;
  };
  debugInfo?: {
    toolsCalled?: {
      originalToolCalls?: Array<{
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    [key: string]: any;
  };
}

// Define type for audio message
export interface AudioMessage {
  type: 'audio';
  transcription: string;
  audioUrl?: string;
}

// Define the format for chat history
export interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface TranscriptionResult {
  duration?: number;
  language?: string;
  segmentCount?: number;
  wordCount?: number;
  transcriptionSource?: 'whisper-api' | 'realtime-api';
  transcriptionType?: 'user-audio' | 'assistant-audio';
} 