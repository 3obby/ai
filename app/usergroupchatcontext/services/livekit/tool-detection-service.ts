import { EventEmitter } from 'events';
import voiceToolCallingService from '../voiceToolCallingService';
import { ToolDefinition } from '../../types/bots';
import { ToolResult } from '../../types';

export interface ToolDetectionResult {
  isToolCall: boolean;
  detectedTools: {
    name: string;
    arguments: Record<string, any>;
    confidence: number;
  }[];
  toolResults?: ToolResult[];
  originalText: string;
}

/**
 * ToolDetectionService handles the detection and processing of tool calls
 * from transcribed voice inputs
 */
export class ToolDetectionService {
  private availableTools: ToolDefinition[] = [];
  private isProcessingToolCall: boolean = false;
  private emitter: EventEmitter = new EventEmitter();
  
  constructor() {
    // Set up listeners for tool calling events
    voiceToolCallingService.on('voiceTool:executed', this.handleToolExecution);
    voiceToolCallingService.on('voiceTool:error', this.handleToolError);
  }

  /**
   * Initialize the tool detection service with available tools
   */
  public initialize(tools: ToolDefinition[] = []): void {
    this.setAvailableTools(tools);
  }

  /**
   * Set available tools for voice tool detection
   */
  public setAvailableTools(tools: ToolDefinition[]): void {
    this.availableTools = tools;
    console.log('Updated available tools for voice detection:', 
      tools.map(t => t.name).join(', '));
  }

  /**
   * Process transcribed text for potential tool calls
   */
  public async processTranscription(text: string, isFinal: boolean): Promise<ToolDetectionResult> {
    // Only process final transcriptions for tool calls
    if (!isFinal || this.availableTools.length === 0) {
      return { 
        isToolCall: false, 
        detectedTools: [],
        originalText: text
      };
    }
    
    try {
      // Process the voice input to check for tool calls
      const toolProcessingResult = await voiceToolCallingService.processVoiceInput(
        text,
        this.availableTools
      );
      
      // If this was identified as a tool call with high confidence
      if (toolProcessingResult.isToolCall && toolProcessingResult.toolResults) {
        this.isProcessingToolCall = true;
        
        // Emit event with tool results
        this.emitter.emit('tool:detected', {
          text,
          toolResults: toolProcessingResult.toolResults,
          detectedTools: toolProcessingResult.detectedTools
        });
        
        return {
          isToolCall: true,
          detectedTools: toolProcessingResult.detectedTools,
          toolResults: toolProcessingResult.toolResults,
          originalText: toolProcessingResult.originalText
        };
        
      // If no high confidence tool calls but we detected possible tools
      } else if (toolProcessingResult.isToolCall && toolProcessingResult.detectedTools.length > 0) {
        // Emit event with detected tools for confirmation
        this.emitter.emit('tool:potentialDetection', {
          text,
          detectedTools: toolProcessingResult.detectedTools
        });
        
        return {
          isToolCall: true,
          detectedTools: toolProcessingResult.detectedTools,
          originalText: toolProcessingResult.originalText
        };
      }
      
      return {
        isToolCall: false,
        detectedTools: [],
        originalText: text
      };
      
    } catch (error) {
      console.error('Error processing transcription for tools:', error);
      this.emitter.emit('tool:error', { error, text });
      
      return {
        isToolCall: false,
        detectedTools: [],
        originalText: text
      };
    }
  }

  /**
   * Execute a previously detected tool call
   */
  public async executeToolCall(toolName: string, parameters: Record<string, any>): Promise<ToolResult> {
    if (this.isProcessingToolCall) {
      console.warn('Already processing a tool call');
      throw new Error('Already processing a tool call');
    }
    
    try {
      this.isProcessingToolCall = true;
      
      // Find the tool definition
      const toolDef = this.availableTools.find(t => t.name === toolName);
      if (!toolDef) {
        throw new Error(`Tool not found: ${toolName}`);
      }
      
      // Execute the tool call using the voice tool calling service
      const result = await voiceToolCallingService.executeVoiceToolCall(toolName, parameters);
      
      // Reset the processing state
      this.isProcessingToolCall = false;
      
      // Emit executed event
      this.emitter.emit('tool:executed', { toolName, parameters, result });
      
      return result;
    } catch (error) {
      this.isProcessingToolCall = false;
      console.error('Error executing tool call:', error);
      
      // Emit error event
      this.emitter.emit('tool:error', { toolName, parameters, error });
      
      // Create an error result
      const errorResult: ToolResult = {
        toolName,
        input: parameters,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0
      };
      
      return errorResult;
    }
  }

  /**
   * Check if a tool is currently being processed
   */
  public isProcessing(): boolean {
    return this.isProcessingToolCall;
  }

  /**
   * Get available tools
   */
  public getAvailableTools(): ToolDefinition[] {
    return [...this.availableTools];
  }

  // Handle successful tool execution
  private handleToolExecution = (result: any) => {
    this.isProcessingToolCall = false;
    this.emitter.emit('tool:executed', result);
  }

  // Handle tool execution error
  private handleToolError = (error: any) => {
    this.isProcessingToolCall = false;
    this.emitter.emit('tool:error', error);
  }

  /**
   * Subscribe to tool events
   */
  public on(event: 'tool:detected' | 'tool:potentialDetection' | 'tool:executed' | 'tool:error', listener: (data: any) => void): void {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from tool events
   */
  public off(event: 'tool:detected' | 'tool:potentialDetection' | 'tool:executed' | 'tool:error', listener: (data: any) => void): void {
    this.emitter.off(event, listener);
  }
}

// Create a singleton instance
const toolDetectionService = new ToolDetectionService();
export default toolDetectionService; 