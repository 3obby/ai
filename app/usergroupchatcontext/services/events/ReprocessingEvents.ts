'use client';

import { EventBus, EventMap } from './EventBus';

/**
 * Define reprocessing event names 
 */
export enum ReprocessingEvents {
  REPROCESSING_STARTED = 'reprocessing:started',
  REPROCESSING_COMPLETED = 'reprocessing:completed',
  REPROCESSING_ERROR = 'reprocessing:error'
}

/**
 * Extend the EventMap interface to include reprocessing events
 */
declare module './EventBus' {
  interface EventMap {
    // Reprocessing events
    'reprocessing:started': { 
      botId: string; 
      content: string; 
      reprocessCount: number;
      reprocessingDepth: number;
      timestamp: number;
    };
    'reprocessing:completed': {
      botId: string;
      content: string;
      originalContent: string;
      processingTime: number;
      timestamp: number;
    };
    'reprocessing:error': {
      botId: string;
      error: any;
      timestamp: number;
    };
  }
}

// Re-export the EventBus for convenience
export { EventBus }; 