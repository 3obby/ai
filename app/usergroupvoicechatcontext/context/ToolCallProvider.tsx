'use client';

import React, { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { useToolCallService, ToolExecutor, ToolCallParams, ToolCallServiceConfig } from '../services/toolCallService';
import { ToolResult } from '../types';
import { ToolDefinition } from '../types/bots';

// Default built-in tools
const DEFAULT_TOOLS: Record<string, ToolExecutor> = {
  // Simple web search tool (in a real app, this would call an API)
  web_search: async (params: Record<string, any>) => {
    const { query } = params;
    console.log(`[web_search] Would search for: ${query}`);
    return {
      results: [
        { title: 'Example result 1', url: 'https://example.com/1', snippet: 'Example snippet 1' },
        { title: 'Example result 2', url: 'https://example.com/2', snippet: 'Example snippet 2' },
      ]
    };
  },
  
  // Weather tool (mock)
  get_weather: async (params: Record<string, any>) => {
    const { location } = params;
    console.log(`[get_weather] Would get weather for: ${location}`);
    return {
      location,
      temperature: Math.floor(Math.random() * 30) + 5,
      condition: ['sunny', 'cloudy', 'rainy', 'snowy'][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 100),
      forecast: [
        { day: 'Today', high: 25, low: 15, condition: 'sunny' },
        { day: 'Tomorrow', high: 23, low: 14, condition: 'cloudy' },
      ]
    };
  },
  
  // Calculator tool
  calculate: async (params: Record<string, any>) => {
    const { expression } = params;
    try {
      // This is not safe for production - in a real app use a safe math evaluator
      // eslint-disable-next-line no-eval
      const result = eval(expression);
      return { expression, result };
    } catch (error) {
      throw new Error(`Failed to calculate: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// Tool Provider Context Type
export interface ToolCallContextType {
  isExecuting: boolean;
  lastResults: ToolResult[];
  availableTools: string[];
  getToolDefinitions: () => ToolDefinition[];
  executeTool: (toolName: string, parameters: Record<string, any>) => Promise<ToolResult>;
  executeToolCalls: (toolCalls: ToolCallParams[]) => Promise<ToolResult[]>;
  registerTool: (toolName: string, executor: ToolExecutor) => void;
  registerTools: (tools: Record<string, ToolExecutor>) => void;
  removeTool: (toolName: string) => void;
}

// Tool Provider Props
interface ToolCallProviderProps {
  children: ReactNode;
  initialTools?: Record<string, ToolExecutor>;
  maxToolCalls?: number;
  toolCallTimeout?: number;
  enableDefaultTools?: boolean;
}

// Create Context
const ToolCallContext = createContext<ToolCallContextType | null>(null);

// Create Provider Component
export function ToolCallProvider({
  children,
  initialTools = {},
  maxToolCalls = 5,
  toolCallTimeout = 30000,
  enableDefaultTools = true,
}: ToolCallProviderProps) {
  // Combine default and custom tools
  const combinedTools = enableDefaultTools
    ? { ...DEFAULT_TOOLS, ...initialTools }
    : initialTools;
  
  const config: ToolCallServiceConfig = {
    availableTools: combinedTools,
    maxToolCalls,
    toolCallTimeout,
  };
  
  // Use the tool service hook
  const {
    isExecuting,
    lastResults,
    executeTool,
    executeToolCalls,
    registerTool,
    registerTools,
    removeTool,
    getAvailableTools,
  } = useToolCallService(config);
  
  // Get tool definitions in the format expected by LLMs
  const getToolDefinitions = useCallback((): ToolDefinition[] => {
    // Tool definitions would typically include JSON schema for parameters
    // Here's a simplified example
    const tools: ToolDefinition[] = [];
    
    if (getAvailableTools().includes('web_search')) {
      tools.push({
        id: 'web_search',
        name: 'web_search',
        description: 'Search the web for information',
        parameters: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
      });
    }
    
    if (getAvailableTools().includes('get_weather')) {
      tools.push({
        id: 'get_weather',
        name: 'get_weather',
        description: 'Get weather information for a location',
        parameters: {
          location: {
            type: 'string',
            description: 'The location to get weather for (city name)'
          }
        },
      });
    }
    
    if (getAvailableTools().includes('calculate')) {
      tools.push({
        id: 'calculate',
        name: 'calculate',
        description: 'Evaluate a mathematical expression',
        parameters: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate'
          }
        },
      });
    }
    
    return tools;
  }, [getAvailableTools]);
  
  // Prepare value for context
  const contextValue: ToolCallContextType = {
    isExecuting,
    lastResults,
    availableTools: getAvailableTools(),
    getToolDefinitions,
    executeTool,
    executeToolCalls,
    registerTool,
    registerTools,
    removeTool,
  };
  
  return (
    <ToolCallContext.Provider value={contextValue}>
      {children}
    </ToolCallContext.Provider>
  );
}

// Create custom hook for using the tool call context
export function useToolCall(): ToolCallContextType {
  const context = useContext(ToolCallContext);
  
  if (!context) {
    throw new Error('useToolCall must be used within a ToolCallProvider');
  }
  
  return context;
} 