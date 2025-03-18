/**
 * Settings Types
 * 
 * Configuration types for the GroupChatContext and related components
 */

import { BotId, BotParameters } from './bots';

// Main configuration for the group chat
export interface GroupChatConfig {
  responseMode: 'sync' | 'async';
  defaultBotParams: BotParameters;
  activeBots: BotId[];
  botOrder: BotId[];
  maxReprocessingDepth: number;
  globalSystemPrompt?: string;
}

// Voice transcription settings
export interface TranscriptionConfig {
  // API settings
  apiEndpoint?: string;
  apiKey?: string;
  
  // WebRTC settings
  iceServers?: {
    urls: string[];
    username?: string;
    credential?: string;
  }[];
  
  // Voice Activity Detection
  vadMode: 'auto' | 'sensitive' | 'manual';
  vadThreshold?: number;
  prefixPaddingMs?: number;
  silenceDurationMs?: number;
  
  // Audio format
  audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  sampleRate?: number;
}

// Tool calling configuration
export interface ToolConfig {
  enabled: boolean;
  allowedTools: string[];
  maxToolCalls: number;
  toolCallTimeout: number;
  responseFormat: 'json' | 'markdown' | 'text';
}

// Prompt processing configuration
export interface PromptProcessorConfig {
  enabled: boolean;
  preProcessingEnabled: boolean;
  postProcessingEnabled: boolean;
  maxReprocessingDepth: number;
  defaultSystemPrompt: string;
}

// UI configuration
export interface UIConfig {
  enabledFeatures: {
    voiceInput: boolean;
    voiceOutput: boolean;
    toolCalling: boolean;
    debugInfo: boolean;
  };
  theme: 'dark' | 'light' | 'system';
  messageBubbleStyle: 'rounded' | 'square' | 'minimal';
  showTimestamps: boolean;
  showTypingIndicators: boolean;
}

// Complete settings object
export interface GroupChatSettings {
  chat: GroupChatConfig;
  transcription: TranscriptionConfig;
  tools: ToolConfig;
  promptProcessor: PromptProcessorConfig;
  ui: UIConfig;
  botOverrides: Record<BotId, Partial<BotParameters>>;
}

// Default settings
export const DEFAULT_SETTINGS: GroupChatSettings = {
  chat: {
    responseMode: 'async',
    defaultBotParams: {
      temperature: 0.7,
      maxTokens: 1000,
      presencePenalty: 0,
      frequencyPenalty: 0,
      topP: 1,
      enabledTools: [],
      responseSpeed: 5
    },
    activeBots: [],
    botOrder: [],
    maxReprocessingDepth: 3,
    globalSystemPrompt: "You are a helpful assistant in a group chat environment."
  },
  transcription: {
    vadMode: 'auto',
    vadThreshold: 0.5,
    prefixPaddingMs: 300,
    silenceDurationMs: 500,
    audioFormat: 'pcm16',
    sampleRate: 16000
  },
  tools: {
    enabled: false,
    allowedTools: [],
    maxToolCalls: 5,
    toolCallTimeout: 30000,
    responseFormat: 'markdown'
  },
  promptProcessor: {
    enabled: true,
    preProcessingEnabled: true,
    postProcessingEnabled: true,
    maxReprocessingDepth: 3,
    defaultSystemPrompt: "You are a helpful assistant in a group chat environment."
  },
  ui: {
    enabledFeatures: {
      voiceInput: true,
      voiceOutput: true,
      toolCalling: true,
      debugInfo: false
    },
    theme: 'dark',
    messageBubbleStyle: 'rounded',
    showTimestamps: true,
    showTypingIndicators: true
  },
  botOverrides: {}
}; 