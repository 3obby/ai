'use client';

import { EventBus } from './EventBus';
import { ProcessingEvents, ProcessingEventPayloads } from './ProcessingEvents';

/**
 * ProcessingEventEmitter - Service for emitting standardized processing events
 * 
 * This service follows the Observer Pattern by:
 * 1. Emitting standardized events for all processing stages
 * 2. Providing a consistent interface for event emission
 * 3. Adding timestamps and common fields automatically
 * 4. Centralizing all event emission in one place
 */
export class ProcessingEventEmitter {
  private static instance: ProcessingEventEmitter;
  private eventBus: EventBus;
  
  private constructor() {
    this.eventBus = EventBus.getInstance();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ProcessingEventEmitter {
    if (!ProcessingEventEmitter.instance) {
      ProcessingEventEmitter.instance = new ProcessingEventEmitter();
    }
    return ProcessingEventEmitter.instance;
  }
  
  /**
   * Emit a processing event with standardized payload
   */
  public emit<T extends ProcessingEvents>(
    eventType: T, 
    payload: Omit<ProcessingEventPayloads[T], 'timestamp'>
  ): void {
    // Add timestamp if not provided
    const fullPayload = {
      ...payload,
      timestamp: Date.now(),
    } as ProcessingEventPayloads[T];
    
    // Log the event emission for debugging
    console.log(`Emitting ${eventType}:`, fullPayload);
    
    // Emit the event through the event bus
    this.eventBus.emit(eventType, fullPayload);
  }
  
  // Lifecycle events
  
  /**
   * Emit an event when processing starts
   */
  public emitProcessingStarted(botId: string, messageId: string): void {
    this.emit(ProcessingEvents.PROCESSING_STARTED, { botId, messageId });
  }
  
  /**
   * Emit an event when processing completes
   */
  public emitProcessingCompleted(botId: string, messageId: string, processingTime: number): void {
    this.emit(ProcessingEvents.PROCESSING_COMPLETED, { botId, messageId, processingTime });
  }
  
  /**
   * Emit an event when processing fails
   */
  public emitProcessingFailed(botId: string, messageId: string, error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.emit(ProcessingEvents.PROCESSING_FAILED, { botId, messageId, error: errorMessage });
  }
  
  // Stage start events
  
  /**
   * Emit an event when preprocessing starts
   */
  public emitPreprocessingStarted(botId: string): void {
    this.emit(ProcessingEvents.PREPROCESSING_STARTED, { botId });
  }
  
  /**
   * Emit an event when tool resolution starts
   */
  public emitToolResolutionStarted(botId: string): void {
    this.emit(ProcessingEvents.TOOL_RESOLUTION_STARTED, { botId });
  }
  
  /**
   * Emit an event when tool execution starts
   */
  public emitToolExecutionStarted(botId: string, tools: string[]): void {
    this.emit(ProcessingEvents.TOOL_EXECUTION_STARTED, { botId, tools });
  }
  
  /**
   * Emit an event when LLM call starts
   */
  public emitLLMCallStarted(botId: string, model: string): void {
    this.emit(ProcessingEvents.LLM_CALL_STARTED, { botId, model });
  }
  
  /**
   * Emit an event when postprocessing starts
   */
  public emitPostprocessingStarted(botId: string): void {
    this.emit(ProcessingEvents.POSTPROCESSING_STARTED, { botId });
  }
  
  /**
   * Emit an event when reprocessing starts
   */
  public emitReprocessingStarted(botId: string, reprocessCount: number, reprocessingDepth: number): void {
    this.emit(ProcessingEvents.REPROCESSING_STARTED, { botId, reprocessCount, reprocessingDepth });
  }
  
  // Stage completion events
  
  /**
   * Emit an event when preprocessing completes
   */
  public emitPreprocessingCompleted(botId: string, processingTime: number): void {
    this.emit(ProcessingEvents.PREPROCESSING_COMPLETED, { botId, processingTime });
  }
  
  /**
   * Emit an event when tool resolution completes
   */
  public emitToolResolutionCompleted(botId: string, processingTime: number, toolsResolved: string[]): void {
    this.emit(ProcessingEvents.TOOL_RESOLUTION_COMPLETED, { botId, processingTime, toolsResolved });
  }
  
  /**
   * Emit an event when tool execution completes
   */
  public emitToolExecutionCompleted(botId: string, processingTime: number, toolResults: any[]): void {
    this.emit(ProcessingEvents.TOOL_EXECUTION_COMPLETED, { botId, processingTime, toolResults });
  }
  
  /**
   * Emit an event when LLM call completes
   */
  public emitLLMCallCompleted(botId: string, processingTime: number, model: string, tokenCount?: number): void {
    this.emit(ProcessingEvents.LLM_CALL_COMPLETED, { botId, processingTime, model, tokenCount });
  }
  
  /**
   * Emit an event when postprocessing completes
   */
  public emitPostprocessingCompleted(botId: string, processingTime: number): void {
    this.emit(ProcessingEvents.POSTPROCESSING_COMPLETED, { botId, processingTime });
  }
  
  /**
   * Emit an event when reprocessing completes
   */
  public emitReprocessingCompleted(botId: string, processingTime: number, reprocessCount: number, reprocessingDepth: number): void {
    this.emit(ProcessingEvents.REPROCESSING_COMPLETED, { botId, processingTime, reprocessCount, reprocessingDepth });
  }
  
  // Stage error events
  
  /**
   * Emit an event when preprocessing fails
   */
  public emitPreprocessingFailed(botId: string, error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.emit(ProcessingEvents.PREPROCESSING_FAILED, { botId, error: errorMessage });
  }
  
  /**
   * Emit an event when tool resolution fails
   */
  public emitToolResolutionFailed(botId: string, error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.emit(ProcessingEvents.TOOL_RESOLUTION_FAILED, { botId, error: errorMessage });
  }
  
  /**
   * Emit an event when tool execution fails
   */
  public emitToolExecutionFailed(botId: string, tool: string, error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.emit(ProcessingEvents.TOOL_EXECUTION_FAILED, { botId, tool, error: errorMessage });
  }
  
  /**
   * Emit an event when LLM call fails
   */
  public emitLLMCallFailed(botId: string, model: string, error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.emit(ProcessingEvents.LLM_CALL_FAILED, { botId, model, error: errorMessage });
  }
  
  /**
   * Emit an event when postprocessing fails
   */
  public emitPostprocessingFailed(botId: string, error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.emit(ProcessingEvents.POSTPROCESSING_FAILED, { botId, error: errorMessage });
  }
  
  /**
   * Emit an event when reprocessing fails
   */
  public emitReprocessingFailed(botId: string, reprocessCount: number, error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.emit(ProcessingEvents.REPROCESSING_FAILED, { botId, reprocessCount, error: errorMessage });
  }
  
  // Reprocessing-specific events
  
  /**
   * Emit an event when reprocessing is needed
   */
  public emitReprocessingNeeded(botId: string, content: string, reprocessingDepth: number): void {
    // Only include a preview of content to avoid huge payloads
    const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
    this.emit(ProcessingEvents.REPROCESSING_NEEDED, { botId, content: contentPreview, reprocessingDepth });
  }
  
  /**
   * Emit an event when reprocessing is skipped
   */
  public emitReprocessingSkipped(botId: string, reason: string): void {
    this.emit(ProcessingEvents.REPROCESSING_SKIPPED, { botId, reason });
  }
  
  /**
   * Emit an event when maximum reprocessing depth is reached
   */
  public emitMaxDepthReached(botId: string, currentDepth: number, maxDepth: number): void {
    this.emit(ProcessingEvents.MAX_DEPTH_REACHED, { botId, currentDepth, maxDepth });
  }
  
  // Tool events
  
  /**
   * Emit an event when a tool is called
   */
  public emitToolCalled(botId: string, tool: string, parameters: any): void {
    this.emit(ProcessingEvents.TOOL_CALLED, { botId, tool, parameters });
  }
  
  /**
   * Emit an event when a tool result is received
   */
  public emitToolResultReceived(botId: string, tool: string, result: any, executionTime: number): void {
    this.emit(ProcessingEvents.TOOL_RESULT_RECEIVED, { botId, tool, result, executionTime });
  }
}

// Export the singleton for direct use in services
export const processingEventEmitter = ProcessingEventEmitter.getInstance(); 