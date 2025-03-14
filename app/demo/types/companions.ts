// Define type for pre-configured companions
export interface Companion {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  role: string;
  personality: {
    openness: number;         // Curiosity, creativity, openness to new ideas (0-10)
    conscientiousness: number; // Organization, reliability, responsibility (0-10)
    extraversion: number;     // Sociability, assertiveness, talkativeness (0-10)
    agreeableness: number;    // Cooperation, compassion, warmth (0-10)
    neuroticism: number;      // Anxiety, emotional instability, negativity (0-10)
  };
  domainInterests: {          // Likelihood of responding to topics (0-10)
    technical: number;
    creative: number;
    management: number;
  };
  effort: number;             // How much effort in response generation (1-10)
  voiceConfig?: {             // Voice and audio stream configuration
    voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
    vadMode?: 'auto' | 'sensitive' | 'manual'; // Voice activity detection mode
    modality?: 'both' | 'text' | 'audio'; // Output modalities
    turnDetection?: {
      threshold?: number; // Default 0.5, lower value is more sensitive
      prefixPaddingMs?: number; // Default 300ms
      silenceDurationMs?: number; // Default 500ms
      createResponse?: boolean; // Default true
    };
    temperature?: number; // Sampling temperature (0.6-1.2), default 0.8
    maxResponseTokens?: number | 'inf'; // Max tokens per response, default 'inf'
    audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw'; // Audio format
  };
}

// Define type for chat messages
export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: Date;
  isUser: boolean;
  debugInfo?: any;  // For storing "under the hood" information
  messageType?: 'text' | 'audio' | 'tool_call'; // Type of message
  audioUrl?: string; // URL to audio file if audio message
  toolCalls?: any[]; // Tool calls if tool_call message
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