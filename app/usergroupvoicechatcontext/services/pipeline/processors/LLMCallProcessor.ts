'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ProcessingMetadata } from '../../../types';

/**
 * Handles the main interaction with the LLM
 */
export const LLMCallProcessor: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  // Track the start time for performance monitoring
  const startTime = Date.now();
  
  try {
    // Get messages for context - we'll use only the messages from the history
    // plus the current content as a user message
    const messageHistory = context.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Set up API options based on whether this is a voice message
    let modelToUse = bot.model || 'gpt-4o';
    
    // Check if this is a realtime model and replace it with a standard model for API compatibility
    if (modelToUse.includes('realtime')) {
      console.log(`Converting realtime model ${modelToUse} to gpt-4o for API compatibility`);
      modelToUse = 'gpt-4o';
    }
      
    // Log the model selection
    console.log(`Using model ${modelToUse} for ${context.isVoiceMode ? 'voice' : 'text'} message`);
    
    try {
      // Prepare request body
      const requestBody = {
        messages: [...messageHistory, { role: 'user', content }],
        model: modelToUse,
        temperature: bot.temperature || 0.7,
        max_tokens: bot.maxTokens || 1024
      };
      
      // Debug log the request body (redact long messages for clarity)
      const debugRequestBody = {
        ...requestBody,
        messages: requestBody.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content.length > 50 ? `${msg.content.substring(0, 50)}...` : msg.content
        }))
      };
      console.log(`Sending request to OpenAI chat API:`, debugRequestBody);
      
      // Make API call
      const response = await fetch('/usergroupchatcontext/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      // Handle API errors
      if (!response.ok) {
        // Try to get more details from the error response
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData);
          console.error('API error details:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        
        throw new Error(`API request failed with status ${response.status}${errorDetails ? `: ${errorDetails}` : ''}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Check if response includes tool calls
      if (data.choices?.[0]?.message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
        // Return the raw response with tool calls for the tool resolution stage
        return {
          content: data.choices[0].message.content || '',
          metadata: {
            ...metadata,
            llmCallTime: Date.now() - startTime,
            hasToolCalls: true,
            rawLLMResponse: data.choices[0].message
          }
        };
      } else {
        // Extract the content from a regular response
        const botResponse = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
        
        return {
          content: botResponse,
          metadata: {
            ...metadata,
            llmCallTime: Date.now() - startTime,
            hasToolCalls: false,
            rawLLMResponse: data.choices[0].message
          }
        };
      }
    } catch (error) {
      console.error('Error processing with OpenAI:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in LLM call:', error);
    
    // Create a pipeline error
    const pipelineError = new PipelineError(
      PipelineErrorType.LLM_CALL_ERROR,
      `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
    
    // For voice mode, provide more user-friendly error messages
    const errorContent = context.isVoiceMode
      ? "I'm sorry, I encountered a problem processing your voice input. Please try again or switch to text mode."
      : "I'm sorry, I encountered an error while processing your request. Please try again.";
    
    // Return error response
    return {
      content: errorContent,
      metadata: {
        ...metadata,
        llmCallTime: Date.now() - startTime,
        llmCallError: pipelineError.message,
        usedFallbackService: true
      },
      error: pipelineError,
      skipNextStages: true // Skip subsequent stages since we have an error
    };
  }
}; 