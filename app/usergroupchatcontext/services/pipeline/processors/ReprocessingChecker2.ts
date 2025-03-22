'use client';

import { StageProcessor } from '../types';
import { processingTracker } from '../../ProcessingTracker';
import reprocessingOrchestrator from '../../ReprocessingOrchestratorService';

/**
 * A redesigned ReprocessingChecker that uses the orchestrator service
 * to evaluate if a response needs reprocessing.
 * 
 * This processor follows the Single Responsibility Principle by:
 * 1. Focusing solely on checking if reprocessing is needed
 * 2. Delegating the evaluation logic to specialized strategies
 * 3. Maintaining only the pipeline flow control logic
 */
export const ReprocessingChecker2: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  console.log('==== REPROCESSING CHECKER 2.0 ====');
  console.log('Bot:', bot.id, bot.name);
  console.log('Reprocessing enabled:', bot.enableReprocessing);
  console.log('Reprocessing criteria:', bot.reprocessingCriteria);
  console.log('Current content:', content.substring(0, 50) + '...');
  
  // Skip reprocessing check if:
  // 1. Reprocessing is already needed (flag set by a previous stage)
  // 2. Reprocessing is disabled for the bot
  // 3. We've reached the maximum reprocessing depth
  // 4. No reprocessing criteria is specified
  const currentDepth = metadata.reprocessingDepth || 0;
  const maxDepth = context.settings.chat.maxReprocessingDepth || 3;
  
  if (
    metadata.needsReprocessing === true ||
    bot.enableReprocessing === false ||
    currentDepth >= maxDepth ||
    !bot.reprocessingCriteria ||
    bot.reprocessingCriteria.trim() === ''
  ) {
    console.log('ReprocessingChecker2: Skipping reprocessing check due to constraints:', {
      alreadyNeeded: metadata.needsReprocessing === true,
      enableReprocessing: bot.enableReprocessing,
      currentDepth,
      maxDepth,
      hasCriteria: !!bot.reprocessingCriteria
    });
    
    return {
      content,
      metadata: {
        ...metadata,
        processingStage: 'skipped-reprocessing-check'
      }
    };
  }
  
  console.log('ReprocessingChecker2: Evaluating with criteria:', bot.reprocessingCriteria);
  
  try {
    // Delegate evaluation to the orchestrator
    const shouldReprocess = await reprocessingOrchestrator.shouldReprocessResponse(
      content,
      bot,
      context,
      metadata
    );
    
    if (shouldReprocess) {
      console.log('ReprocessingChecker2: Response NEEDS reprocessing based on orchestrator evaluation');
      
      // Start reprocessing tracking
      const { reprocessCount, updatedMetadata } = reprocessingOrchestrator.startReprocessing(
        bot.id,
        content,
        metadata
      );
      
      return {
        content,
        metadata: updatedMetadata
      };
    }
    
    console.log('ReprocessingChecker2: Response does NOT need reprocessing');
    return {
      content,
      metadata: {
        ...metadata,
        needsReprocessing: false,
        processingStage: 'reprocessing-not-needed'
      }
    };
  } catch (error) {
    console.error('ReprocessingChecker2: Error in reprocessing check:', error);
    
    // In case of error, don't trigger reprocessing
    return {
      content,
      metadata: {
        ...metadata,
        needsReprocessing: false,
        processingStage: 'reprocessing-check-error',
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}; 