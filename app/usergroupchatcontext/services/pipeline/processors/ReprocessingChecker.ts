'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ProcessingMetadata } from '../../../types';
import { processingTracker } from '../../ProcessingTracker';

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
  
  const prompt = `
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

  try {
    const evaluationResult = await processWithLLM(
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
 * Checks if a bot response needs reprocessing based on criteria, independent of post-processing
 */
export const ReprocessingChecker: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  console.log('ReprocessingChecker running with content:', content.substring(0, 50) + '...');
  
  // Skip reprocessing check if:
  // 1. Reprocessing is disabled for the bot
  // 2. We've reached the maximum reprocessing depth
  // 3. No reprocessing criteria is specified
  const currentDepth = metadata.reprocessingDepth || 0;
  const maxDepth = context.settings.chat.maxReprocessingDepth || 3;
  
  if (
    bot.enableReprocessing === false ||
    currentDepth >= maxDepth ||
    !bot.reprocessingCriteria ||
    bot.reprocessingCriteria.trim() === ''
  ) {
    console.log('Skipping reprocessing check:', {
      enableReprocessing: bot.enableReprocessing,
      currentDepth,
      maxDepth,
      hasCriteria: !!bot.reprocessingCriteria
    });
    
    return {
      content,
      metadata: {
        ...metadata,
        needsReprocessing: false,
        processingStage: 'skipped-reprocessing-check'
      }
    };
  }
  
  console.log('Evaluating for reprocessing with criteria:', bot.reprocessingCriteria);
  
  try {
    // Evaluate if the response needs reprocessing
    const shouldReprocess = await evaluateAgainstCriteria(
      content,
      bot.reprocessingCriteria,
      bot.model
    );
    
    if (shouldReprocess) {
      console.log('Response NEEDS reprocessing based on criteria');
      
      // Start reprocessing tracking
      const reprocessCount = processingTracker.startReprocessing(bot.id);
      
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
    
    console.log('Response does NOT need reprocessing');
    return {
      content,
      metadata: {
        ...metadata,
        needsReprocessing: false,
        processingStage: 'reprocessing-not-needed'
      }
    };
  } catch (error) {
    console.error('Error in reprocessing check:', error);
    
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