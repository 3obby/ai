'use client';

import { useState, useEffect, useRef } from 'react';
import { useGroupChatContext } from '../context/GroupChatContext';
import { useBotRegistry } from '../context/BotRegistryProvider';
import { useToolCall } from '../context/ToolCallProvider';
import { Message, ToolResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook to enable integration between messages and tools
 * Watches for messages that might contain tool calls and handles them
 */
export function useToolIntegration() {
  const { state, dispatch } = useGroupChatContext();
  const { state: botState } = useBotRegistry();
  const { executeTool } = useToolCall();
  const processedToolMessages = useRef<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Skip if already processing
    if (isProcessing) return;

    // Get the latest user message that hasn't been processed for tool calls
    const latestMessages = [...state.messages]
      .filter(msg => 
        (msg.role === 'user' || msg.role === 'assistant') && 
        !processedToolMessages.current.has(msg.id)
      )
      .slice(-5); // Only look at the last 5 unprocessed messages
    
    if (latestMessages.length === 0) return;
    
    // Process each unprocessed message
    const processMessages = async () => {
      setIsProcessing(true);
      
      for (const message of latestMessages) {
        // Mark this message as processed to avoid re-processing
        processedToolMessages.current.add(message.id);
        
        // Check for potential tool calls in the message content
        const toolCalls = extractToolCalls(message.content);
        
        if (toolCalls.length > 0) {
          // Execute each tool call
          for (const toolCall of toolCalls) {
            try {
              const toolResult = await executeTool(toolCall.name, toolCall.args);
              
              // Create a new message with the tool result
              const resultMessage: Message = {
                id: uuidv4(),
                content: formatToolResult(toolCall.name, toolResult.output),
                role: 'system',
                sender: 'system',
                timestamp: Date.now(),
                type: 'tool_result',
                metadata: {
                  toolResults: [toolResult]
                }
              };
              
              // Add the result to the chat
              dispatch({
                type: 'ADD_MESSAGE',
                payload: resultMessage
              });
            } catch (error) {
              console.error(`Error executing tool ${toolCall.name}:`, error);
              
              // Add error message
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: uuidv4(),
                  content: `Error executing tool ${toolCall.name}: ${error}`,
                  role: 'system',
                  sender: 'system',
                  timestamp: Date.now(),
                  type: 'tool_result',
                  metadata: {
                    toolResults: [{
                      toolName: toolCall.name,
                      input: toolCall.args,
                      output: null,
                      error: String(error),
                      executionTime: Date.now()
                    }]
                  }
                }
              });
            }
          }
        }
        
        // For voice messages, also try to detect implicit tool commands
        if (message.type === 'voice' && message.role === 'user') {
          await processImplicitVoiceToolCommands(message);
        }
      }
      
      setIsProcessing(false);
    };
    
    processMessages();
  }, [state.messages, dispatch, executeTool]);
  
  /**
   * Process implicit tool commands from voice messages
   */
  const processImplicitVoiceToolCommands = async (message: Message) => {
    // Simple voice command detection for common phrases
    const content = message.content.toLowerCase();
    
    // Web search detection
    if (
      content.includes('search for') || 
      content.includes('look up') || 
      content.includes('find information about')
    ) {
      try {
        // Extract search query
        let searchQuery = content.replace(/search for|look up|find information about/gi, '').trim();
        
        // Clean up query
        searchQuery = searchQuery.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
        
        if (searchQuery) {
          // Execute search tool
          const toolResult = await executeTool('web_search', { query: searchQuery });
          
          // Create result message
          const resultMessage: Message = {
            id: uuidv4(),
            content: `Search results for "${searchQuery}":\n\n${formatToolResult('web_search', toolResult.output)}`,
            role: 'system',
            sender: 'system',
            timestamp: Date.now(),
            type: 'tool_result',
            metadata: {
              toolResults: [toolResult]
            }
          };
          
          // Add the result to the chat
          dispatch({
            type: 'ADD_MESSAGE',
            payload: resultMessage
          });
        }
      } catch (error) {
        console.error('Error processing voice search command:', error);
      }
    }
    
    // Other tool command patterns could be added here
  };
  
  return null;
}

/**
 * Extract tool calls from message content
 */
function extractToolCalls(content: string): Array<{ name: string, args: Record<string, any> }> {
  const toolCalls: Array<{ name: string, args: Record<string, any> }> = [];
  
  // Pattern for tool calls - e.g., /toolName param1=value1 param2=value2
  const toolCallRegex = /\/([a-zA-Z0-9_]+)(\s+([^/]*))?/g;
  let match;
  
  while ((match = toolCallRegex.exec(content)) !== null) {
    const toolName = match[1];
    const argsString = match[3] || '';
    
    // Parse arguments
    const args: Record<string, any> = {};
    const argPairs = argsString.match(/([a-zA-Z0-9_]+)=("[^"]*"|'[^']*'|[^"\s]+)/g) || [];
    
    argPairs.forEach(pair => {
      const [key, value] = pair.split('=');
      
      // Handle quoted values
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        args[key] = value.substring(1, value.length - 1);
      } else {
        // Convert to number if it looks like a number
        const numValue = Number(value);
        args[key] = !isNaN(numValue) ? numValue : value;
      }
    });
    
    toolCalls.push({ name: toolName, args });
  }
  
  return toolCalls;
}

/**
 * Format tool result for display
 */
function formatToolResult(toolName: string, result: any): string {
  try {
    if (typeof result === 'object') {
      return `Tool "${toolName}" result:\n\n${JSON.stringify(result, null, 2)}`;
    }
    return `Tool "${toolName}" result:\n\n${result}`;
  } catch (e) {
    return `Tool "${toolName}" result: [Error formatting result]`;
  }
} 