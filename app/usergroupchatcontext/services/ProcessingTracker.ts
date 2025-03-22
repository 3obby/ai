'use client';

import { useProcessingState } from '../context/ProcessingStateProvider';
import { useRef, useCallback, useEffect } from 'react';
import { GroupChatSettings } from '../types';

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
  }
  
  public endPreProcessing(botId: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
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
  }
  
  public endToolCalling(botId: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
    
    this.processingStateDispatch({ 
      type: 'CLEAR_ACTIVE_TOOLS', 
      botId 
    });
  }
  
  public startPostProcessing(botId: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'SET_PROCESSING_STAGE', 
      botId, 
      stage: 'post-processing' 
    });
  }
  
  public endPostProcessing(botId: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
  }
  
  public startReprocessing(botId: string): number {
    if (!this.processingStateDispatch) return 0;
    
    // Get the current count and increment
    const currentCount = this.getReprocessingCount(botId);
    const newCount = currentCount + 1;
    
    // Check if we've hit the limit
    if (newCount > this.maxReprocessingDepth) {
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
    
    return newCount;
  }
  
  public endReprocessing(botId: string): void {
    if (!this.processingStateDispatch) return;
    
    this.processingStateDispatch({ 
      type: 'CLEAR_PROCESSING_STAGE', 
      botId 
    });
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
}

// Create a hook to provide access to the tracker within React components
export function useProcessingTracker(settings?: GroupChatSettings) {
  const { dispatch, getReprocessingCount } = useProcessingState();
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