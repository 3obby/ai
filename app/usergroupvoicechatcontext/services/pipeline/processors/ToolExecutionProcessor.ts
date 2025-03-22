'use client';

import { StageProcessor, PipelineError, PipelineErrorType } from '../types';
import { ToolResult } from '../../../types';

/**
 * Mock tool execution function that should be replaced with actual implementation
 */
async function executeToolCalls(
  toolCalls: any[]
): Promise<ToolResult[]> {
  console.warn('Using mock executeToolCalls - replace with actual implementation from toolCallService');
  
  // Simulate tool execution with a delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return toolCalls.map(call => ({
    toolName: call.name,
    input: call.parameters,
    output: { result: `Mock result for ${call.name}` },
    executionTime: 0,
  }));
}

/**
 * Executes the resolved tool calls
 */
export const ToolExecutionProcessor: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  // Skip tool execution if:
  // 1. No resolved tool calls in metadata
  // 2. Bot doesn't have tool calling enabled
  if (
    !metadata.resolvedToolCalls || 
    !bot.useTools ||
    context.isVoiceMode // Skip tool execution in voice mode for now
  ) {
    return {
      content,
      metadata,
    };
  }
  
  try {
    const startTime = Date.now();
    
    // Execute the tool calls
    const toolResults = await executeToolCalls(metadata.resolvedToolCalls);
    
    console.log(`Executed ${toolResults.length} tool calls:`, toolResults);
    
    // Prepare tool response messages for the follow-up completion
    const toolResponseMessages = toolResults.map(result => ({
      role: 'tool' as const,
      content: JSON.stringify(result.output),
      tool_call_id: result.toolName
    }));
    
    // Get final response that includes tool outputs
    // Make a second LLM call to incorporate the tool results
    try {
      // Get messages for context
      const messageHistory = context.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Set up API options
      let modelToUse = bot.model || 'gpt-4o';
      
      // Check if this is a realtime model and replace it with a standard model for API compatibility
      if (modelToUse.includes('realtime')) {
        modelToUse = 'gpt-4o';
      }
      
      // Make follow-up API call with tool results
      const followupResponse = await fetch('/usergroupchatcontext/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messageHistory,
            { role: 'user', content },
            ...toolResponseMessages
          ],
          model: modelToUse,
          temperature: bot.temperature || 0.7,
          max_tokens: bot.maxTokens || 1024,
        }),
      });
      
      if (!followupResponse.ok) {
        throw new Error(`Follow-up API request failed with status ${followupResponse.status}`);
      }
      
      const followupData = await followupResponse.json();
      const followupContent = followupData.choices?.[0]?.message?.content || "I couldn't generate a response with the tool results.";
      
      return {
        content: followupContent,
        metadata: {
          ...metadata,
          toolExecutionTime: Date.now() - startTime,
        },
        toolResults,
      };
    } catch (error) {
      console.error('Error in follow-up LLM call:', error);
      
      // Fall back to showing just the tool results without a follow-up LLM explanation
      const toolResultsText = toolResults
        .map(result => `Result from ${result.toolName}: ${JSON.stringify(result.output)}`)
        .join('\n\n');
      
      return {
        content: `I executed the requested tools, but couldn't generate a proper explanation. Here are the raw results:\n\n${toolResultsText}`,
        metadata: {
          ...metadata,
          toolExecutionTime: Date.now() - startTime,
          followupLLMError: error instanceof Error ? error.message : String(error),
        },
        toolResults,
      };
    }
  } catch (error) {
    console.error('Error in tool execution:', error);
    
    // Create a pipeline error
    const pipelineError = new PipelineError(
      PipelineErrorType.TOOL_EXECUTION_ERROR,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Continue with the original content but add error info to metadata
    return {
      content: `I tried to execute the tools you requested, but encountered an error: ${pipelineError.message}`,
      metadata: {
        ...metadata,
        toolExecutionError: pipelineError.message,
      },
      error: pipelineError,
    };
  }
}; 