import { ToolDefinition } from '../types/bots';
import voiceWeatherTool from './tools/voiceWeatherTool';
import voiceTimerTool from './tools/voiceTimerTool';
import { ToolResult } from '../types';

/**
 * Registry for voice-optimized tools
 * Manages tool registration, discovery, and execution
 */
export class VoiceToolRegistry {
  private tools: Map<string, any> = new Map();
  
  constructor() {
    // Register default voice-optimized tools
    this.registerTool(voiceWeatherTool);
    this.registerTool(voiceTimerTool);
    
    // Set up timer notification handler
    voiceTimerTool.onTimerComplete(this.handleTimerComplete);
  }
  
  /**
   * Register a new tool with the registry
   * @param tool The tool instance to register
   */
  public registerTool(tool: any): void {
    if (!tool || typeof tool.execute !== 'function' || typeof tool.getDefinition !== 'function') {
      throw new Error('Invalid tool: must have execute() and getDefinition() methods');
    }
    
    const definition = tool.getDefinition();
    if (!definition.name) {
      throw new Error('Tool definition must include a name');
    }
    
    this.tools.set(definition.name, tool);
  }
  
  /**
   * Get all available voice-optimized tool definitions
   * @returns Array of tool definitions
   */
  public getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }
  
  /**
   * Execute a voice tool by name
   * @param toolName Name of the tool to execute
   * @param args Arguments for the tool
   * @returns Result of the tool execution
   */
  public async executeTool(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      return {
        toolName,
        input: args,
        output: null,
        error: `Tool "${toolName}" not found`,
        executionTime: 0
      };
    }
    
    try {
      return await tool.execute(args);
    } catch (error: any) {
      return {
        toolName,
        input: args,
        output: null,
        error: error.message || 'Unknown error executing tool',
        executionTime: 0
      };
    }
  }
  
  /**
   * Handle timer completion notifications
   */
  private handleTimerComplete = (timer: any) => {
    console.log(`Timer complete: ${timer.label} (${timer.duration} seconds)`);
    
    // Here you would typically emit an event or trigger a notification
    // This could be integrated with a notification system or the voice feedback
    const event = new CustomEvent('voice:timer:complete', { 
      detail: {
        timer,
        message: `Your ${timer.label} timer is complete!`
      } 
    });
    
    // Dispatch to window if in browser environment
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  };
}

// Create a singleton instance
const voiceToolRegistry = new VoiceToolRegistry();
export default voiceToolRegistry; 