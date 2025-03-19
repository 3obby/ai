import { ToolCallService } from './toolCallService';
import { EventEmitter } from 'events';
import { ToolResult } from '../types';
import { ToolDefinition } from '../types/bots';
import voiceToolRegistry from './voiceToolRegistry';

interface VoiceToolDetectionResult {
  detectedTools: {
    name: string;
    arguments: Record<string, any>;
    confidence: number;
  }[];
  originalText: string;
  isToolCall: boolean;
}

/**
 * Service to handle tool calling from voice inputs
 * Provides functionality to:
 * 1. Detect potential tool calls in transcribed voice input
 * 2. Parse natural language commands into structured tool calls
 * 3. Execute tool calls from voice input with appropriate feedback
 */
export class VoiceToolCallingService {
  private toolCallService: ToolCallService;
  private toolDetectionPrompt: string;
  private emitter: EventEmitter;
  private apiKey: string | undefined;
  
  constructor() {
    this.toolCallService = new ToolCallService();
    this.emitter = new EventEmitter();
    
    // Get API key from environment if available
    this.apiKey = typeof window !== 'undefined' ? undefined : process.env.OPENAI_API_KEY;
    
    // Prompt template for detecting tool calls in natural language
    this.toolDetectionPrompt = `
You are an AI assistant helping to detect when a user is trying to invoke a tool through voice.
Your job is to identify if the transcribed text represents a request to use a specific tool.

For example:
- "Search the web for the latest news about AI" -> Tool: search_web, Arguments: {query: "latest news about AI"}
- "Set a timer for 5 minutes" -> Tool: set_timer, Arguments: {minutes: 5}
- "Remind me to call John tomorrow" -> Tool: set_reminder, Arguments: {task: "call John", time: "tomorrow"}

For each detected tool, provide:
1. The tool name
2. The arguments for the tool
3. A confidence score (0-1) of whether this is actually a tool call request

Respond with a JSON object containing:
- detectedTools: array of detected tools with name, arguments, and confidence
- isToolCall: boolean indicating if you believe the user is trying to invoke a tool
- originalText: the original transcript text
`;
  }
  
  /**
   * Detect if a transcribed voice input contains a tool call
   * @param text The transcribed voice input
   * @param availableTools List of available tools that can be called
   * @returns Detection result with confidence scores
   */
  public async detectToolCall(
    text: string, 
    availableTools: ToolDefinition[]
  ): Promise<VoiceToolDetectionResult> {
    try {
      // Default response if detection fails
      const defaultResponse: VoiceToolDetectionResult = {
        detectedTools: [],
        originalText: text,
        isToolCall: false
      };
      
      if (!text || !availableTools.length) {
        return defaultResponse;
      }
      
      // Create a prompt that includes available tools
      const toolsDescription = availableTools.map(tool => 
        `- ${tool.name}: ${tool.description}. Parameters: ${JSON.stringify(tool.parameters)}`
      ).join('\n');
      
      const fullPrompt = `${this.toolDetectionPrompt}\n\nAvailable tools:\n${toolsDescription}\n\nTranscribed text: "${text}"`;
      
      // Use the existing APIs to make an LLM call
      // This is a placeholder - in a real implementation, you would call your LLM API
      // with the prompt and parse the response
      const detectionResult = await this.callDetectionAPI(fullPrompt);
      
      return detectionResult || defaultResponse;
    } catch (error) {
      console.error('Error detecting tool call in voice input:', error);
      return {
        detectedTools: [],
        originalText: text,
        isToolCall: false
      };
    }
  }
  
  /**
   * Call detection API to analyze transcribed voice for potential tool calls
   * @param prompt The detection prompt to analyze
   * @returns Detection result with confidence scores
   */
  private async callDetectionAPI(prompt: string): Promise<VoiceToolDetectionResult | null> {
    try {
      // Send completion request to OpenAI API
      const response = await this.sendCompletionRequest(prompt, {
        model: 'gpt-4o',
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });
      
      if (!response) {
        console.error('Invalid response from LLM API');
        return null;
      }
      
      try {
        // Parse the JSON response
        const parsedResponse = JSON.parse(response);
        
        // Validate the response structure
        if (!parsedResponse.detectedTools || !Array.isArray(parsedResponse.detectedTools)) {
          console.error('Invalid tool detection response structure');
          return null;
        }
        
        // Ensure all required fields are present
        const result: VoiceToolDetectionResult = {
          detectedTools: parsedResponse.detectedTools.map((tool: any) => ({
            name: tool.name || '',
            arguments: tool.arguments || {},
            confidence: typeof tool.confidence === 'number' ? tool.confidence : 0
          })),
          originalText: parsedResponse.originalText || '',
          isToolCall: !!parsedResponse.isToolCall
        };
        
        return result;
      } catch (parseError) {
        console.error('Error parsing tool detection response:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Error calling tool detection API:', error);
      return null;
    }
  }

  /**
   * Send a completion request to the OpenAI API
   * @param prompt The prompt to send
   * @param options Configuration options for the request
   * @returns The completion text
   */
  private async sendCompletionRequest(
    prompt: string, 
    options: {
      model: string;
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: string };
    }
  ): Promise<string | null> {
    try {
      // If we're in the browser, use fetch to send request via our API route
      if (typeof window !== 'undefined') {
        const response = await fetch('/api/openai/completion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            ...options
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Error from OpenAI API: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.text || null;
      } else {
        // Server-side request (for completeness, though we'd typically use the API route)
        // Would require importing OpenAI SDK on the server side
        console.error('Server-side OpenAI API calls not implemented in this service');
        return null;
      }
    } catch (error) {
      console.error('Error sending completion request:', error);
      return null;
    }
  }
  
  /**
   * Execute a tool call detected from voice input, prioritizing voice-optimized tools
   * @param toolName Name of the tool to call
   * @param args Arguments for the tool call
   * @returns Result of the tool execution
   */
  public async executeVoiceToolCall(
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolResult> {
    try {
      let result: ToolResult;
      
      // First check if this is a voice-optimized tool
      if (toolName.startsWith('voice_')) {
        // Execute using the voice tool registry
        result = await voiceToolRegistry.executeTool(toolName, args);
      } else {
        // Otherwise, use the standard tool service
        result = await this.toolCallService.executeTool(toolName, args);
      }
      
      // Emit event for tool call execution
      this.emitter.emit('voiceTool:executed', {
        toolName,
        args,
        result
      });
      
      return result;
    } catch (error: any) {
      console.error(`Error executing voice tool call ${toolName}:`, error);
      
      // Return error result
      const errorResult: ToolResult = {
        toolName,
        input: args,
        output: null,
        error: error.message || 'Unknown error executing tool',
        executionTime: 0
      };
      
      this.emitter.emit('voiceTool:error', errorResult);
      
      return errorResult;
    }
  }
  
  /**
   * Get all available tools, including voice-optimized tools
   * @param standardTools Standard tools from the tool system
   * @returns Combined list of standard and voice-optimized tools
   */
  public getAllAvailableTools(standardTools: ToolDefinition[] = []): ToolDefinition[] {
    // Get voice-optimized tools
    const voiceTools = voiceToolRegistry.getToolDefinitions();
    
    // Combine with standard tools, avoiding duplicates
    const allTools = [...standardTools];
    
    voiceTools.forEach(voiceTool => {
      if (!allTools.some(tool => tool.id === voiceTool.id)) {
        allTools.push(voiceTool);
      }
    });
    
    return allTools;
  }
  
  /**
   * Subscribe to voice tool calling events
   * @param event Event name
   * @param listener Event listener function
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }
  
  /**
   * Unsubscribe from voice tool calling events
   * @param event Event name
   * @param listener Event listener function
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  /**
   * Process a transcribed voice input to check for and execute tool calls
   * @param text The transcribed text from voice input
   * @param availableTools List of available tools
   * @param confidenceThreshold Minimum confidence threshold for automatic execution
   * @returns Processing result with any tool results
   */
  public async processVoiceInput(
    text: string,
    availableTools: ToolDefinition[],
    confidenceThreshold: number = 0.8
  ): Promise<{
    isToolCall: boolean;
    originalText: string;
    toolResults?: ToolResult[];
    detectedTools: {
      name: string;
      arguments: Record<string, any>;
      confidence: number;
    }[];
  }> {
    try {
      // Default response
      const defaultResponse = {
        isToolCall: false,
        originalText: text,
        detectedTools: []
      };
      
      if (!text || !availableTools.length) {
        return defaultResponse;
      }
      
      // Detect potential tool calls
      const detection = await this.detectToolCall(text, availableTools);
      
      // If no tool calls detected, return original text
      if (!detection || !detection.isToolCall || !detection.detectedTools.length) {
        return defaultResponse;
      }
      
      // Filter tools by confidence threshold
      const highConfidenceTools = detection.detectedTools.filter(
        tool => tool.confidence >= confidenceThreshold
      );
      
      // If no high confidence tools, just return detection info
      if (!highConfidenceTools.length) {
        return {
          isToolCall: true,
          originalText: text,
          detectedTools: detection.detectedTools
        };
      }
      
      // Execute high confidence tool calls
      const toolResults: ToolResult[] = [];
      
      for (const tool of highConfidenceTools) {
        const result = await this.executeVoiceToolCall(tool.name, tool.arguments);
        toolResults.push(result);
      }
      
      // Return complete processing result
      return {
        isToolCall: true,
        originalText: text,
        toolResults,
        detectedTools: detection.detectedTools
      };
    } catch (error) {
      console.error('Error processing voice input for tools:', error);
      return {
        isToolCall: false,
        originalText: text,
        detectedTools: []
      };
    }
  }
}

// Create a singleton instance
const voiceToolCallingService = new VoiceToolCallingService();
export default voiceToolCallingService; 