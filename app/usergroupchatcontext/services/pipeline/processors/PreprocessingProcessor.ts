'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ProcessingMetadata } from '../../../types';
import { processingTracker } from '../../ProcessingTracker';
import { LLMService } from '../../LLMService';

/**
 * Preprocesses a message using the bot's preprocessing prompt if available
 */
export const PreprocessingProcessor: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  // Skip preprocessing if:
  // 1. Pre-processing is disabled in settings
  // 2. Bot doesn't have a pre-processing prompt
  // 3. This is a voice ghost and pre-processing hooks are disabled for voice mode
  if (
    !context.settings.promptProcessor.preProcessingEnabled ||
    !bot.preProcessingPrompt ||
    (context.isVoiceGhost && !context.settings.transcription.vadMode)
  ) {
    return {
      content,
      metadata: {
        ...metadata,
        preProcessed: false,
        preprocessedContent: undefined,
        processingStage: 'skipped-preprocessing'
      }
    };
  }
  
  // Track the start time for performance monitoring
  const startTime = Date.now();
  
  // Update processing stage
  processingTracker.startPreProcessing(bot.id);
  
  try {
    // Process content with bot's preprocessing prompt using the specialized LLMService method
    const processedContent = await LLMService.preprocessUserInput(
      content,
      bot.preProcessingPrompt || '', // Handle undefined with empty string
      bot.model
    );
    
    // Track processing time
    const processingTime = Date.now() - startTime;
    
    // Check if content was modified
    const wasModified = processedContent !== content;
    
    // End preprocessing stage
    processingTracker.endPreProcessing(bot.id);
    
    return {
      content: processedContent,
      metadata: {
        ...metadata,
        preProcessed: wasModified,
        preprocessedContent: wasModified ? processedContent : undefined,
        preprocessingTime: processingTime,
        processingStage: 'completed-preprocessing'
      }
    };
  } catch (error) {
    console.error('Error in preprocessing:', error);
    
    // End preprocessing stage with error
    processingTracker.endPreProcessing(bot.id);
    
    // Create a pipeline error
    const pipelineError = new PipelineError(
      PipelineErrorType.PREPROCESSING_ERROR,
      `Preprocessing failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Return original content, but include error in metadata
    return {
      content,
      metadata: {
        ...metadata,
        preProcessed: false,
        preprocessingTime: Date.now() - startTime,
        preprocessingError: pipelineError.message,
        processingStage: 'error-preprocessing'
      },
      error: pipelineError
    };
  }
}; 