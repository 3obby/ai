'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ProcessingMetadata } from '../../../types';
import { processingTracker } from '../../ProcessingTracker';
import { LLMService } from '../../LLMService';

/**
 * Reprocesses a message when it doesn't meet quality criteria
 */
export const ReprocessingProcessor: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  console.log('ReprocessingProcessor running with content:', content.substring(0, 50) + '...');
  
  // Skip reprocessing if:
  // 1. Reprocessing is disabled for the bot
  // 2. We've reached the maximum reprocessing depth
  // 3. The message doesn't need reprocessing
  const currentDepth = metadata.reprocessingDepth || 0;
  const maxDepth = context.settings.chat.maxReprocessingDepth || 3;
  
  if (
    !bot.enableReprocessing ||
    currentDepth >= maxDepth ||
    !metadata.needsReprocessing ||
    !bot.reprocessingCriteria
  ) {
    if (processingTracker) {
      processingTracker.endReprocessing(bot.id);
    }
    
    console.log('Skipping reprocessing, returning original content');
    return {
      content,
      metadata: {
        ...metadata,
        processingStage: 'skipped-reprocessing'
      }
    };
  }
  
  // Track the start time for performance monitoring
  const startTime = Date.now();
  
  // Get current reprocessing count from tracker
  const reprocessCount = processingTracker.getReprocessingCount(bot.id);
  console.log(`Current reprocessing count: ${reprocessCount}, depth: ${currentDepth}`);
  
  try {
    console.log('Reprocessing with instructions:', bot.reprocessingInstructions || 'No specific instructions');
    
    // Generate improved response using the LLMService
    const reprocessedContent = await LLMService.generateImprovedResponse(
      content,
      bot.systemPrompt,
      bot.reprocessingInstructions,
      bot.model
    );
    
    // Track processing time
    const processingTime = Date.now() - startTime;
    
    // End reprocessing stage
    processingTracker.endReprocessing(bot.id);
    
    console.log('Reprocessing complete, returning improved content');
    return {
      content: reprocessedContent,
      metadata: {
        ...metadata,
        reprocessingDepth: currentDepth + 1,
        originalContent: metadata.originalContent || content,
        processingTime: processingTime,
        processingStage: 'completed-reprocessing',
        needsReprocessing: false // Reset the flag after reprocessing
      }
    };
  } catch (error) {
    console.error('Error in reprocessing:', error);
    
    // End reprocessing stage with error
    processingTracker.endReprocessing(bot.id);
    
    // Create a pipeline error
    const pipelineError = new PipelineError(
      PipelineErrorType.REPROCESSING_ERROR,
      `Reprocessing failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Return original content, but include error in metadata
    return {
      content,
      metadata: {
        ...metadata,
        reprocessingError: pipelineError.message,
        processingStage: 'error-reprocessing',
        needsReprocessing: false // Reset the flag
      },
      error: pipelineError
    };
  }
}; 