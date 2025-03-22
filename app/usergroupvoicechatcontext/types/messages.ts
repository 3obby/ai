/**
 * Message Types
 * 
 * Definitions for messages, transcriptions, and related metadata
 */

import { BotId } from './bots';

// Core message type
export interface Message {
  id: string;
  content: string;
  sender: 'user' | BotId;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'voice' | 'tool_result';
  isInterim?: boolean;
  metadata?: MessageMetadata;
}

// Metadata for messages
export interface MessageMetadata {
  transcription?: TranscriptionMetadata;
  toolResults?: ToolResultMetadata[];
  processingInfo?: ProcessingMetadata;
}

// Metadata for transcriptions
export interface TranscriptionMetadata {
  duration: number;
  confidence: number;
  interim: boolean;
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
}

// Metadata for tool results
export interface ToolResultMetadata {
  toolName: string;
  executionTime: number;
  success: boolean;
  result: any;
  error?: string;
}

// Metadata for message processing
export interface ProcessingMetadata {
  preProcessed: boolean;
  postProcessed: boolean;
  recursionDepth: number;
  processingTime: number;
  originalContent?: string;
  modifiedContent?: string;
}

// Convert to OpenAI chat format
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

// Message conversion helpers
export function toChatMessage(message: Message, role?: ChatRole): ChatMessage {
  return {
    role: role || (message.sender === 'user' ? 'user' : 'assistant'),
    content: message.content,
    name: message.sender !== 'user' ? message.sender : undefined
  };
}

export function createUserMessage(content: string): Message {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    content,
    sender: 'user',
    senderName: 'You',
    timestamp: new Date(),
    type: 'text'
  };
}

export function createBotMessage(botId: BotId, botName: string, content: string, avatar?: string): Message {
  return {
    id: `bot-${botId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    content,
    sender: botId,
    senderName: botName,
    senderAvatar: avatar,
    timestamp: new Date(),
    type: 'text'
  };
}

export function createSystemMessage(content: string): Message {
  return {
    id: `system-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    content,
    sender: 'system',
    senderName: 'System',
    timestamp: new Date(),
    type: 'text'
  };
} 