'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ProcessingMetadata } from '../../../types';
import { processingTracker } from '../../ProcessingTracker';
import reprocessingOrchestrator from '../../ReprocessingOrchestratorService';

/**
 * A redesigned ReprocessingProcessor that uses the orchestrator service
 * and properly integrates with the Chain of Responsibility pattern.
 * 
 * This processor follows both the Single Responsibility Principle and
 * Chain of Responsibility pattern by:
 * 1. Delegating reprocessing decisions to the orchestrator
 * 2. Focusing solely on handling the reprocessing flow in the pipeline
 * 3. Clearly indicating when to continue or stop the chain
 */
export const ReprocessingProcessor2: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  console.log('==== REPROCESSING PROCESSOR 2.0 ====');
  console.log('Bot:', bot.id, bot.name);
  console.log('Reprocessing enabled:', bot.enableReprocessing);
  console.log('Current content:', content.substring(0, 50) + '...');
  
  // Check if need to reprocess based on metadata flag
  if (!metadata.needsReprocessing) {
    console.log('ReprocessingProcessor2: No reprocessing needed, continuing chain');
    
    // Continue to next stage in the chain
    return {
      content,
      metadata: {
        ...metadata,
        processingStage: 'skipped-reprocessing'
      }
    };
  }
  
  // Skip reprocessing if:
  // 1. Reprocessing is disabled for the bot
  // 2. We've reached the maximum reprocessing depth
  const currentDepth = metadata.reprocessingDepth || 0;
  const maxDepth = context.settings.chat.maxReprocessingDepth || 3;
  
  console.log('Reprocessing depth:', currentDepth, '/', maxDepth);
  
  if (
    !bot.enableReprocessing ||
    currentDepth >= maxDepth
  ) {
    console.log('ReprocessingProcessor2: Skipping reprocessing due to constraints');
    
    if (processingTracker) {
      processingTracker.endReprocessing(bot.id);
    }
    
    // Continue to next stage in the chain
    return {
      content,
      metadata: {
        ...metadata,
        processingStage: 'skipped-reprocessing-constraints',
        needsReprocessing: false
      }
    };
  }
  
  try {
    // Delegate the reprocessing to the orchestrator
    console.log('ReprocessingProcessor2: Delegating reprocessing to orchestrator');
    
    const result = await reprocessingOrchestrator.reprocessContent(
      content,
      bot,
      context,
      metadata
    );
    
    console.log('ReprocessingProcessor2: Reprocessing complete');
    
    // If there was an error, return it but continue the chain
    if (result.error) {
      console.warn('ReprocessingProcessor2: Reprocessing completed with error:', result.error.message);
      
      return {
        content: result.content,
        metadata: result.metadata,
        error: result.error
      };
    }
    
    // Return the reprocessed content
    return {
      content: result.content,
      metadata: {
        ...result.metadata,
        processingStage: 'completed-reprocessing'
      },
      // Signal that we should stop the chain, as reprocessing is the final step
      stopChain: true
    };
  } catch (error) {
    console.error('ReprocessingProcessor2: Unexpected error in reprocessing:', error);
    
    // End reprocessing tracking if error
    if (processingTracker) {
      processingTracker.endReprocessing(bot.id);
    }
    
    // Create pipeline error
    const pipelineError = new PipelineError(
      PipelineErrorType.REPROCESSING_ERROR,
      `Reprocessing failed unexpectedly: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Continue chain despite error
    return {
      content,
      metadata: {
        ...metadata,
        error: pipelineError.message,
        processingStage: 'error-reprocessing-unexpected',
        needsReprocessing: false
      },
      error: pipelineError
    };
  }
}; 