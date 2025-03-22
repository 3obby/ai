'use client';

import React, { useState, useEffect } from 'react';
import { EventBus } from '../../services/events/EventBus';
import { ProcessingEvents } from '../../services/events/ProcessingEvents';
import { Bot } from '../../types';

interface PipelineStageLog {
  stage: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  error?: string;
  details?: any;
}

interface ProcessingLog {
  botId: string;
  messageId?: string;
  stages: Record<string, PipelineStageLog>;
  startTime?: number;
  endTime?: number;
  completed: boolean;
  error?: string;
}

interface ProcessingPipelineVisualizerProps {
  bot: Bot;
  maxLogs?: number;
}

export const ProcessingPipelineVisualizer: React.FC<ProcessingPipelineVisualizerProps> = ({ 
  bot, 
  maxLogs = 5 
}) => {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const eventBus = EventBus.getInstance();
  
  // Helper function to create a new log entry
  const createLogEntry = (botId: string, messageId?: string): ProcessingLog => ({
    botId,
    messageId,
    stages: {
      preprocessing: { stage: 'Preprocessing', status: 'pending' },
      toolResolution: { stage: 'Tool Resolution', status: 'pending' },
      toolExecution: { stage: 'Tool Execution', status: 'pending' },
      llmCall: { stage: 'LLM Call', status: 'pending' },
      postprocessing: { stage: 'Postprocessing', status: 'pending' },
      reprocessing: { stage: 'Reprocessing', status: 'pending' }
    },
    completed: false
  });
  
  // Helper function to find the current log for a bot and message
  const findOrCreateLog = (botId: string, messageId?: string): [ProcessingLog, number] => {
    // Try to find an existing log that matches the bot ID and either has the same messageId or no messageId yet
    const index = logs.findIndex(log => 
      log.botId === botId && 
      (messageId ? log.messageId === messageId : !log.completed)
    );
    
    if (index >= 0) {
      return [logs[index], index];
    }
    
    // Create a new log entry
    const newLog = createLogEntry(botId, messageId);
    return [newLog, -1];
  };
  
  // Handle process start
  const handleProcessingStarted = (data: any) => {
    if (data.botId !== bot.id) return;
    
    const [log, index] = findOrCreateLog(data.botId, data.messageId);
    
    // Update the log
    const updatedLog = {
      ...log,
      messageId: data.messageId,
      startTime: data.timestamp
    };
    
    // Add or update the log in state
    setLogs(prevLogs => {
      if (index >= 0) {
        const newLogs = [...prevLogs];
        newLogs[index] = updatedLog;
        return newLogs;
      } else {
        // Add new log at the beginning and limit the number of logs
        return [updatedLog, ...prevLogs].slice(0, maxLogs);
      }
    });
  };
  
  // Handle process completion
  const handleProcessingCompleted = (data: any) => {
    if (data.botId !== bot.id) return;
    
    const [log, index] = findOrCreateLog(data.botId, data.messageId);
    if (index < 0) return; // Don't process if log not found
    
    // Update the log
    const updatedLog = {
      ...log,
      endTime: data.timestamp,
      completed: true
    };
    
    // Update the log in state
    setLogs(prevLogs => {
      const newLogs = [...prevLogs];
      newLogs[index] = updatedLog;
      return newLogs;
    });
  };
  
  // Handle process error
  const handleProcessingFailed = (data: any) => {
    if (data.botId !== bot.id) return;
    
    const [log, index] = findOrCreateLog(data.botId, data.messageId);
    if (index < 0) return; // Don't process if log not found
    
    // Update the log
    const updatedLog = {
      ...log,
      endTime: data.timestamp,
      completed: true,
      error: data.error
    };
    
    // Update the log in state
    setLogs(prevLogs => {
      const newLogs = [...prevLogs];
      newLogs[index] = updatedLog;
      return newLogs;
    });
  };
  
  // Handle stage start events
  const handleStageStarted = (stageName: string, data: any) => {
    if (data.botId !== bot.id) return;
    
    const [log, index] = findOrCreateLog(data.botId);
    if (index < 0) return; // Don't process if log not found
    
    // Get the stage key from the event name
    const stageKey = stageName.split(':')[0]; // e.g., 'preprocessing' from 'preprocessing:started'
    
    if (!log.stages[stageKey]) return; // Skip if stage not found
    
    // Update the stage status - using type assertion to ensure type safety
    const updatedStages = {
      ...log.stages,
      [stageKey]: {
        ...log.stages[stageKey],
        status: 'active' as const,
        startTime: data.timestamp,
        details: { ...data }
      }
    };
    
    // Update the log in state
    setLogs(prevLogs => {
      const newLogs = [...prevLogs];
      newLogs[index] = {
        ...log,
        stages: updatedStages
      };
      return newLogs;
    });
  };
  
  // Handle stage completion events
  const handleStageCompleted = (stageName: string, data: any) => {
    if (data.botId !== bot.id) return;
    
    const [log, index] = findOrCreateLog(data.botId);
    if (index < 0) return; // Don't process if log not found
    
    // Get the stage key from the event name
    const stageKey = stageName.split(':')[0]; // e.g., 'preprocessing' from 'preprocessing:completed'
    
    if (!log.stages[stageKey]) return; // Skip if stage not found
    
    // Update the stage status - using type assertion to ensure type safety
    const updatedStages = {
      ...log.stages,
      [stageKey]: {
        ...log.stages[stageKey],
        status: 'completed' as const,
        endTime: data.timestamp,
        details: { ...data }
      }
    };
    
    // Update the log in state
    setLogs(prevLogs => {
      const newLogs = [...prevLogs];
      newLogs[index] = {
        ...log,
        stages: updatedStages
      };
      return newLogs;
    });
  };
  
  // Handle stage error events
  const handleStageFailed = (stageName: string, data: any) => {
    if (data.botId !== bot.id) return;
    
    const [log, index] = findOrCreateLog(data.botId);
    if (index < 0) return; // Don't process if log not found
    
    // Get the stage key from the event name
    const stageKey = stageName.split(':')[0]; // e.g., 'preprocessing' from 'preprocessing:failed'
    
    if (!log.stages[stageKey]) return; // Skip if stage not found
    
    // Update the stage status - using type assertion to ensure type safety
    const updatedStages = {
      ...log.stages,
      [stageKey]: {
        ...log.stages[stageKey],
        status: 'error' as const,
        endTime: data.timestamp,
        error: data.error,
        details: { ...data }
      }
    };
    
    // Update the log in state
    setLogs(prevLogs => {
      const newLogs = [...prevLogs];
      newLogs[index] = {
        ...log,
        stages: updatedStages
      };
      return newLogs;
    });
  };
  
  useEffect(() => {
    // Subscribe to process lifecycle events
    const startSub = eventBus.on(ProcessingEvents.PROCESSING_STARTED, handleProcessingStarted);
    const completeSub = eventBus.on(ProcessingEvents.PROCESSING_COMPLETED, handleProcessingCompleted);
    const failedSub = eventBus.on(ProcessingEvents.PROCESSING_FAILED, handleProcessingFailed);
    
    // Subscribe to stage start events
    const preStartSub = eventBus.on(ProcessingEvents.PREPROCESSING_STARTED, (data) => 
      handleStageStarted('preprocessing', data));
    const toolResStartSub = eventBus.on(ProcessingEvents.TOOL_RESOLUTION_STARTED, (data) => 
      handleStageStarted('toolResolution', data));
    const toolExecStartSub = eventBus.on(ProcessingEvents.TOOL_EXECUTION_STARTED, (data) => 
      handleStageStarted('toolExecution', data));
    const llmStartSub = eventBus.on(ProcessingEvents.LLM_CALL_STARTED, (data) => 
      handleStageStarted('llmCall', data));
    const postStartSub = eventBus.on(ProcessingEvents.POSTPROCESSING_STARTED, (data) => 
      handleStageStarted('postprocessing', data));
    const reStartSub = eventBus.on(ProcessingEvents.REPROCESSING_STARTED, (data) => 
      handleStageStarted('reprocessing', data));
    
    // Subscribe to stage complete events
    const preCompleteSub = eventBus.on(ProcessingEvents.PREPROCESSING_COMPLETED, (data) => 
      handleStageCompleted('preprocessing', data));
    const toolResCompleteSub = eventBus.on(ProcessingEvents.TOOL_RESOLUTION_COMPLETED, (data) => 
      handleStageCompleted('toolResolution', data));
    const toolExecCompleteSub = eventBus.on(ProcessingEvents.TOOL_EXECUTION_COMPLETED, (data) => 
      handleStageCompleted('toolExecution', data));
    const llmCompleteSub = eventBus.on(ProcessingEvents.LLM_CALL_COMPLETED, (data) => 
      handleStageCompleted('llmCall', data));
    const postCompleteSub = eventBus.on(ProcessingEvents.POSTPROCESSING_COMPLETED, (data) => 
      handleStageCompleted('postprocessing', data));
    const reCompleteSub = eventBus.on(ProcessingEvents.REPROCESSING_COMPLETED, (data) => 
      handleStageCompleted('reprocessing', data));
    
    // Subscribe to stage error events
    const preFailedSub = eventBus.on(ProcessingEvents.PREPROCESSING_FAILED, (data) => 
      handleStageFailed('preprocessing', data));
    const toolResFailedSub = eventBus.on(ProcessingEvents.TOOL_RESOLUTION_FAILED, (data) => 
      handleStageFailed('toolResolution', data));
    const toolExecFailedSub = eventBus.on(ProcessingEvents.TOOL_EXECUTION_FAILED, (data) => 
      handleStageFailed('toolExecution', data));
    const llmFailedSub = eventBus.on(ProcessingEvents.LLM_CALL_FAILED, (data) => 
      handleStageFailed('llmCall', data));
    const postFailedSub = eventBus.on(ProcessingEvents.POSTPROCESSING_FAILED, (data) => 
      handleStageFailed('postprocessing', data));
    const reFailedSub = eventBus.on(ProcessingEvents.REPROCESSING_FAILED, (data) => 
      handleStageFailed('reprocessing', data));
    
    return () => {
      // Unsubscribe from all events
      startSub();
      completeSub();
      failedSub();
      
      preStartSub();
      toolResStartSub();
      toolExecStartSub();
      llmStartSub();
      postStartSub();
      reStartSub();
      
      preCompleteSub();
      toolResCompleteSub();
      toolExecCompleteSub();
      llmCompleteSub();
      postCompleteSub();
      reCompleteSub();
      
      preFailedSub();
      toolResFailedSub();
      toolExecFailedSub();
      llmFailedSub();
      postFailedSub();
      reFailedSub();
    };
  }, [bot.id, eventBus, logs, maxLogs]);
  
  // Format time difference
  const formatDuration = (start?: number, end?: number): string => {
    if (!start || !end) return '--';
    return `${((end - start) / 1000).toFixed(2)}s`;
  };
  
  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'text-gray-400';
      case 'active': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏱️';
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏱️';
    }
  };
  
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-4">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold">
          Processing Pipeline Visualization
        </h3>
        <span>{isExpanded ? '▼' : '►'}</span>
      </div>
      
      {isExpanded && (
        <div className="mt-4">
          {logs.length === 0 ? (
            <p className="text-gray-500">No processing logs available</p>
          ) : (
            logs.map((log, logIndex) => (
              <div 
                key={`${log.botId}-${log.messageId || logIndex}`}
                className="mb-6 border rounded p-3"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">
                    Message {log.messageId ? `#${log.messageId.substring(0, 8)}...` : 'processing'}
                  </h4>
                  <span className={`text-sm ${log.error ? 'text-red-500' : (log.completed ? 'text-green-500' : 'text-blue-500')}`}>
                    {log.error ? 'Failed' : (log.completed ? 'Completed' : 'In Progress')}
                    {log.startTime && log.endTime && ` (${formatDuration(log.startTime, log.endTime)})`}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(log.stages).map(([key, stage]) => (
                    <div 
                      key={key}
                      className={`p-2 rounded border-l-4 ${
                        stage.status === 'pending' ? 'border-gray-300' :
                        stage.status === 'active' ? 'border-blue-500' :
                        stage.status === 'completed' ? 'border-green-500' :
                        'border-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="mr-2">{getStatusIcon(stage.status)}</span>
                          <span className={getStatusColor(stage.status)}>{stage.stage}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {stage.startTime && stage.endTime && formatDuration(stage.startTime, stage.endTime)}
                        </span>
                      </div>
                      
                      {stage.error && (
                        <div className="text-xs text-red-500 mt-1">
                          Error: {stage.error}
                        </div>
                      )}
                      
                      {stage.details && stage.status !== 'pending' && (
                        <div className="text-xs mt-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <details>
                            <summary className="text-gray-500">Details</summary>
                            <pre className="mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs overflow-auto">
                              {JSON.stringify(stage.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProcessingPipelineVisualizer; 