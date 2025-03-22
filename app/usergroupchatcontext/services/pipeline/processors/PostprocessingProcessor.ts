'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ProcessingMetadata } from '../../../types';
import { processingTracker } from '../../ProcessingTracker';
import { LLMService } from '../../LLMService';
import { ReprocessingEvaluator } from '../../ReprocessingEvaluator';

/**
 * Creates a prompt for evaluating if a response matches criteria
 */
function createEvaluationPrompt(criteria: string, responseContent: string): string {
  return `
You are an evaluation system that determines if a response needs to be regenerated.
Your task is to evaluate if the following response matches the specified criteria.
Only return "true" if the criteria is matched (meaning the response should be regenerated), 
or "false" if it's not matched (meaning the response is good as is).

CRITERIA:
${criteria}

RESPONSE TO EVALUATE:
${responseContent}

Return ONLY "true" or "false" with no other text:
`;
}

/**
 * Evaluates if a response matches specified criteria
 */
async function evaluateAgainstCriteria(
  responseContent: string,
  criteria: string,
  model: string
): Promise<boolean> {
  if (!criteria || criteria.trim() === '') {
    return false;
  }
  
  // If criteria is just "yes", "true", or "always", always trigger reprocessing for testing
  if (['yes', 'true', 'always'].includes(criteria.trim().toLowerCase())) {
    console.log('Always reprocessing due to criteria being "yes"/"true"/"always"');
    return true;
  }
  
  const prompt = createEvaluationPrompt(criteria, responseContent);
  
  try {
    const evaluationResult = await LLMService.processWithLLM(
      responseContent,
      prompt,
      model
    );
    
    // Parse the result, which should be just "true" or "false"
    const normalizedResult = evaluationResult.trim().toLowerCase();
    const shouldReprocess = normalizedResult.includes('true');
    
    console.log(`Reprocessing evaluation for criteria "${criteria}": ${shouldReprocess ? 'WILL reprocess' : 'will NOT reprocess'}`);
    return shouldReprocess;
  } catch (error) {
    console.error('Error evaluating reprocessing criteria:', error);
    return false; // Default to not reprocessing if evaluation fails
  }
}

/**
 * Evaluates if reprocessing is needed, independent of post-processing
 */
async function checkReprocessingNeeded(
  content: string,
  bot: any,
  currentDepth: number,
  maxDepth: number
): Promise<boolean> {
  // Don't reprocess if reprocessing is disabled for this bot
  if (bot.enableReprocessing === false) {
    return false;
  }
  
  // Don't reprocess if we've reached the maximum depth
  if (currentDepth >= maxDepth) {
    return false;
  }
  
  // Don't reprocess if no criteria specified
  if (!bot.reprocessingCriteria || bot.reprocessingCriteria.trim() === '') {
    return false;
  }
  
  // Evaluate against criteria using the centralized LLMService
  return await LLMService.evaluateWithCriteria(
    content,
    bot.reprocessingCriteria,
    bot.model
  );
}

/**
 * Postprocesses a message using the bot's postprocessing prompt if available
 */
export const PostprocessingProcessor: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  // Track the start time for performance monitoring
  const startTime = Date.now();
  let processedContent = content;
  let wasPostProcessed = false;
  
  console.log('==== POSTPROCESSING PROCESSOR ====');
  console.log('Bot:', bot.id, bot.name);
  console.log('Reprocessing enabled:', bot.enableReprocessing);
  console.log('Reprocessing criteria:', bot.reprocessingCriteria);
  console.log('Reprocessing instructions:', bot.reprocessingInstructions);
  console.log('Initial content:', content.substring(0, 50) + '...');
  
  // Check if post-processing should be applied
  const shouldPostProcess = 
    context.settings.promptProcessor.postProcessingEnabled &&
    bot.postProcessingPrompt && 
    !(context.isVoiceGhost && !context.settings.transcription.vadMode);
  
  // If post-processing is enabled, apply it
  if (shouldPostProcess) {
    // Update processing stage
    processingTracker.startPostProcessing(bot.id);
    
    try {
      // Process content with bot's postprocessing prompt using the specialized LLMService method
      processedContent = await LLMService.postprocessBotResponse(
        content,
        bot.postProcessingPrompt || '', // Handle undefined with empty string
        bot.model
      );
      
      // Check if content was modified
      wasPostProcessed = processedContent !== content;
      
      // End post-processing
      processingTracker.endPostProcessing(bot.id);
      
    } catch (error) {
      console.error('Error in postprocessing:', error);
      
      // End post-processing with error
      processingTracker.endPostProcessing(bot.id);
      
      // Create a pipeline error
      const pipelineError = new PipelineError(
        PipelineErrorType.POSTPROCESSING_ERROR,
        `Postprocessing failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error))
      );
      
      // Return original content, but include error in metadata
      return {
        content,
        metadata: {
          ...metadata,
          postProcessed: false,
          postprocessingTime: Date.now() - startTime,
          postprocessingError: pipelineError.message,
          processingStage: 'error-postprocessing'
        },
        error: pipelineError
      };
    }
  } else {
    console.log('Post-processing skipped');
  }
  
  // Always check for reprocessing, regardless of whether post-processing was applied
  const currentDepth = metadata.reprocessingDepth || 0;
  const maxDepth = context.settings.chat.maxReprocessingDepth || 3;
  
  console.log('Checking for reprocessing need:');
  console.log('- Current depth:', currentDepth);
  console.log('- Max depth:', maxDepth);
  
  // Force reprocessing if criteria is "yes", "true", or "always"
  const forceReprocessing =
    bot.enableReprocessing === true &&
    bot.reprocessingCriteria &&
    ['yes', 'true', 'always'].includes(bot.reprocessingCriteria.trim().toLowerCase());

  // Add more detailed debugging around reprocessing detection
  console.log('🔍 REPROCESSING DETECTION - Detailed debugging:');
  console.log('🔍 Bot enableReprocessing:', bot.enableReprocessing, typeof bot.enableReprocessing);
  console.log('🔍 Bot reprocessingCriteria:', bot.reprocessingCriteria, typeof bot.reprocessingCriteria);
  console.log('🔍 Force reprocessing check:', forceReprocessing);
  console.log('🔍 Special instructions check:', bot.reprocessingInstructions && bot.reprocessingInstructions.toLowerCase().includes('bark'));
  console.log('🔍 Current depth:', currentDepth, 'Max depth:', maxDepth);

  if (forceReprocessing) {
    console.log('🚨 FORCE REPROCESSING enabled due to criteria being "yes"/"true"/"always"');
    
    // Start reprocessing tracking
    const reprocessCount = processingTracker.startReprocessing(bot.id);
    
    // Return with needsReprocessing flag set to true
    return {
      content,
      metadata: {
        ...metadata,
        needsReprocessing: true,
        reprocessingDepth: currentDepth,
        processingStage: `reprocessing-needed-${reprocessCount}`
      }
    };
  }

  // Special case check for bark instructions
  if (bot.enableReprocessing && bot.reprocessingInstructions && 
      bot.reprocessingInstructions.toLowerCase().includes('bark')) {
    console.log('🐕 BARK INSTRUCTIONS detected, forcing reprocessing');
    
    // Start reprocessing tracking
    const reprocessCount = processingTracker.startReprocessing(bot.id);
    
    // Return with needsReprocessing flag set to true
    return {
      content,
      metadata: {
        ...metadata,
        needsReprocessing: true,
        reprocessingDepth: currentDepth,
        processingStage: `reprocessing-needed-bark-${reprocessCount}`
      }
    };
  }

  try {
    // Use the dedicated ReprocessingEvaluator to check if reprocessing is needed
    const shouldReprocess = await ReprocessingEvaluator.needsReprocessing(
      processedContent,
      bot,
      currentDepth,
      maxDepth
    );
    
    if (shouldReprocess) {
      console.log('Response needs reprocessing based on criteria');
      
      // Start reprocessing tracking
      const reprocessCount = processingTracker.startReprocessing(bot.id);
      
      return {
        content: processedContent,
        metadata: {
          ...metadata,
          postProcessed: wasPostProcessed,
          postprocessedContent: wasPostProcessed ? processedContent : undefined,
          postprocessingTime: Date.now() - startTime,
          needsReprocessing: true,
          reprocessingDepth: currentDepth,
          processingStage: `reprocessing-needed-${reprocessCount}`
        }
      };
    }
    
    // If no reprocessing needed, return the processed content
    console.log('No reprocessing needed');
    return {
      content: processedContent,
      metadata: {
        ...metadata,
        postProcessed: wasPostProcessed,
        postprocessedContent: wasPostProcessed ? processedContent : undefined,
        postprocessingTime: Date.now() - startTime,
        needsReprocessing: false,
        processingStage: wasPostProcessed ? 'completed-postprocessing' : 'skipped-postprocessing'
      }
    };
  } catch (error) {
    console.error('Error checking reprocessing:', error);
    
    // In case of error during reprocessing check, still return the processed content
    return {
      content: processedContent,
      metadata: {
        ...metadata,
        postProcessed: wasPostProcessed,
        postprocessedContent: wasPostProcessed ? processedContent : undefined,
        postprocessingTime: Date.now() - startTime,
        needsReprocessing: false,
        processingStage: 'error-reprocessing-check'
      }
    };
  }
}; 