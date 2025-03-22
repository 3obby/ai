'use client';

import { v4 as uuidv4 } from 'uuid';
import { Bot, Message, ToolResult } from '../../types';
import { 
  MessageContext, 
  ProcessingResult, 
  MessageMiddleware,
  StageProcessor,
  PipelineStage,
  PipelineConfig,
  PipelineError,
  PipelineErrorType 
} from './types';

/**
 * PipelineManager handles the entire message processing workflow
 * It orchestrates all the stages and middlewares
 */
export class PipelineManager {
  private config: PipelineConfig;
  
  constructor(config: PipelineConfig) {
    this.config = config;
  }
  
  /**
   * Process a message through the entire pipeline
   */
  public async processMessage(
    message: Message,
    bot: Bot,
    context: MessageContext,
    onResult: (message: Message) => void
  ): Promise<void> {
    // Initialize starting metadata
    let metadata = {
      originalContent: message.content,
      preProcessed: false,
      postProcessed: false,
      reprocessingDepth: context.currentDepth,
      processingTime: 0,
    };
    
    // Track overall processing time
    const startTime = Date.now();
    
    try {
      // Start with message content
      let content = message.content;
      let toolResults: ToolResult[] = [];
      
      // Create tracking variables for each stage outcome
      const stageResults: Record<string, any> = {};
      
      // Process each stage in order, unless skipped
      let shouldSkipNextStages = false;
      
      for (const stageName of Object.values(PipelineStage)) {
        const stage = this.config.stages[stageName];
        
        // Skip if disabled or previous stage requested to skip
        if (!stage.enabled || shouldSkipNextStages) {
          stageResults[stageName] = { skipped: true };
          continue;
        }
        
        try {
          // Run the stage with middleware chain
          const result = await this.executeStageWithMiddlewares(
            content,
            bot,
            context,
            metadata,
            stageName,
            stage.processor,
            [...this.config.globalMiddlewares, ...stage.middlewares]
          );
          
          // Update content and metadata for next stage
          content = result.content;
          metadata = { ...metadata, ...result.metadata };
          
          // Track tool results if present
          if (result.toolResults && result.toolResults.length > 0) {
            toolResults = [...toolResults, ...result.toolResults];
          }
          
          // Store results for tracking
          stageResults[stageName] = {
            output: content,
            metadata: { ...result.metadata }
          };
          
          // Check if we should skip subsequent stages
          if (result.skipNextStages) {
            shouldSkipNextStages = true;
          }
          
          // Handle any errors returned from the stage
          if (result.error) {
            throw new PipelineError(
              this.getErrorTypeForStage(stageName),
              `Error in ${stageName} stage: ${result.error.message}`,
              result.error
            );
          }
        } catch (error) {
          console.error(`Error in pipeline stage ${stageName}:`, error);
          
          // Store error in stage results
          stageResults[stageName] = { 
            error: error instanceof Error ? error.message : String(error) 
          };
          
          // Throw a pipeline error
          throw new PipelineError(
            this.getErrorTypeForStage(stageName),
            `Error in ${stageName} stage: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
      
      // Calculate total processing time
      const processingTime = Date.now() - startTime;
      
      // Create the final bot response
      const botResponse: Message = {
        id: uuidv4(),
        content,
        role: 'assistant',
        sender: bot.id,
        senderName: bot.name,
        timestamp: Date.now(),
        type: context.isVoiceMode ? 'voice' : 'text',
        metadata: {
          processing: {
            ...metadata,
            processingTime,
            // Add stage results as a custom field
            ...stageResults && { stageResults },
          },
          toolResults,
        }
      };
      
      // Send response through the callback
      onResult(botResponse);
      
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      
      // Create an error response
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResponse: Message = {
        id: uuidv4(),
        content: context.isVoiceMode
          ? "I'm sorry, I encountered a problem processing your voice input. Please try again or switch to text mode if the issue persists."
          : "I'm sorry, I encountered an error while processing your request. Please try again later.",
        role: 'assistant',
        sender: bot.id,
        senderName: bot.name,
        timestamp: Date.now(),
        type: context.isVoiceMode ? 'voice' : 'text',
        metadata: {
          processing: {
            ...metadata,
            processingTime: Date.now() - startTime,
            error: errorMessage,
          }
        }
      };
      
      // Send error response through the callback
      onResult(errorResponse);
    }
  }
  
  /**
   * Execute a single stage with its middleware chain
   */
  private async executeStageWithMiddlewares(
    content: string,
    bot: Bot,
    context: MessageContext,
    metadata: any,
    stageName: string,
    processor: StageProcessor,
    middlewares: MessageMiddleware[]
  ): Promise<ProcessingResult> {
    // If there are no middlewares, just run the processor directly
    if (middlewares.length === 0) {
      const stageStartTime = Date.now();
      const result = await processor(content, bot, context, metadata);
      
      // Add timing info
      const stageDuration = Date.now() - stageStartTime;
      const updatedMetadata = {
        ...result.metadata,
        [`${stageName}Time`]: stageDuration,
      };
      
      return {
        ...result,
        metadata: updatedMetadata,
      };
    }
    
    // Create the middleware chain
    let index = 0;
    
    const runMiddlewareChain = async (): Promise<ProcessingResult> => {
      // If we've processed all middlewares, run the actual processor
      if (index === middlewares.length) {
        const stageStartTime = Date.now();
        const result = await processor(content, bot, context, metadata);
        
        // Add timing info
        const stageDuration = Date.now() - stageStartTime;
        const updatedMetadata = {
          ...result.metadata,
          [`${stageName}Time`]: stageDuration,
        };
        
        return {
          ...result,
          metadata: updatedMetadata,
        };
      }
      
      // Get the current middleware
      const middleware = middlewares[index++];
      
      try {
        // Execute middleware with next function
        return await middleware(content, context, metadata, runMiddlewareChain);
      } catch (error) {
        console.error(`Error in middleware for ${stageName}:`, error);
        throw new PipelineError(
          PipelineErrorType.MIDDLEWARE_ERROR,
          `Middleware error in ${stageName} stage: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    };
    
    // Start the middleware chain
    return runMiddlewareChain();
  }
  
  /**
   * Get the appropriate error type for a given stage
   */
  private getErrorTypeForStage(stageName: string): PipelineErrorType {
    switch (stageName) {
      case PipelineStage.PREPROCESSING:
        return PipelineErrorType.PREPROCESSING_ERROR;
      case PipelineStage.LLM_CALL:
        return PipelineErrorType.LLM_CALL_ERROR;
      case PipelineStage.TOOL_RESOLUTION:
        return PipelineErrorType.TOOL_RESOLUTION_ERROR;
      case PipelineStage.TOOL_EXECUTION:
        return PipelineErrorType.TOOL_EXECUTION_ERROR;
      case PipelineStage.POSTPROCESSING:
        return PipelineErrorType.POSTPROCESSING_ERROR;
      default:
        return PipelineErrorType.UNKNOWN_ERROR;
    }
  }
  
  /**
   * Update the pipeline configuration
   */
  public updateConfig(config: Partial<PipelineConfig>): void {
    if (config.stages) {
      this.config.stages = {
        ...this.config.stages,
        ...config.stages,
      };
    }
    
    if (config.globalMiddlewares) {
      this.config.globalMiddlewares = config.globalMiddlewares;
    }
  }
  
  /**
   * Create a default pipeline configuration
   */
  public static createDefaultConfig(): PipelineConfig {
    return {
      stages: {
        [PipelineStage.DEDUPLICATION]: {
          processor: async (content, bot, context, metadata) => ({
            content,
            metadata,
          }),
          enabled: true,
          middlewares: [],
        },
        [PipelineStage.PREPROCESSING]: {
          processor: async (content, bot, context, metadata) => ({
            content,
            metadata,
          }),
          enabled: true,
          middlewares: [],
        },
        [PipelineStage.LLM_CALL]: {
          processor: async (content, bot, context, metadata) => ({
            content,
            metadata,
          }),
          enabled: true,
          middlewares: [],
        },
        [PipelineStage.TOOL_RESOLUTION]: {
          processor: async (content, bot, context, metadata) => ({
            content,
            metadata,
          }),
          enabled: true,
          middlewares: [],
        },
        [PipelineStage.TOOL_EXECUTION]: {
          processor: async (content, bot, context, metadata) => ({
            content,
            metadata,
          }),
          enabled: true,
          middlewares: [],
        },
        [PipelineStage.POSTPROCESSING]: {
          processor: async (content, bot, context, metadata) => ({
            content,
            metadata,
          }),
          enabled: true,
          middlewares: [],
        },
      },
      globalMiddlewares: [],
    };
  }
} 