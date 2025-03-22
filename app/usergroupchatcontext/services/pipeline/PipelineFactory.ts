'use client';

import { PipelineConfig, PipelineStage } from './types';
import { 
  DeduplicationProcessor, 
  PreprocessingProcessor, 
  PostprocessingProcessor,
  LLMCallProcessor,
  ToolResolutionProcessor,
  ToolExecutionProcessor,
  ReprocessingProcessor
} from './processors';
import { createLoggingMiddleware } from './middlewares/LoggingMiddleware';
import { Message, Bot } from '../../types';
import { MessageContext, ProcessingResult, ProcessingMetadata, IStageProcessor } from './types';

// Force enable reprocessing for all bots
export const FORCE_ENABLE_REPROCESSING = true;

/**
 * Factory for creating message processing pipelines
 */
export class PipelineFactory {
  private processorChain: IStageProcessor | null = null;

  /**
   * Create a pipeline configuration with all stages
   */
  public createDefaultConfig(): PipelineConfig {
    const pipeline: PipelineConfig = {
      stages: {
        [PipelineStage.DEDUPLICATION]: {
          enabled: true,
          processor: DeduplicationProcessor,
          middlewares: [createLoggingMiddleware('Deduplication')]
        },
        [PipelineStage.PREPROCESSING]: {
          enabled: true,
          processor: PreprocessingProcessor,
          middlewares: [createLoggingMiddleware('Preprocessing')]
        },
        [PipelineStage.TOOL_RESOLUTION]: {
          enabled: true,
          processor: ToolResolutionProcessor,
          middlewares: [createLoggingMiddleware('Tool Resolution')]
        },
        [PipelineStage.TOOL_EXECUTION]: {
          enabled: true,
          processor: ToolExecutionProcessor,
          middlewares: [createLoggingMiddleware('Tool Execution')]
        },
        [PipelineStage.LLM_CALL]: {
          enabled: true,
          processor: LLMCallProcessor,
          middlewares: [createLoggingMiddleware('LLM Call')]
        },
        [PipelineStage.POSTPROCESSING]: {
          enabled: true,
          processor: PostprocessingProcessor,
          middlewares: [createLoggingMiddleware('Postprocessing')]
        },
        [PipelineStage.REPROCESSING]: {
          enabled: true,
          processor: ReprocessingProcessor,
          middlewares: [createLoggingMiddleware('Reprocessing')]
        }
      },
      globalMiddlewares: []
    };
    
    return pipeline;
  }

  /**
   * Creates and configures a pipeline with processors connected in the Chain of Responsibility pattern
   */
  public createChainOfResponsibility(): void {
    console.log('Creating processing pipeline with Chain of Responsibility pattern');
    
    // Create processor instances from the new Chain of Responsibility classes
    const deduplicationProcessor = new DeduplicationProcessor();
    const preprocessingProcessor = new PreprocessingProcessor();
    const toolResolutionProcessor = new ToolResolutionProcessor();
    const toolExecutionProcessor = new ToolExecutionProcessor();
    const llmCallProcessor = new LLMCallProcessor();
    const postprocessingProcessor = new PostprocessingProcessor();
    const reprocessingProcessor = new ReprocessingProcessor();
    
    // Chain them together in the correct order
    deduplicationProcessor
      .setNext(preprocessingProcessor)
      .setNext(toolResolutionProcessor)
      .setNext(toolExecutionProcessor)
      .setNext(llmCallProcessor)
      .setNext(postprocessingProcessor)
      .setNext(reprocessingProcessor);
    
    // Log that the chain has been created
    console.log('🔗 Chain of Responsibility processors linked:',
      deduplicationProcessor.getName(),
      '→', preprocessingProcessor.getName(),
      '→', toolResolutionProcessor.getName(),
      '→', toolExecutionProcessor.getName(),
      '→', llmCallProcessor.getName(),
      '→', postprocessingProcessor.getName(),
      '→', reprocessingProcessor.getName()
    );
    
    // Store the head of the chain
    this.processorChain = deduplicationProcessor;
  }

  /**
   * Process a message through the pipeline using the Chain of Responsibility pattern
   */
  public async processMessageThroughChain(
    message: Message,
    bot: Bot,
    context: MessageContext
  ): Promise<ProcessingResult> {
    console.log('Processing message through Chain of Responsibility pipeline');
    
    if (!this.processorChain) {
      throw new Error('Pipeline not initialized. Call createChainOfResponsibility first.');
    }
    
    try {
      // Start with empty metadata
      const initialMetadata: ProcessingMetadata = {
        processingStage: 'started'
      };
      
      // Start processing through the chain
      console.log('🔄 Starting message processing through pipeline chain');
      const result = await this.processorChain.process(
        message.content,
        bot,
        context,
        initialMetadata
      );
      
      console.log('✅ Pipeline processing completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Error in pipeline processing:', error);
      throw error;
    }
  }

  /**
   * Create a special debug pipeline with reprocessing fully enabled
   */
  public static createReprocessingDebugPipeline(): PipelineConfig {
    const config: PipelineConfig = {
      stages: {
        [PipelineStage.DEDUPLICATION]: {
          enabled: true,
          processor: DeduplicationProcessor,
          middlewares: [],
        },
        [PipelineStage.PREPROCESSING]: {
          enabled: true,
          processor: PreprocessingProcessor,
          middlewares: [],
        },
        [PipelineStage.TOOL_RESOLUTION]: {
          enabled: true,
          processor: ToolResolutionProcessor,
          middlewares: [],
        },
        [PipelineStage.TOOL_EXECUTION]: {
          enabled: true,
          processor: ToolExecutionProcessor,
          middlewares: [],
        },
        [PipelineStage.LLM_CALL]: {
          enabled: true,
          processor: LLMCallProcessor,
          middlewares: [],
        },
        [PipelineStage.POSTPROCESSING]: {
          enabled: true,
          processor: PostprocessingProcessor,
          middlewares: [],
        },
        [PipelineStage.REPROCESSING]: {
          enabled: true,
          processor: ReprocessingProcessor,
          middlewares: [],
        },
      },
      globalMiddlewares: []
    };
    
    console.log('==== SPECIAL REPROCESSING DEBUG PIPELINE CREATED ====');
    console.log('All stages enabled:', Object.keys(config.stages));
    console.log('Reprocessing stage explicitly enabled.');
    
    return config;
  }
} 