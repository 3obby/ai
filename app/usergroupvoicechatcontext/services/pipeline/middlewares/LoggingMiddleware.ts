'use client';

import { MessageMiddleware } from '../types';

/**
 * Creates a middleware that logs message content before and after processing
 * @param logLevel - The log level to use (debug, info, warn, error)
 */
export function createLoggingMiddleware(
  logLevel: 'debug' | 'info' | 'warn' | 'error' = 'debug'
): MessageMiddleware {
  return async (content, context, metadata, next) => {
    // Create a logger function based on log level
    const log = (() => {
      switch (logLevel) {
        case 'debug': return console.debug;
        case 'info': return console.info;
        case 'warn': return console.warn;
        case 'error': return console.error;
        default: return console.log;
      }
    })();
    
    // Log before processing
    log(`[Pipeline] Processing message for bot ${context.isVoiceGhost ? 'ghost-' : ''}${context.originalMessage?.sender || 'unknown'}`);
    log(`[Pipeline] Content before: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
    log(`[Pipeline] Metadata before:`, metadata);
    
    // Process with next middleware/processor
    const result = await next();
    
    // Log after processing
    log(`[Pipeline] Content after: ${result.content.substring(0, 50)}${result.content.length > 50 ? '...' : ''}`);
    log(`[Pipeline] Metadata after:`, result.metadata);
    
    if (result.error) {
      log(`[Pipeline] Error:`, result.error);
    }
    
    if (result.skipNextStages) {
      log(`[Pipeline] Skipping subsequent stages`);
    }
    
    return result;
  };
} 