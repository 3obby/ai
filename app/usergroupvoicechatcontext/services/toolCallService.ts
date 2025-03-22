'use client';

import { ToolDefinition } from '../types/bots';
import { ToolResult } from '../types';

export interface ToolCallParams {
  name: string;
  parameters: Record<string, any>;
}

export interface ToolCallServiceConfig {
  availableTools?: Record<string, ToolExecutor>;
  maxToolCalls?: number;
  toolCallTimeout?: number;
}

// Type for tool executor functions
export type ToolExecutor = (parameters: Record<string, any>) => Promise<any>;

export class ToolCallService {
  private availableTools: Record<string, ToolExecutor>;
  private maxToolCalls: number;
  private toolCallTimeout: number;
  
  constructor(config: ToolCallServiceConfig = {}) {
    this.availableTools = config.availableTools || {};
    this.maxToolCalls = config.maxToolCalls || 5;
    this.toolCallTimeout = config.toolCallTimeout || 30000; // 30 seconds default
  }
  
  // Register a new tool
  public registerTool(toolName: string, executor: ToolExecutor): void {
    this.availableTools[toolName] = executor;
  }
  
  // Register multiple tools
  public registerTools(tools: Record<string, ToolExecutor>): void {
    this.availableTools = {
      ...this.availableTools,
      ...tools
    };
  }
  
  // Remove a tool
  public removeTool(toolName: string): void {
    delete this.availableTools[toolName];
  }
  
  // Get list of available tool names
  public getAvailableTools(): string[] {
    return Object.keys(this.availableTools);
  }
  
  // Execute a tool call
  public async executeTool(
    toolName: string, 
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Check if tool exists
      if (!this.availableTools[toolName]) {
        throw new Error(`Tool "${toolName}" not found`);
      }
      
      // Execute tool with timeout
      const result = await Promise.race([
        this.availableTools[toolName](parameters),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Tool execution timed out after ${this.toolCallTimeout}ms`)), 
            this.toolCallTimeout
          );
        })
      ]);
      
      return {
        toolName,
        input: parameters,
        output: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        toolName,
        input: parameters,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }
  
  // Process multiple tool calls in sequence
  public async executeToolCalls(
    toolCalls: ToolCallParams[]
  ): Promise<ToolResult[]> {
    // Limit number of tool calls
    const limitedCalls = toolCalls.slice(0, this.maxToolCalls);
    
    // Execute each tool call in sequence
    const results: ToolResult[] = [];
    
    for (const call of limitedCalls) {
      const result = await this.executeTool(call.name, call.parameters);
      results.push(result);
    }
    
    return results;
  }
  
  // Update configuration
  public updateConfig(config: Partial<ToolCallServiceConfig>): void {
    if (config.availableTools) {
      this.availableTools = config.availableTools;
    }
    
    if (config.maxToolCalls !== undefined) {
      this.maxToolCalls = config.maxToolCalls;
    }
    
    if (config.toolCallTimeout !== undefined) {
      this.toolCallTimeout = config.toolCallTimeout;
    }
  }
}

// React hook for using the tool call service
import { useState, useEffect, useRef } from 'react';

export function useToolCallService(config: ToolCallServiceConfig = {}) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResults, setLastResults] = useState<ToolResult[]>([]);
  const serviceRef = useRef<ToolCallService | null>(null);
  
  // Initialize service
  useEffect(() => {
    serviceRef.current = new ToolCallService(config);
    return () => {
      serviceRef.current = null;
    };
  }, []);
  
  // Update config when it changes
  useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(config);
    }
  }, [config]);
  
  // Execute a single tool
  const executeTool = async (
    toolName: string, 
    parameters: Record<string, any>
  ): Promise<ToolResult> => {
    if (!serviceRef.current) {
      throw new Error('Tool call service not initialized');
    }
    
    setIsExecuting(true);
    try {
      const result = await serviceRef.current.executeTool(toolName, parameters);
      setLastResults([result]);
      return result;
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Execute multiple tools
  const executeToolCalls = async (
    toolCalls: ToolCallParams[]
  ): Promise<ToolResult[]> => {
    if (!serviceRef.current) {
      throw new Error('Tool call service not initialized');
    }
    
    setIsExecuting(true);
    try {
      const results = await serviceRef.current.executeToolCalls(toolCalls);
      setLastResults(results);
      return results;
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Register a new tool
  const registerTool = (toolName: string, executor: ToolExecutor): void => {
    if (serviceRef.current) {
      serviceRef.current.registerTool(toolName, executor);
    }
  };
  
  // Register multiple tools
  const registerTools = (tools: Record<string, ToolExecutor>): void => {
    if (serviceRef.current) {
      serviceRef.current.registerTools(tools);
    }
  };
  
  // Remove a tool
  const removeTool = (toolName: string): void => {
    if (serviceRef.current) {
      serviceRef.current.removeTool(toolName);
    }
  };
  
  // Get available tools
  const getAvailableTools = (): string[] => {
    return serviceRef.current ? serviceRef.current.getAvailableTools() : [];
  };
  
  return {
    isExecuting,
    lastResults,
    executeTool,
    executeToolCalls,
    registerTool,
    registerTools,
    removeTool,
    getAvailableTools
  };
} 