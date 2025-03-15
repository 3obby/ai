// Define comprehensive settings schema for the demo application

// Real-time API settings
export interface RealtimeAPISettings {
  // OpenAI API configuration
  apiEndpoint?: string;
  apiVersion?: string;
  
  // WebRTC connection settings
  iceServers?: {
    urls: string[];
    username?: string;
    credential?: string;
  }[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  
  // Session configuration
  sessionTimeout?: number;
  keepAliveInterval?: number;
}

// Voice chat settings
export interface VoiceChatSettings {
  // Voice activity detection
  vadMode: 'auto' | 'sensitive' | 'manual';
  vadThreshold?: number;
  prefixPaddingMs?: number;
  silenceDurationMs?: number;
  
  // Audio processing
  audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  sampleRate?: number;
  
  // Turn detection
  turnDetection?: {
    threshold?: number; // Default 0.5, lower value is more sensitive
    prefixPaddingMs?: number; // Default 300ms
    silenceDurationMs?: number; // Default 500ms
    createResponse?: boolean; // Default true
  };
  
  // Assistant voice
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  modality?: 'both' | 'text' | 'audio';
}

// Tool calling configurations
export interface ToolCallingSettings {
  enabled: boolean;
  allowedTools?: string[];
  toolDefinitions?: any[];
  responseFormat?: 'json' | 'markdown' | 'text';
  maxToolCalls?: number;
  toolCallTimeout?: number;
}

// General AI settings
export interface AISettings {
  // Model parameters
  model?: string;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxResponseTokens?: number | 'inf';
  
  // Behavior settings
  responseSpeed?: number;
  allRespond?: boolean;
  
  // System message
  systemMessage?: string;
  
  // Safety settings
  moderationEnabled?: boolean;
  contentFiltering?: {
    hate?: 'none' | 'low' | 'medium' | 'high';
    hateThreatening?: 'none' | 'low' | 'medium' | 'high';
    selfHarm?: 'none' | 'low' | 'medium' | 'high';
    sexual?: 'none' | 'low' | 'medium' | 'high';
    sexualMinors?: 'none' | 'low' | 'medium' | 'high';
    violence?: 'none' | 'low' | 'medium' | 'high';
    violenceGraphic?: 'none' | 'low' | 'medium' | 'high';
  };
}

// Combine all settings into a unified interface
export interface DemoSettings {
  realtimeAPI: RealtimeAPISettings;
  voiceChat: VoiceChatSettings;
  toolCalling: ToolCallingSettings;
  ai: AISettings;
  companionSettings?: { [companionId: string]: Partial<AISettings & VoiceChatSettings> };
}

// Default settings
export const DEFAULT_SETTINGS: DemoSettings = {
  realtimeAPI: {
    apiEndpoint: 'https://api.openai.com',
    apiVersion: '2023-03-01-alpha',
    reconnectAttempts: 3,
    reconnectInterval: 2000,
    sessionTimeout: 300000, // 5 minutes
    keepAliveInterval: 30000 // 30 seconds
  },
  voiceChat: {
    vadMode: 'auto',
    vadThreshold: 0.5,
    prefixPaddingMs: 300,
    silenceDurationMs: 500,
    audioFormat: 'pcm16',
    sampleRate: 16000,
    voice: 'sage',
    modality: 'both',
    turnDetection: {
      threshold: 0.5,
      prefixPaddingMs: 300,
      silenceDurationMs: 500,
      createResponse: true
    }
  },
  toolCalling: {
    enabled: false,
    allowedTools: [],
    maxToolCalls: 5,
    toolCallTimeout: 30000, // 30 seconds
    responseFormat: 'markdown'
  },
  ai: {
    model: 'gpt-4o',
    temperature: 0.8,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    maxResponseTokens: 'inf',
    responseSpeed: 5,
    allRespond: false,
    systemMessage: "You are a helpful assistant in a group chat environment."
  }
}; 