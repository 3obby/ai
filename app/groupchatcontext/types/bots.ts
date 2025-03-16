/**
 * Bot Types
 * 
 * Core type definitions for bots (previously companions) in the GroupChatContext
 */

// Unique identifier type for bots
export type BotId = string;

// Voice configuration for bots
export interface VoiceConfig {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  modality: 'text' | 'voice' | 'both';
  vadMode: 'auto' | 'manual' | 'disabled';
}

// Parameters that control bot behavior
export interface BotParameters {
  temperature: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  topP?: number;
  enabledTools: string[];
  responseSpeed?: number; // 1-10 scale, controls artificial delay
}

// A tool that can be used by a bot
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, any>;
  requiresAuth?: boolean;
  schema?: Record<string, any>;
}

// The core bot definition
export interface Bot {
  id: BotId;
  name: string;
  avatar: string;
  description: string;
  basePrompt: string;
  preProcessingPrompt?: string;
  postProcessingPrompt?: string;
  parameters: BotParameters;
  tools: ToolDefinition[];
  voiceConfig?: VoiceConfig;
  isActive?: boolean;
  order?: number; // For determining response order in sync mode
}

// Default parameters for bots
export const DEFAULT_BOT_PARAMETERS: BotParameters = {
  temperature: 0.7,
  maxTokens: 1000,
  presencePenalty: 0,
  frequencyPenalty: 0,
  topP: 1,
  enabledTools: [],
  responseSpeed: 5
}; 