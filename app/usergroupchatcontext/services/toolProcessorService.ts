'use client';

import { ToolCallParams } from './toolCallService';
import { Message } from '../types';

// Regular expression patterns for tool call extraction
const FUNCTION_CALL_PATTERN = /(?:```json|```)\s*(\{[\s\S]*?\})\s*(?:```)/g;
const TOOL_CALL_PATTERN = /(?:```function|```tool_call)\s*([\s\S]*?)(?:```)/g;
const TOOL_RESULT_PATTERN = /(?:```result|```tool_result)\s*([\s\S]*?)(?:```)/g;

// Interface for a parsed tool call
export interface ParsedToolCall {
  name: string;
  parameters: Record<string, any>;
}

export class ToolProcessorService {
  /**
   * Extract tool calls from a message content
   */
  public static extractToolCalls(messageContent: string): ToolCallParams[] {
    const toolCalls: ToolCallParams[] = [];
    
    // Try all patterns
    try {
      // Method 1: Extract JSON function calls
      let match;
      while ((match = FUNCTION_CALL_PATTERN.exec(messageContent)) !== null) {
        try {
          const jsonStr = match[1];
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.name && (parsed.arguments || parsed.parameters)) {
            toolCalls.push({
              name: parsed.name,
              parameters: parsed.arguments || parsed.parameters || {}
            });
          }
        } catch (e) {
          console.warn('Failed to parse JSON tool call:', e);
        }
      }
      
      // Method 2: Extract from more explicit tool_call format
      TOOL_CALL_PATTERN.lastIndex = 0; // Reset regex index
      while ((match = TOOL_CALL_PATTERN.exec(messageContent)) !== null) {
        const content = match[1];
        const nameMatch = content.match(/name:\s*([^\s\n]+)/i);
        
        if (nameMatch) {
          const name = nameMatch[1];
          // Extract parameters by finding a JSON object
          const paramsMatch = content.match(/(?:arguments|parameters):\s*(\{[\s\S]*?\})\s*(?:$|[,\n])/i);
          
          if (paramsMatch) {
            try {
              const params = JSON.parse(paramsMatch[1]);
              toolCalls.push({ name, parameters: params });
            } catch (e) {
              // If JSON parsing fails, try to extract key-value pairs
              const params: Record<string, string> = {};
              const kvPattern = /(\w+):\s*([^\n,]+)/g;
              let kvMatch;
              
              while ((kvMatch = kvPattern.exec(content)) !== null) {
                const key = kvMatch[1];
                const value = kvMatch[2].trim();
                if (key !== 'name' && key !== 'arguments' && key !== 'parameters') {
                  params[key] = value;
                }
              }
              
              toolCalls.push({ name, parameters: params });
            }
          } else {
            // If no parameters block found, look for key-value pairs
            const params: Record<string, string> = {};
            const kvPattern = /(\w+):\s*([^\n,]+)/g;
            let kvMatch;
            
            while ((kvMatch = kvPattern.exec(content)) !== null) {
              const key = kvMatch[1];
              const value = kvMatch[2].trim();
              if (key !== 'name') {
                params[key] = value;
              }
            }
            
            toolCalls.push({ name, parameters: params });
          }
        }
      }
    } catch (error) {
      console.error('Error extracting tool calls:', error);
    }
    
    return toolCalls;
  }
  
  /**
   * Format tool results as a nice markdown response
   */
  public static formatToolResults(toolName: string, result: any): string {
    let response = `### Tool Result: ${toolName}\n\n`;
    
    if (typeof result === 'object') {
      response += '```json\n' + JSON.stringify(result, null, 2) + '\n```\n';
    } else {
      response += '```\n' + String(result) + '\n```\n';
    }
    
    return response;
  }
  
  /**
   * Process a message content and extract tool calls
   * Returns null if no tool calls found
   */
  public static processMessageForToolCalls(message: Message): ToolCallParams[] | null {
    if (!message.content) return null;
    
    const toolCalls = this.extractToolCalls(message.content);
    
    return toolCalls.length > 0 ? toolCalls : null;
  }
  
  /**
   * Remove tool call blocks from message content
   */
  public static removeToolCallBlocks(content: string): string {
    // Remove function call blocks
    content = content.replace(FUNCTION_CALL_PATTERN, '');
    
    // Remove tool call blocks
    content = content.replace(TOOL_CALL_PATTERN, '');
    
    // Remove tool result blocks
    content = content.replace(TOOL_RESULT_PATTERN, '');
    
    // Clean up extra newlines and whitespace
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content.trim();
  }
} 