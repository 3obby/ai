'use client';

import { StageHandler, createStageChain } from './StageHandler';
import { PipelineStage } from './types';
import { 
  DeduplicationProcessor,
  PreprocessingProcessor,
  LLMCallProcessor,
  ToolResolutionProcessor,
  ToolExecutionProcessor,
  PostprocessingProcessor
} from './processors';
import { ReprocessingChecker2 } from './processors/ReprocessingChecker2';
import { ReprocessingProcessor2 } from './processors/ReprocessingProcessor2';

/**
 * Factory for creating message processing pipelines using the Chain of Responsibility pattern
 */
export class ChainedPipelineFactory {
  /**
   * Create a default pipeline chain
   */
  public static createDefaultChain(options: { 
    enableLogging?: boolean;
    disableDeduplication?: boolean;
    disablePreprocessing?: boolean;
    disableToolProcessing?: boolean;
    disablePostprocessing?: boolean;
    disableReprocessing?: boolean;
  } = {}): StageHandler {
    console.log("Creating chained pipeline with options:", options);
    console.log("REPROCESSING EXPLICITLY DISABLED:", options.disableReprocessing);
    
    const stageDefinitions = [
      // Deduplication stage
      {
        name: PipelineStage.DEDUPLICATION,
        processor: DeduplicationProcessor,
        enabled: !options.disableDeduplication
      },
      
      // Preprocessing stage
      {
        name: PipelineStage.PREPROCESSING,
        processor: PreprocessingProcessor,
        enabled: !options.disablePreprocessing
      },
      
      // LLM call stage - Always enabled
      {
        name: PipelineStage.LLM_CALL,
        processor: LLMCallProcessor,
        enabled: true
      },
      
      // Tool resolution stage
      {
        name: PipelineStage.TOOL_RESOLUTION,
        processor: ToolResolutionProcessor,
        enabled: !options.disableToolProcessing
      },
      
      // Tool execution stage
      {
        name: PipelineStage.TOOL_EXECUTION,
        processor: ToolExecutionProcessor,
        enabled: !options.disableToolProcessing
      },
      
      // Postprocessing stage
      {
        name: PipelineStage.POSTPROCESSING,
        processor: PostprocessingProcessor,
        enabled: !options.disablePostprocessing
      },
      
      // Reprocessing check stage
      {
        name: 'reprocessing_check',
        processor: ReprocessingChecker2,
        enabled: !options.disableReprocessing
      },
      
      // Reprocessing stage
      {
        name: PipelineStage.REPROCESSING,
        processor: ReprocessingProcessor2,
        enabled: !options.disableReprocessing
      }
    ];
    
    // Create chain and return the first handler
    const chain = createStageChain(stageDefinitions);
    
    if (!chain) {
      throw new Error("Failed to create pipeline chain");
    }
    
    return chain;
  }
  
  /**
   * Create a voice-optimized pipeline chain
   */
  public static createVoiceChain(): StageHandler {
    return ChainedPipelineFactory.createDefaultChain({
      disableToolProcessing: true,
      enableLogging: true,
    });
  }
  
  /**
   * Create a minimal pipeline chain with only the LLM call
   */
  public static createMinimalChain(): StageHandler {
    return ChainedPipelineFactory.createDefaultChain({
      disableDeduplication: true,
      disablePreprocessing: true,
      disableToolProcessing: true,
      disablePostprocessing: true,
      disableReprocessing: true
    });
  }
  
  /**
   * Create a debug pipeline chain with extensive logging
   */
  public static createDebugChain(): StageHandler {
    return ChainedPipelineFactory.createDefaultChain({
      enableLogging: true
    });
  }
  
  /**
   * Process content through the chain
   */
  public static async processContent(
    chain: StageHandler,
    content: string,
    bot: any,
    context: any,
    metadata: any
  ) {
    console.log("ChainedPipelineFactory: Starting chain processing");
    
    try {
      // Process through the chain
      const result = await chain.handle(content, bot, context, metadata);
      console.log("ChainedPipelineFactory: Chain processing completed successfully");
      return result;
    } catch (error) {
      console.error("ChainedPipelineFactory: Error in chain processing:", error);
      
      // Return error result
      return {
        content,
        metadata: {
          ...metadata,
          error: error instanceof Error ? error.message : String(error),
          processingStage: 'chain-processing-error'
        },
        error
      };
    }
  }
} 