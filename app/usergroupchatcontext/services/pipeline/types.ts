'use client';

import { Bot, Message, BotId, ToolResult, ProcessingMetadata } from '../../types';

export enum PipelineStage {
  DEDUPLICATION = 'deduplication',
  PREPROCESSING = 'preprocessing',
  TOOL_RESOLUTION = 'toolResolution',
  TOOL_EXECUTION = 'toolExecution',
  LLM_CALL = 'llmCall',
  POSTPROCESSING = 'postprocessing',
  REPROCESSING = 'reprocessing'
}

export enum PipelineErrorType {
  DEDUPLICATION_ERROR = 'deduplication_error',
  PREPROCESSING_ERROR = 'preprocessing_error',
  TOOL_RESOLUTION_ERROR = 'tool_resolution_error',
  TOOL_EXECUTION_ERROR = 'tool_execution_error',
  LLM_CALL_ERROR = 'llm_call_error',
  POSTPROCESSING_ERROR = 'postprocessing_error',
  REPROCESSING_ERROR = 'reprocessing_error',
  PIPELINE_CONFIG_ERROR = 'pipeline_config_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Result from a processing stage
 */
export interface ProcessingResult {
  content: string;
  metadata: ProcessingMetadata;
  error?: Error;
  skipNextStages?: boolean;
  toolResults?: ToolResult[];
}

/**
 * Context for message processing
 */
export interface MessageContext {
  messages: Message[];
  settings: {
    chat: {
      systemPrompt: string;
      maxReprocessingDepth: number;
      promptProcessor: {
        preProcessingEnabled: boolean;
        postProcessingEnabled: boolean;
        preProcessingPrompt: string;
        postProcessingPrompt: string;
      };
    };
    tools: {
      enabledTools: string[];
      maxToolCount: number;
    };
  };
  isVoiceMode: boolean;
  currentDepth: number;
}

/**
 * Pipeline Error
 */
export class PipelineError extends Error {
  type: PipelineErrorType;
  originalError?: Error;

  constructor(type: PipelineErrorType, message: string, originalError?: Error) {
    super(message);
    this.name = 'PipelineError';
    this.type = type;
    this.originalError = originalError;
  }
}

/**
 * Stage processor function signature - Chain of Responsibility pattern
 */
export interface IStageProcessor {
  /**
   * Process the content and return the result, handing off to next processor if needed
   */
  process(
    content: string, 
    bot: Bot, 
    context: MessageContext, 
    metadata: ProcessingMetadata,
    next?: IStageProcessor
  ): Promise<ProcessingResult>;
  
  /**
   * Sets the next processor in the chain
   */
  setNext(processor: IStageProcessor): IStageProcessor;
  
  /**
   * Gets the name of this processor
   */
  getName(): string;
}

/**
 * Abstract base class for stage processors implementing Chain of Responsibility
 */
export abstract class BaseStageProcessor implements IStageProcessor {
  protected nextProcessor: IStageProcessor | null = null;
  protected name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  /**
   * Process the content and return the result
   * To be implemented by concrete processors
   */
  abstract process(
    content: string, 
    bot: Bot, 
    context: MessageContext, 
    metadata: ProcessingMetadata,
    next?: IStageProcessor
  ): Promise<ProcessingResult>;
  
  /**
   * Sets the next processor in the chain
   */
  setNext(processor: IStageProcessor): IStageProcessor {
    this.nextProcessor = processor;
    return processor;
  }
  
  /**
   * Gets the name of this processor
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Call the next processor in the chain if it exists
   */
  protected async processNext(
    content: string, 
    bot: Bot, 
    context: MessageContext, 
    metadata: ProcessingMetadata
  ): Promise<ProcessingResult> {
    if (this.nextProcessor) {
      return this.nextProcessor.process(content, bot, context, metadata);
    }
    
    // If no next processor, return the current state
    return { content, metadata };
  }
}

/**
 * Legacy type for backward compatibility
 */
export type StageProcessor = (
  content: string, 
  bot: Bot, 
  context: MessageContext, 
  metadata: ProcessingMetadata
) => Promise<ProcessingResult>;

/**
 * Middleware for message processing
 */
export type MessageMiddleware = (
  content: string,
  bot: Bot,
  context: MessageContext,
  processor: StageProcessor,
  metadata: ProcessingMetadata
) => Promise<ProcessingResult>;

/**
 * Configuration for a pipeline stage
 */
export interface StageConfig {
  enabled: boolean;
  processor: StageProcessor;
  middlewares: MessageMiddleware[];
}

/**
 * Configuration for the entire pipeline
 */
export interface PipelineConfig {
  stages: Record<PipelineStage, StageConfig>;
  globalMiddlewares: MessageMiddleware[];
} 