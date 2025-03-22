'use client';

import { StageProcessor } from '../types';
import { Bot, Message } from '../../../types';

/**
 * Track recently processed messages to prevent duplicates
 */
class MessageDeduplicationCache {
  private static instance: MessageDeduplicationCache;
  private recentMessages: Map<string, number> = new Map();
  private expirationTimeMs: number = 5000; // 5 seconds expiration
  
  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), 10000);
  }
  
  public static getInstance(): MessageDeduplicationCache {
    if (!MessageDeduplicationCache.instance) {
      MessageDeduplicationCache.instance = new MessageDeduplicationCache();
    }
    return MessageDeduplicationCache.instance;
  }
  
  /**
   * Check if a message is a duplicate of a recently processed message
   */
  public isDuplicate(userId: string, botId: string, content: string): boolean {
    const key = this.createKey(userId, botId, content);
    const timestamp = this.recentMessages.get(key);
    
    if (!timestamp) return false;
    
    // Check if the record is still valid (not expired)
    if (Date.now() - timestamp > this.expirationTimeMs) {
      this.recentMessages.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Register a message as processed
   */
  public registerMessage(userId: string, botId: string, content: string): void {
    const key = this.createKey(userId, botId, content);
    this.recentMessages.set(key, Date.now());
  }
  
  /**
   * Clean up expired messages
   */
  private cleanup(): void {
    const now = Date.now();
    // Use Array.from to convert Map entries to an array for iteration
    Array.from(this.recentMessages.entries()).forEach(([key, timestamp]) => {
      if (now - timestamp > this.expirationTimeMs) {
        this.recentMessages.delete(key);
      }
    });
  }
  
  /**
   * Create a unique key for the message
   */
  private createKey(userId: string, botId: string, content: string): string {
    // For performance, use a hash of content rather than the full content
    let contentHash = 0;
    for (let i = 0; i < content.length; i++) {
      contentHash = ((contentHash << 5) - contentHash) + content.charCodeAt(i);
      contentHash |= 0; // Convert to 32bit integer
    }
    
    return `${userId}-${botId}-${contentHash}`;
  }
}

/**
 * A processor that prevents duplicate message processing
 */
export const DeduplicationProcessor: StageProcessor = async (
  content, 
  bot, 
  context, 
  metadata
) => {
  // If we're in a reprocessing loop, skip deduplication
  if (context.currentDepth > 0) {
    return { 
      content, 
      metadata: {
        ...metadata,
        deduplicationSkipped: true,
      }
    };
  }
  
  // Get original message from context if available
  const originalMessage = context.originalMessage;
  
  // If no original message, we can't do deduplication
  if (!originalMessage) {
    return { 
      content, 
      metadata: {
        ...metadata,
        deduplicationSkipped: true,
      }
    };
  }
  
  const cache = MessageDeduplicationCache.getInstance();
  const userId = originalMessage.sender === 'user' ? 'user' : originalMessage.sender;
  
  // Check if this is a duplicate message
  if (cache.isDuplicate(userId, bot.id, content)) {
    console.log(`[Deduplication] Detected duplicate message for bot ${bot.id}: "${content.substring(0, 30)}..."`);
    
    // Skip the rest of the pipeline
    return {
      content: "I've already processed this message.",
      metadata: {
        ...metadata,
        isDuplicate: true,
      },
      skipNextStages: true,
    };
  }
  
  // Register the message as processed
  cache.registerMessage(userId, bot.id, content);
  
  // Pass through the content unchanged
  return {
    content,
    metadata: {
      ...metadata,
      deduplicationApplied: true,
    },
  };
}; 