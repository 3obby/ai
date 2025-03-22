'use client';

import { useProcessingState } from '../context/ProcessingStateProvider';
import { useRef, useCallback, useEffect } from 'react';
import { GroupChatSettings } from '../types';
import { processingEventEmitter } from './events/ProcessingEventEmitter';

// Singleton pattern to ensure consistent access across components
class ProcessingTrackerService {
  private static instance: ProcessingTrackerService;
  private processingStateDispatch: any = null;
  private maxReprocessingDepth: number = 3;
  
  private constructor() {}
  
  public static getInstance(): ProcessingTrackerService {
    if (!ProcessingTrackerService.instance) {
      ProcessingTrackerService.instance = new ProcessingTrackerService();
    }
    return ProcessingTrackerService.instance;
  }
  
  public setDispatch(dispatch: any): void {
    this.processingStateDispatch = dispatch;
  }
  
  public setMaxReprocessingDepth(depth: number): void {
    this.maxReprocessingDepth = depth;
  }
  
  public startPreProcessing(botId: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'SET_PROCESSING_STAGE', 
      botId, 
      stage: 'pre-processing' 
    });
    
    // Emit event using the event emitter
    processingEventEmitter.emitPreprocessingStarted(botId);
  }
  
  public endPreProcessing(botId: string, processingTime?: number): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    // Emit event only if we have timing information (success case)
    if (processingTime !== undefined) {
      processingEventEmitter.emitPreprocessingCompleted(botId, processingTime);
    }
  }
  
  public errorPreProcessing(botId: string, error: string | Error): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    // Emit error event
    processingEventEmitter.emitPreprocessingFailed(botId, error);
  }
  
  public startToolCalling(botId: string, tools: string[] = []): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'SET_PROCESSING_STAGE', 
      botId, 
      stage: 'tool-calling' 
    });
    
    if (tools.length > 0) {
      this.processingStateDispatch({ 
        type: 'SET_ACTIVE_TOOLS', 
        botId, 
        tools 
      });
    }
    
    // Emit event for tool resolution start
    processingEventEmitter.emitToolResolutionStarted(botId);
    
    // If we have tools, also emit tool execution start
    if (tools.length > 0) {
      processingEventEmitter.emitToolExecutionStarted(botId, tools);
    }
  }
  
  public endToolCalling(botId: string, processingTime?: number, toolResults?: any[]): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    this.processingStateDispatch({ 
      type: 'CLEAR_ACTIVE_TOOLS', 
      botId 
    });
    
    // Emit event if we have timing information (success case)
    if (processingTime !== undefined) {
      // Get the tools that were active
      const tools = this.getActiveTools(botId) || [];
      
      // Emit tool resolution completed
      processingEventEmitter.emitToolResolutionCompleted(botId, processingTime, tools);
      
      // If we have tool results, emit tool execution completed
      if (toolResults && toolResults.length > 0) {
        processingEventEmitter.emitToolExecutionCompleted(botId, processingTime, toolResults);
      }
    }
  }
  
  public errorToolCalling(botId: string, error: string | Error, tool?: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    this.processingStateDispatch({ 
      type: 'CLEAR_ACTIVE_TOOLS', 
      botId 
    });
    
    // Emit error event for tool resolution
    processingEventEmitter.emitToolResolutionFailed(botId, error);
    
    // If a specific tool was provided, also emit tool execution failed
    if (tool) {
      processingEventEmitter.emitToolExecutionFailed(botId, tool, error);
    }
  }
  
  public startLLMCall(botId: string, model: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'SET_PROCESSING_STAGE', 
      botId, 
      stage: 'llm-call' 
    });
    
    // Emit event for LLM call start
    processingEventEmitter.emitLLMCallStarted(botId, model);
  }
  
  public endLLMCall(botId: string, processingTime?: number, model?: string, tokenCount?: number): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    // Emit event if we have timing information (success case)
    if (processingTime !== undefined && model) {
      processingEventEmitter.emitLLMCallCompleted(botId, processingTime, model, tokenCount);
    }
  }
  
  public errorLLMCall(botId: string, model: string, error: string | Error): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    // Emit error event
    processingEventEmitter.emitLLMCallFailed(botId, model, error);
  }
  
  public startPostProcessing(botId: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'SET_PROCESSING_STAGE', 
      botId, 
      stage: 'post-processing' 
    });
    
    // Emit event for postprocessing start
    processingEventEmitter.emitPostprocessingStarted(botId);
  }
  
  public endPostProcessing(botId: string, processingTime?: number): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    // Emit event if we have timing information (success case)
    if (processingTime !== undefined) {
      processingEventEmitter.emitPostprocessingCompleted(botId, processingTime);
    }
  }
  
  public errorPostProcessing(botId: string, error: string | Error): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    // Emit error event
    processingEventEmitter.emitPostprocessingFailed(botId, error);
  }
  
  public startReprocessing(botId: string): number {
    if (!this.processingStateDispatch) return 0;
    
    // Get the current count and increment
    const currentCount = this.getReprocessingCount(botId);
    const newCount = currentCount + 1;
    
    // Check if we've hit the limit
    if (newCount > this.maxReprocessingDepth) {
      // Emit max depth reached event
      processingEventEmitter.emitMaxDepthReached(botId, newCount, this.maxReprocessingDepth);
      return 0; // Don't increment beyond the limit
    }
    
    this.processingStateDispatch({ 
      type: 'INCREMENT_REPROCESSING_COUNT', 
      botId 
    });
    
    this.processingStateDispatch({ 
      type: 'SET_PROCESSING_STAGE', 
      botId, 
      stage: `reprocessing-${newCount}` 
    });
    
    // Emit event for reprocessing start
    processingEventEmitter.emitReprocessingStarted(botId, newCount, currentCount);
    
    return newCount;
  }
  
  public endReprocessing(botId: string, processingTime?: number): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    // Emit event if we have timing information (success case)
    if (processingTime !== undefined) {
      const reprocessCount = this.getReprocessingCount(botId);
      const depth = Math.max(0, reprocessCount - 1); // Depth is one less than count
      processingEventEmitter.emitReprocessingCompleted(botId, processingTime, reprocessCount, depth);
    }
  }
  
  public errorReprocessing(botId: string, error: string | Error): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    // Emit error event
    const reprocessCount = this.getReprocessingCount(botId);
    processingEventEmitter.emitReprocessingFailed(botId, reprocessCount, error);
  }
  
  public getReprocessingCount(botId: string): number {
    // This info should be stored in the ProcessingState context
    // This method just asks the context provider
    return 0; // This will be replaced by the actual context value
  }
  
  public resetReprocessingCount(botId: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'RESET_REPROCESSING_COUNT', 
      botId 
    });
  }
  
  public canReprocess(botId: string): boolean {
    const currentCount = this.getReprocessingCount(botId);
    return currentCount < this.maxReprocessingDepth;
  }
  
  // Helper method to get active tools for a bot
  private getActiveTools(botId: string): string[] | null {
    // This would typically come from the processing state
    // Here we return null since we don't have direct access to state
    return null;
  }
}

// Create a hook to provide access to the tracker within React components
export function useProcessingTracker(settings?: GroupChatSettings) {
  const { dispatch, getReprocessingCount, getActiveTools } = useProcessingState();
  const trackerRef = useRef(ProcessingTrackerService.getInstance());
  
  // Set the dispatch function on mount
  useEffect(() => {
    trackerRef.current.setDispatch(dispatch);
    return () => {
      // Clean up
      trackerRef.current.setDispatch(null);
    };
  }, [dispatch]);
  
  // Update max reprocessing depth when settings change
  useEffect(() => {
    if (settings?.maxReprocessingDepth) {
      trackerRef.current.setMaxReprocessingDepth(settings.maxReprocessingDepth);
    }
  }, [settings?.maxReprocessingDepth]);
  
  // Extend the service's getReprocessingCount to use the context
  const getReprocessingCountExtended = useCallback((botId: string) => {
    return getReprocessingCount(botId);
  }, [getReprocessingCount]);
  
  // Override the method in the service
  trackerRef.current.getReprocessingCount = getReprocessingCountExtended;
  
  return trackerRef.current;
}

// Export the singleton for direct use in services
export const processingTracker = ProcessingTrackerService.getInstance(); 