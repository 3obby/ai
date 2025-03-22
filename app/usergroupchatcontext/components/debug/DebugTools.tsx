'use client';

import React, { useState } from 'react';
import { ProcessingPipelineVisualizer } from './ProcessingPipelineVisualizer';
import { ReprocessingDebugTool } from './ReprocessingDebugTool';
import { Bot } from '../../types';

interface DebugToolsProps {
  bot: Bot;
  isVisible?: boolean;
}

/**
 * DebugTools component - Provides various debugging tools for the application
 * Implements the Observer Pattern by subscribing to processing events and visualizing them
 */
export const DebugTools: React.FC<DebugToolsProps> = ({ bot, isVisible = true }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  if (!isVisible) return null;
  
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg mt-4 p-2 text-sm">
      <div 
        className="flex justify-between items-center cursor-pointer p-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="font-bold text-base">Debug Tools</h2>
        <span>{isExpanded ? '▼' : '►'}</span>
      </div>
      
      {isExpanded && (
        <div className="mt-2 space-y-4">
          <ReprocessingDebugTool bot={bot} />
          
          <div className="p-2 border rounded-lg">
            <h3 className="font-semibold">Bot Configuration</h3>
            <pre className="text-xs mt-2 bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify({
                id: bot.id,
                name: bot.name,
                model: bot.model,
                enableReprocessing: bot.enableReprocessing,
                reprocessingCriteria: bot.reprocessingCriteria,
                reprocessingInstructions: bot.reprocessingInstructions
              }, null, 2)}
            </pre>
          </div>
          
          <ProcessingPipelineVisualizer bot={bot} maxLogs={3} />
          
          <div className="text-xs text-gray-500 p-2">
            <p>Observer Pattern Implementation:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>The ProcessingPipelineVisualizer uses the Observer Pattern to listen for processing events</li>
              <li>Events are emitted by the ProcessingEventEmitter service</li>
              <li>The pipeline components emit events at each stage of processing</li>
              <li>UI updates in real-time as events are received</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugTools; 