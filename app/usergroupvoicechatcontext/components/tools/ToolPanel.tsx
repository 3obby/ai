'use client';

import React, { useState } from 'react';
import { useToolCall } from '../../context/ToolCallProvider';
import { ToolResult } from '../../types';

interface ToolPanelProps {
  className?: string;
}

export function ToolPanel({ className = '' }: ToolPanelProps) {
  const { 
    availableTools, 
    getToolDefinitions, 
    executeTool, 
    isExecuting 
  } = useToolCall();
  
  const [selectedTool, setSelectedTool] = useState<string>(availableTools[0] || '');
  const [toolParameters, setToolParameters] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ToolResult | null>(null);
  
  // Get the definition of the currently selected tool
  const selectedToolDefinition = getToolDefinitions().find(tool => tool.name === selectedTool);
  
  // Handle tool selection
  const handleToolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const toolName = e.target.value;
    setSelectedTool(toolName);
    setToolParameters({});
    setResult(null);
  };
  
  // Handle parameter change
  const handleParameterChange = (paramName: string, value: string) => {
    setToolParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  // Execute the selected tool
  const handleExecute = async () => {
    if (!selectedTool) return;
    
    try {
      const result = await executeTool(selectedTool, toolParameters);
      setResult(result);
    } catch (error) {
      console.error('Error executing tool:', error);
    }
  };
  
  return (
    <div className={`bg-card rounded-md shadow-sm border ${className}`}>
      <div className="p-3 border-b">
        <h3 className="font-medium">Tool Testing Panel</h3>
      </div>
      
      <div className="p-3 space-y-4">
        {/* Tool Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Select Tool</label>
          <select 
            className="w-full px-3 py-2 bg-background border rounded-md text-sm"
            value={selectedTool}
            onChange={handleToolChange}
            disabled={isExecuting}
          >
            {availableTools.length === 0 ? (
              <option value="">No tools available</option>
            ) : (
              availableTools.map(tool => (
                <option key={tool} value={tool}>{tool}</option>
              ))
            )}
          </select>
        </div>
        
        {/* Tool Description */}
        {selectedToolDefinition && (
          <div className="bg-muted/40 p-2 rounded-md text-sm">
            <p>{selectedToolDefinition.description}</p>
          </div>
        )}
        
        {/* Tool Parameters */}
        {selectedToolDefinition && selectedToolDefinition.parameters && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Parameters</h4>
            
            {Object.entries(selectedToolDefinition.parameters).map(([paramName, paramInfo]: [string, any]) => (
              <div key={paramName}>
                <label className="block text-sm mb-1">
                  {paramName}
                  {paramInfo.description && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({paramInfo.description})
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                  value={toolParameters[paramName] || ''}
                  onChange={(e) => handleParameterChange(paramName, e.target.value)}
                  disabled={isExecuting}
                  placeholder={`Enter ${paramName}...`}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Execute Button */}
        <button
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
          onClick={handleExecute}
          disabled={isExecuting || !selectedTool}
        >
          {isExecuting ? 'Executing...' : 'Execute Tool'}
        </button>
        
        {/* Result Display */}
        {result && (
          <div className="mt-4 border rounded-md overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 text-sm font-medium border-b flex justify-between">
              <span>Result</span>
              {result.executionTime && (
                <span className="text-xs text-muted-foreground">
                  {result.executionTime}ms
                </span>
              )}
            </div>
            
            <div className="p-3">
              {result.error ? (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  Error: {result.error}
                </div>
              ) : (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 