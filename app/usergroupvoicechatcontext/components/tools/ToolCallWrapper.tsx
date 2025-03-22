'use client';

import React, { useEffect } from 'react';
import { Message, ToolResult } from '../../types';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useToolCall } from '../../context/ToolCallProvider';
import { ToolProcessorService } from '../../services/toolProcessorService';
import { ToolCallParams } from '../../services/toolCallService';

interface ToolCallWrapperProps {
  children: React.ReactNode;
}

export function ToolCallWrapper({ children }: ToolCallWrapperProps) {
  const { state, dispatch } = useGroupChatContext();
  const { executeToolCalls } = useToolCall();
  
  // Process new bot messages for tool calls
  useEffect(() => {
    const processBotMessages = async () => {
      const messages = state.messages;
      if (messages.length === 0) return;
      
      // Get the last message
      const lastMessage = messages[messages.length - 1];
      
      // Only process messages from bots that don't already have tool results
      if (
        lastMessage.role === 'assistant' && 
        lastMessage.type === 'text' &&
        (!lastMessage.metadata?.toolResults || lastMessage.metadata.toolResults.length === 0)
      ) {
        // Extract tool calls from the message
        const toolCalls = ToolProcessorService.processMessageForToolCalls(lastMessage);
        
        if (toolCalls && toolCalls.length > 0) {
          // Execute the tool calls
          try {
            // Set processing state
            dispatch({ type: 'SET_PROCESSING', payload: true });
            
            // Execute the tool calls
            const results = await executeToolCalls(toolCalls);
            
            // Update the message with tool results
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                ...lastMessage,
                metadata: {
                  ...lastMessage.metadata,
                  toolResults: results
                }
              }
            });
            
            // Generate a follow-up message with the tool results if needed
            if (results.length > 0 && results.some(r => !r.error)) {
              // Create a formatted response with the tool results
              let resultContent = 'Here are the results from the tools I called:\n\n';
              
              results.forEach(result => {
                resultContent += ToolProcessorService.formatToolResults(
                  result.toolName, 
                  result.error || result.output
                );
              });
              
              // Add a message with the results
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: Date.now().toString(),
                  content: resultContent,
                  role: 'system',
                  sender: 'system',
                  senderName: 'Tool Results',
                  timestamp: Date.now(),
                  type: 'tool_result',
                  metadata: {
                    toolResults: results
                  }
                }
              });
            }
          } catch (error) {
            console.error('Error executing tool calls:', error);
          } finally {
            // Clear processing state
            dispatch({ type: 'SET_PROCESSING', payload: false });
          }
        }
      }
    };
    
    processBotMessages();
  }, [state.messages, dispatch, executeToolCalls]);
  
  return <>{children}</>;
} 