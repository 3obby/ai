'use client';

import { Bot, Message, ProcessingMetadata, ToolResult } from '../../types';
import { GroupChatSettings } from '../../types/settings';

/**
 * Represents the context in which message processing occurs
 */
export interface MessageContext {
  settings: GroupChatSettings;
  messages: Message[];
  currentDepth: number;
  isVoiceMode: boolean;
  isVoiceGhost: boolean;
  originalMessage?: Message;
}

/**
 * Result of a message processing stage
 */
export interface ProcessingResult {
  content: string;
  metadata: ProcessingMetadata;
  toolResults?: ToolResult[];
  skipNextStages?: boolean;
  error?: Error;
}

/**
 * Middleware function type for the message pipeline
 */
export type MessageMiddleware = (
  content: string, 
  context: MessageContext,
  metadata: ProcessingMetadata,
  next: () => Promise<ProcessingResult>
) => Promise<ProcessingResult>;

/**
 * Processor function type for a single pipeline stage
 */
export type StageProcessor = (
  content: string,
  bot: Bot,
  context: MessageContext,
  metadata: ProcessingMetadata
) => Promise<ProcessingResult>;

/**
 * Available pipeline stages in execution order
 */
export enum PipelineStage {
  DEDUPLICATION = 'deduplication',
  PREPROCESSING = 'preprocessing',
  LLM_CALL = 'llm_call',
  TOOL_RESOLUTION = 'tool_resolution',
  TOOL_EXECUTION = 'tool_execution',
  POSTPROCESSING = 'postprocessing'
}

/**
 * Configuration for a pipeline stage
 */
export interface StageConfig {
  processor: StageProcessor;
  enabled: boolean;
  middlewares: MessageMiddleware[];
}

/**
 * Complete pipeline configuration
 */
export interface PipelineConfig {
  stages: Record<PipelineStage, StageConfig>;
  globalMiddlewares: MessageMiddleware[];
}

/**
 * All possible errors that can occur in the message pipeline
 */
export enum PipelineErrorType {
  PREPROCESSING_ERROR = 'preprocessing_error',
  LLM_CALL_ERROR = 'llm_call_error',
  TOOL_RESOLUTION_ERROR = 'tool_resolution_error',
  TOOL_EXECUTION_ERROR = 'tool_execution_error',
  POSTPROCESSING_ERROR = 'postprocessing_error',
  MIDDLEWARE_ERROR = 'middleware_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Pipeline-specific error with error type
 */
export class PipelineError extends Error {
  constructor(
    public readonly type: PipelineErrorType,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'PipelineError';
  }
} 