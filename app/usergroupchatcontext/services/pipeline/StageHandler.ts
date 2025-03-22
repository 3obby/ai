'use client';

import { Bot, ProcessingMetadata } from '../../types';
import { MessageContext, ProcessingResult, StageProcessor } from './types';

/**
 * StageHandler implements the Chain of Responsibility pattern
 * for the message processing pipeline. Each stage can decide
 * whether to continue to the next stage or short-circuit the chain.
 */
export class StageHandler {
  private name: string;
  private processor: StageProcessor;
  private nextHandler: StageHandler | null = null;
  private isEnabled: boolean = true;
  
  constructor(name: string, processor: StageProcessor) {
    this.name = name;
    this.processor = processor;
  }
  
  /**
   * Enable or disable this stage
   */
  public setEnabled(isEnabled: boolean): StageHandler {
    this.isEnabled = isEnabled;
    return this;
  }
  
  /**
   * Check if this stage is enabled
   */
  public isStageEnabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Sets the next handler in the chain
   */
  public setNext(handler: StageHandler): StageHandler {
    this.nextHandler = handler;
    return handler;
  }
  
  /**
   * Get the name of this stage
   */
  public getName(): string {
    return this.name;
  }
  
  /**
   * Process the current stage and pass to the next if appropriate
   */
  public async handle(
    content: string, 
    bot: Bot, 
    context: MessageContext, 
    metadata: ProcessingMetadata
  ): Promise<ProcessingResult> {
    console.log(`StageHandler: Starting processing stage '${this.name}'`);
    
    // Skip this stage if disabled
    if (!this.isEnabled) {
      console.log(`StageHandler: Stage '${this.name}' is disabled, skipping`);
      
      // Pass to next handler if it exists
      if (this.nextHandler) {
        console.log(`StageHandler: Passing to next stage '${this.nextHandler.getName()}'`);
        return await this.nextHandler.handle(content, bot, context, metadata);
      }
      
      // If no next handler, return the content as is with updated metadata
      return {
        content,
        metadata: {
          ...metadata,
          processingStage: `skipped-${this.name}`
        }
      };
    }
    
    // Process the current stage
    try {
      // Measure processing time
      const startTime = Date.now();
      
      // Run the processor
      const result = await this.processor(content, bot, context, {
        ...metadata,
        processingStage: `processing-${this.name}`
      });
      
      // Add timing information
      const processingTime = Date.now() - startTime;
      result.metadata = {
        ...result.metadata,
        [`${this.name}Time`]: processingTime
      };
      
      console.log(`StageHandler: Completed processing stage '${this.name}' in ${processingTime}ms`);
      
      // Check if we need to stop the chain
      if (result.stopChain === true) {
        console.log(`StageHandler: Stage '${this.name}' requested to stop the chain`);
        return result;
      }
      
      // Pass to next handler if it exists
      if (this.nextHandler) {
        console.log(`StageHandler: Passing to next stage '${this.nextHandler.getName()}'`);
        return await this.nextHandler.handle(result.content, bot, context, result.metadata);
      }
      
      // If no next handler, return the result
      return result;
    } catch (error) {
      console.error(`StageHandler: Error in stage '${this.name}':`, error);
      
      // Return error result
      return {
        content,
        metadata: {
          ...metadata,
          error: error instanceof Error ? error.message : String(error),
          processingStage: `error-${this.name}`
        }
      };
    }
  }
}

/**
 * Create a chain of stage handlers
 */
export function createStageChain(stageDefinitions: {
  name: string;
  processor: StageProcessor;
  enabled: boolean;
}[]): StageHandler | null {
  if (stageDefinitions.length === 0) {
    return null;
  }
  
  // Create the first handler
  const firstDefinition = stageDefinitions[0];
  const firstHandler = new StageHandler(
    firstDefinition.name, 
    firstDefinition.processor
  ).setEnabled(firstDefinition.enabled);
  
  // Build the chain
  let currentHandler = firstHandler;
  
  // Create and link the remaining handlers
  for (let i = 1; i < stageDefinitions.length; i++) {
    const definition = stageDefinitions[i];
    const nextHandler = new StageHandler(
      definition.name, 
      definition.processor
    ).setEnabled(definition.enabled);
    
    currentHandler.setNext(nextHandler);
    currentHandler = nextHandler;
  }
  
  return firstHandler;
} 