'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ProcessingMetadata } from '../../../types';

/**
 * Process a message with an LLM using the provided prompt
 */
async function processWithLLM(
  content: string,
  prompt: string,
  model: string
): Promise<string> {
  // Prepare message format for OpenAI API
  const messages = [
    {
      role: 'system',
      content: prompt
    },
    {
      role: 'user',
      content
    }
  ];
  
  try {
    // Call the OpenAI API through our endpoint
    const response = await fetch('/usergroupchatcontext/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages,
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content || content;
    } else {
      throw new Error('No response content received from OpenAI');
    }
  } catch (error) {
    console.error('Error processing with LLM:', error);
    throw error;
  }
}

/**
 * Checks if a message needs reprocessing
 */
function needsReprocessing(
  originalContent: string,
  processedContent: string,
  currentDepth: number,
  maxDepth: number
): boolean {
  // Don't reprocess if we've hit the maximum depth
  if (currentDepth >= maxDepth) {
    return false;
  }
  
  // Simple check: if content was modified significantly, consider reprocessing
  const originalLength = originalContent.length;
  const processedLength = processedContent.length;
  
  // If length changed by more than 20%, consider it a significant modification
  const changeRatio = Math.abs(processedLength - originalLength) / originalLength;
  
  return changeRatio > 0.2;
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
  // Skip postprocessing if:
  // 1. Post-processing is disabled in settings
  // 2. Bot doesn't have a post-processing prompt
  // 3. This is a voice ghost and post-processing hooks are disabled for voice mode
  if (
    !context.settings.promptProcessor.postProcessingEnabled ||
    !bot.postProcessingPrompt ||
    (context.isVoiceGhost && !context.settings.transcription.vadMode)
  ) {
    return {
      content,
      metadata: {
        ...metadata,
        postProcessed: false,
        postprocessedContent: undefined
      }
    };
  }
  
  // Track the start time for performance monitoring
  const startTime = Date.now();
  
  try {
    // Process content with bot's postprocessing prompt
    const processedContent = await processWithLLM(
      content,
      bot.postProcessingPrompt,
      bot.model
    );
    
    // Track processing time
    const processingTime = Date.now() - startTime;
    
    // Check if content was modified
    const wasModified = processedContent !== content;
    
    // Check if the response needs reprocessing
    const shouldReprocess = wasModified && 
      needsReprocessing(
        content, 
        processedContent, 
        context.currentDepth, 
        context.settings.chat.maxReprocessingDepth
      ) && 
      bot.enableReprocessing !== false;
    
    return {
      content: processedContent,
      metadata: {
        ...metadata,
        postProcessed: wasModified,
        postprocessedContent: wasModified ? processedContent : undefined,
        postprocessingTime: processingTime,
        needsReprocessing: shouldReprocess
      }
    };
  } catch (error) {
    console.error('Error in postprocessing:', error);
    
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
        postprocessingError: pipelineError.message
      },
      error: pipelineError
    };
  }
}; 