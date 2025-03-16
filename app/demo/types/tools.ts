/**
 * Interfaces and types related to tool calling and external API tools
 */

// Base interface for all tool definitions
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  apiKeyRequired?: boolean;
}

// Brave Search tool category
export interface BraveSearchTool extends ToolDefinition {
  category: 'brave_search';
  endpoint: string;
  functionName: string;
}

// Web Search tool definition
export const BRAVE_WEB_SEARCH_TOOL: BraveSearchTool = {
  id: 'brave_web_search',
  name: 'Web Search',
  description: 'Search the web for current information',
  category: 'brave_search',
  enabled: true,
  apiKeyRequired: true,
  endpoint: 'https://api.search.brave.com/res/v1/web/search',
  functionName: 'brave_web_search'
};

// Summarizer tool definition
export const BRAVE_SUMMARIZER_TOOL: BraveSearchTool = {
  id: 'brave_summarizer',
  name: 'Summarizer',
  description: 'Get a summary of search results for a query',
  category: 'brave_search',
  enabled: true,
  apiKeyRequired: true,
  endpoint: 'https://api.search.brave.com/res/v1/summarizer/search',
  functionName: 'brave_summarizer'
};

// Collection of all Brave Search tools
export const BRAVE_SEARCH_TOOLS: BraveSearchTool[] = [
  BRAVE_WEB_SEARCH_TOOL,
  BRAVE_SUMMARIZER_TOOL
];

// All available tools grouped by category
export const ALL_TOOLS: Record<string, ToolDefinition[]> = {
  brave_search: BRAVE_SEARCH_TOOLS,
  // Future tool categories can be added here
};

// Helper function to get all enabled tools
export function getEnabledTools(toolSettings?: Record<string, boolean>): ToolDefinition[] {
  if (!toolSettings) return [];
  
  return Object.entries(ALL_TOOLS)
    .flatMap(([category, tools]) => 
      tools.filter(tool => 
        toolSettings[tool.id] !== false // Use default if not specified
      )
    );
}

// Interface for companion tool settings
export interface CompanionToolSettings {
  enabled: boolean;
  toolSettings: Record<string, boolean>; // tool_id -> enabled/disabled
}

// Default tool settings - all tools enabled by default
export const DEFAULT_TOOL_SETTINGS: Record<string, boolean> = Object.entries(ALL_TOOLS)
  .flatMap(([_, tools]) => tools)
  .reduce((acc, tool) => {
    acc[tool.id] = tool.enabled;
    return acc;
  }, {} as Record<string, boolean>); 