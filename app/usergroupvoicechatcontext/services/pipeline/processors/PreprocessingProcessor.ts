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
        preprocessedContent: undefined
      }
    };
  }
  
  // Track the start time for performance monitoring
  const startTime = Date.now();
  
  try {
    // Process content with bot's preprocessing prompt
    const processedContent = await processWithLLM(
      content,
      bot.preProcessingPrompt,
      bot.model
    );
    
    // Track processing time
    const processingTime = Date.now() - startTime;
    
    // Check if content was modified
    const wasModified = processedContent !== content;
    
    return {
      content: processedContent,
      metadata: {
        ...metadata,
        preProcessed: wasModified,
        preprocessedContent: wasModified ? processedContent : undefined,
        preprocessingTime: processingTime
      }
    };
  } catch (error) {
    console.error('Error in preprocessing:', error);
    
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
        preprocessingError: pipelineError.message
      },
      error: pipelineError
    };
  }
}; 