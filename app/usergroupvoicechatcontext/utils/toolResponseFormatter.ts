import { ToolResult } from '../types';

/**
 * Formats a tool execution result into a spoken response
 * @param toolResult The result of the tool execution
 * @returns A string that can be spoken by the voice synthesis
 */
export function formatToolResultForVoice(toolResult: ToolResult): string {
  if (!toolResult) return "I couldn't get a result from that tool.";
  
  // Handle tool execution errors
  if (toolResult.error) {
    return `I encountered an error while trying to use the ${toolResult.toolName} tool: ${toolResult.error}`;
  }
  
  const { toolName, output } = toolResult;
  
  // Format based on output type
  if (output === null || output === undefined) {
    return `I used the ${toolName} tool, but didn't get any results.`;
  }
  
  // For string outputs
  if (typeof output === 'string') {
    return `I used the ${toolName} tool. ${output}`;
  }
  
  // For array outputs - list the items
  if (Array.isArray(output)) {
    if (output.length === 0) {
      return `I used the ${toolName} tool, but no results were found.`;
    }
    
    if (output.length === 1) {
      const item = typeof output[0] === 'string' ? output[0] : JSON.stringify(output[0]);
      return `I used the ${toolName} tool and found: ${item}`;
    }
    
    const items = output.map(item => 
      typeof item === 'string' ? item : JSON.stringify(item)
    );
    
    // Limit to first few items if there are many
    if (items.length > 5) {
      return `I used the ${toolName} tool and found ${items.length} results. Here are the first few: ${items.slice(0, 3).join(', ')} and ${items.length - 3} more.`;
    }
    
    return `I used the ${toolName} tool and found: ${items.join(', ')}`;
  }
  
  // For object outputs - summarize key fields
  if (typeof output === 'object') {
    const keys = Object.keys(output);
    
    if (keys.length === 0) {
      return `I used the ${toolName} tool, but the result was empty.`;
    }
    
    if (keys.length <= 3) {
      const keyValues = keys.map(key => `${key}: ${output[key]}`).join(', ');
      return `I used the ${toolName} tool. The result was: ${keyValues}`;
    }
    
    // For larger objects, focus on key fields or summarize
    return `I used the ${toolName} tool. The result has ${keys.length} fields including ${keys.slice(0, 3).join(', ')}.`;
  }
  
  // For simple primitive values
  return `I used the ${toolName} tool. The result was: ${output}`;
}

/**
 * Creates a useful text summary of multiple tool results
 * @param toolResults Array of tool execution results
 * @returns A summary string suitable for voice synthesis
 */
export function summarizeToolResultsForVoice(toolResults: ToolResult[]): string {
  if (!toolResults || toolResults.length === 0) {
    return "I didn't get any results from the tools.";
  }
  
  // For a single tool, just format it directly
  if (toolResults.length === 1) {
    return formatToolResultForVoice(toolResults[0]);
  }
  
  // For multiple tools, create a summary
  const successResults = toolResults.filter(r => !r.error);
  const failedResults = toolResults.filter(r => r.error);
  
  let response = `I used ${toolResults.length} tools. `;
  
  if (successResults.length > 0) {
    response += `${successResults.length} completed successfully. `;
    
    // Add details about the first successful tool
    if (successResults.length > 0) {
      const firstResult = formatToolResultForVoice(successResults[0])
        .replace(/^I used the /, 'From the ');
      response += firstResult;
    }
  }
  
  if (failedResults.length > 0) {
    response += ` ${failedResults.length} tool${failedResults.length > 1 ? 's' : ''} failed.`;
  }
  
  return response;
}

export default {
  formatToolResultForVoice,
  summarizeToolResultsForVoice
}; 