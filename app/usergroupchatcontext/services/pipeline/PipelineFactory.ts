'use client';

import { PipelineManager } from './PipelineManager';
import { PipelineConfig, PipelineStage } from './types';
import { 
  DeduplicationProcessor,
  PreprocessingProcessor,
  LLMCallProcessor,
  ToolResolutionProcessor,
  ToolExecutionProcessor,
  PostprocessingProcessor
} from './processors';
import { createLoggingMiddleware } from './middlewares/LoggingMiddleware';

/**
 * Factory for creating message processing pipelines
 */
export class PipelineFactory {
  /**
   * Create a basic pipeline with all essential processors
   */
  public static createDefaultPipeline(options: { 
    enableLogging?: boolean;
    disableDeduplication?: boolean;
    disablePreprocessing?: boolean;
    disableToolProcessing?: boolean;
    disablePostprocessing?: boolean;
  } = {}): PipelineManager {
    const config: PipelineConfig = {
      stages: {
        // Deduplication stage
        [PipelineStage.DEDUPLICATION]: {
          processor: DeduplicationProcessor,
          enabled: !options.disableDeduplication,
          middlewares: [],
        },
        
        // Preprocessing stage
        [PipelineStage.PREPROCESSING]: {
          processor: PreprocessingProcessor,
          enabled: !options.disablePreprocessing,
          middlewares: [],
        },
        
        // LLM call stage
        [PipelineStage.LLM_CALL]: {
          processor: LLMCallProcessor,
          enabled: true, // Always enabled
          middlewares: [],
        },
        
        // Tool resolution stage
        [PipelineStage.TOOL_RESOLUTION]: {
          processor: ToolResolutionProcessor,
          enabled: !options.disableToolProcessing,
          middlewares: [],
        },
        
        // Tool execution stage
        [PipelineStage.TOOL_EXECUTION]: {
          processor: ToolExecutionProcessor,
          enabled: !options.disableToolProcessing,
          middlewares: [],
        },
        
        // Postprocessing stage
        [PipelineStage.POSTPROCESSING]: {
          processor: PostprocessingProcessor,
          enabled: !options.disablePostprocessing,
          middlewares: [],
        },
      },
      
      // Global middlewares applied to all stages
      globalMiddlewares: options.enableLogging 
        ? [createLoggingMiddleware('debug')] 
        : [],
    };
    
    return new PipelineManager(config);
  }
  
  /**
   * Create a pipeline for voice mode (optimized for voice processing)
   */
  public static createVoicePipeline(): PipelineManager {
    return PipelineFactory.createDefaultPipeline({
      disableToolProcessing: true, // Disable tool processing in voice mode
      enableLogging: true, // Enable logging for debugging
    });
  }
  
  /**
   * Create a minimal pipeline with only the LLM call stage
   */
  public static createMinimalPipeline(): PipelineManager {
    return PipelineFactory.createDefaultPipeline({
      disableDeduplication: true,
      disablePreprocessing: true,
      disableToolProcessing: true,
      disablePostprocessing: true,
    });
  }
  
  /**
   * Create a debug pipeline with extensive logging
   */
  public static createDebugPipeline(): PipelineManager {
    const pipeline = PipelineFactory.createDefaultPipeline({
      enableLogging: true,
    });
    
    // Add logging middleware to each stage
    const config = pipeline['config'] as PipelineConfig;
    
    Object.values(PipelineStage).forEach(stage => {
      config.stages[stage].middlewares.push(
        createLoggingMiddleware('debug')
      );
    });
    
    return pipeline;
  }
} 