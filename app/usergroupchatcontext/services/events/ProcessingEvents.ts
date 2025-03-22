'use client';

/**
 * ProcessingEvents - Standard events emitted during message processing
 * 
 * These events support the Observer Pattern for monitoring the processing pipeline
 * and are used to provide real-time feedback about processing stages.
 */
export enum ProcessingEvents {
  // Lifecycle events
  PROCESSING_STARTED = 'processing:started',
  PROCESSING_COMPLETED = 'processing:completed',
  PROCESSING_FAILED = 'processing:failed',
  
  // Stage events - Start
  PREPROCESSING_STARTED = 'preprocessing:started',
  TOOL_RESOLUTION_STARTED = 'toolResolution:started',
  TOOL_EXECUTION_STARTED = 'toolExecution:started',
  LLM_CALL_STARTED = 'llmCall:started',
  POSTPROCESSING_STARTED = 'postprocessing:started',
  REPROCESSING_STARTED = 'reprocessing:started',
  
  // Stage events - End
  PREPROCESSING_COMPLETED = 'preprocessing:completed',
  TOOL_RESOLUTION_COMPLETED = 'toolResolution:completed',
  TOOL_EXECUTION_COMPLETED = 'toolExecution:completed',
  LLM_CALL_COMPLETED = 'llmCall:completed',
  POSTPROCESSING_COMPLETED = 'postprocessing:completed',
  REPROCESSING_COMPLETED = 'reprocessing:completed',
  
  // Stage events - Error
  PREPROCESSING_FAILED = 'preprocessing:failed',
  TOOL_RESOLUTION_FAILED = 'toolResolution:failed',
  TOOL_EXECUTION_FAILED = 'toolExecution:failed',
  LLM_CALL_FAILED = 'llmCall:failed',
  POSTPROCESSING_FAILED = 'postprocessing:failed',
  REPROCESSING_FAILED = 'reprocessing:failed',
  
  // Reprocessing specific events
  REPROCESSING_NEEDED = 'reprocessing:needed',
  REPROCESSING_SKIPPED = 'reprocessing:skipped',
  MAX_DEPTH_REACHED = 'reprocessing:maxDepthReached',
  
  // Tool events
  TOOL_CALLED = 'tool:called',
  TOOL_RESULT_RECEIVED = 'tool:resultReceived'
}

/**
 * Standard event payloads for processing events
 */
export interface ProcessingEventPayloads {
  // Base payload interface all processing events should include
  [key: string]: {
    botId: string;
    timestamp: number;
    [key: string]: any;
  };
  
  // Lifecycle events
  [ProcessingEvents.PROCESSING_STARTED]: {
    botId: string;
    messageId: string;
    timestamp: number;
  };
  
  [ProcessingEvents.PROCESSING_COMPLETED]: {
    botId: string;
    messageId: string;
    timestamp: number;
    processingTime: number;
  };
  
  [ProcessingEvents.PROCESSING_FAILED]: {
    botId: string;
    messageId: string;
    timestamp: number;
    error: string;
  };
  
  // Stage start events
  [ProcessingEvents.PREPROCESSING_STARTED]: {
    botId: string;
    timestamp: number;
  };
  
  [ProcessingEvents.TOOL_RESOLUTION_STARTED]: {
    botId: string;
    timestamp: number;
  };
  
  [ProcessingEvents.TOOL_EXECUTION_STARTED]: {
    botId: string;
    timestamp: number;
    tools: string[];
  };
  
  [ProcessingEvents.LLM_CALL_STARTED]: {
    botId: string;
    timestamp: number;
    model: string;
  };
  
  [ProcessingEvents.POSTPROCESSING_STARTED]: {
    botId: string;
    timestamp: number;
  };
  
  [ProcessingEvents.REPROCESSING_STARTED]: {
    botId: string;
    timestamp: number;
    reprocessCount: number;
    reprocessingDepth: number;
  };
  
  // Stage completion events
  [ProcessingEvents.PREPROCESSING_COMPLETED]: {
    botId: string;
    timestamp: number;
    processingTime: number;
  };
  
  [ProcessingEvents.TOOL_RESOLUTION_COMPLETED]: {
    botId: string;
    timestamp: number;
    processingTime: number;
    toolsResolved: string[];
  };
  
  [ProcessingEvents.TOOL_EXECUTION_COMPLETED]: {
    botId: string;
    timestamp: number;
    processingTime: number;
    toolResults: any[];
  };
  
  [ProcessingEvents.LLM_CALL_COMPLETED]: {
    botId: string;
    timestamp: number;
    processingTime: number;
    model: string;
    tokenCount?: number;
  };
  
  [ProcessingEvents.POSTPROCESSING_COMPLETED]: {
    botId: string;
    timestamp: number;
    processingTime: number;
  };
  
  [ProcessingEvents.REPROCESSING_COMPLETED]: {
    botId: string;
    timestamp: number;
    processingTime: number;
    reprocessCount: number;
    reprocessingDepth: number;
  };
  
  // Stage error events
  [ProcessingEvents.PREPROCESSING_FAILED]: {
    botId: string;
    timestamp: number;
    error: string;
  };
  
  [ProcessingEvents.TOOL_RESOLUTION_FAILED]: {
    botId: string;
    timestamp: number;
    error: string;
  };
  
  [ProcessingEvents.TOOL_EXECUTION_FAILED]: {
    botId: string;
    timestamp: number;
    tool: string;
    error: string;
  };
  
  [ProcessingEvents.LLM_CALL_FAILED]: {
    botId: string;
    timestamp: number;
    model: string;
    error: string;
  };
  
  [ProcessingEvents.POSTPROCESSING_FAILED]: {
    botId: string;
    timestamp: number;
    error: string;
  };
  
  [ProcessingEvents.REPROCESSING_FAILED]: {
    botId: string;
    timestamp: number;
    error: string;
    reprocessCount: number;
  };
  
  // Reprocessing-specific events
  [ProcessingEvents.REPROCESSING_NEEDED]: {
    botId: string;
    timestamp: number;
    content: string;
    reprocessingDepth: number;
  };
  
  [ProcessingEvents.REPROCESSING_SKIPPED]: {
    botId: string;
    timestamp: number;
    reason: string;
  };
  
  [ProcessingEvents.MAX_DEPTH_REACHED]: {
    botId: string;
    timestamp: number;
    currentDepth: number;
    maxDepth: number;
  };
  
  // Tool events
  [ProcessingEvents.TOOL_CALLED]: {
    botId: string;
    timestamp: number;
    tool: string;
    parameters: any;
  };
  
  [ProcessingEvents.TOOL_RESULT_RECEIVED]: {
    botId: string;
    timestamp: number;
    tool: string;
    result: any;
    executionTime: number;
  };
} 