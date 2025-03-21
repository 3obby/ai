'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ToolResult } from '../../../types';

/**
 * Extracts tool call information from LLM responses
 */
export const ToolResolutionProcessor: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  // Skip tool resolution if:
  // 1. Bot doesn't have tool calling enabled
  // 2. We're in voice mode (for now)
  // 3. No tool calls were detected in the LLM response
  if (
    !bot.useTools || 
    context.isVoiceMode || 
    !metadata.hasToolCalls || 
    !metadata.rawLLMResponse
  ) {
    return {
      content,
      metadata,
    };
  }
  
  try {
    const startTime = Date.now();
    
    // Extract tool call information from the LLM response
    const rawResponse = metadata.rawLLMResponse;
    
    // Ensure there are tool calls to process
    if (!rawResponse.tool_calls || rawResponse.tool_calls.length === 0) {
      return {
        content,
        metadata: {
          ...metadata,
          toolResolutionTime: Date.now() - startTime,
          noToolCallsDetected: true,
        },
      };
    }
    
    // Format the tool calls for execution
    const formattedToolCalls = rawResponse.tool_calls.map((call: any) => ({
      id: call.id,
      name: call.function.name,
      parameters: (() => {
        try {
          // Safely try to parse the arguments
          return JSON.parse(call.function.arguments);
        } catch (e) {
          console.error(`Failed to parse arguments for tool ${call.function.name}:`, e);
          return {}; // Return empty object on error
        }
      })()
    }));
    
    console.log(`Resolved ${formattedToolCalls.length} tool calls:`, formattedToolCalls);
    
    return {
      content,
      metadata: {
        ...metadata,
        toolResolutionTime: Date.now() - startTime,
        resolvedToolCalls: formattedToolCalls,
      },
    };
  } catch (error) {
    console.error('Error in tool resolution:', error);
    
    // Create a pipeline error
    const pipelineError = new PipelineError(
      PipelineErrorType.TOOL_RESOLUTION_ERROR,
      `Tool resolution failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Continue with the original content but add error info to metadata
    return {
      content,
      metadata: {
        ...metadata,
        toolResolutionError: pipelineError.message,
      },
      error: pipelineError,
    };
  }
}; 