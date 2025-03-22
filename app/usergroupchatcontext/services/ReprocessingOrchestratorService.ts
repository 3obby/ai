'use client';

import { Bot, ProcessingMetadata } from '../types';
import { processingTracker } from './ProcessingTracker';
import { ReprocessingEvaluator } from './ReprocessingEvaluator';
import { MessageContext } from './pipeline/types';
import { EventBus } from './events/EventBus';

/**
 * Events emitted by the ReprocessingOrchestrator
 */
export enum ReprocessingEvents {
  REPROCESSING_NEEDED = 'reprocessing:needed',
  REPROCESSING_STARTED = 'reprocessing:started',
  REPROCESSING_COMPLETED = 'reprocessing:completed',
  REPROCESSING_FAILED = 'reprocessing:failed',
  REPROCESSING_SKIPPED = 'reprocessing:skipped',
  MAX_DEPTH_REACHED = 'reprocessing:maxDepthReached'
}

/**
 * ReprocessingOrchestratorService - Central coordinator for all reprocessing operations
 * 
 * Follows the Single Responsibility Principle by:
 * - Focusing solely on orchestrating the reprocessing workflow
 * - Centralizing all reprocessing decision logic
 * - Managing reprocessing state and configuration
 * - Providing a clean API for triggering reprocessing from any pipeline stage
 */
export class ReprocessingOrchestratorService {
  private static instance: ReprocessingOrchestratorService;
  private eventBus: EventBus;
  
  private constructor() {
    this.eventBus = EventBus.getInstance();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ReprocessingOrchestratorService {
    if (!ReprocessingOrchestratorService.instance) {
      ReprocessingOrchestratorService.instance = new ReprocessingOrchestratorService();
    }
    return ReprocessingOrchestratorService.instance;
  }
  
  /**
   * Determines if a response needs reprocessing
   */
  public async shouldReprocess(
    content: string,
    bot: Bot,
    context: MessageContext,
    metadata: ProcessingMetadata
  ): Promise<boolean> {
    const currentDepth = metadata.reprocessingDepth || 0;
    const maxDepth = context.settings.chat.maxReprocessingDepth || 3;
    
    // Log the evaluation details
    console.log('==== REPROCESSING ORCHESTRATOR: EVALUATION ====');
    console.log('Bot:', bot.id, bot.name);
    console.log('Reprocessing enabled:', bot.enableReprocessing);
    console.log('Reprocessing criteria:', bot.reprocessingCriteria);
    console.log('Current depth:', currentDepth, '/', maxDepth);
    
    // Check depth limits
    if (currentDepth >= maxDepth) {
      console.log(`Maximum reprocessing depth reached (${currentDepth}/${maxDepth})`);
      this.eventBus.emit(ReprocessingEvents.MAX_DEPTH_REACHED, {
        botId: bot.id,
        currentDepth,
        maxDepth
      });
      return false;
    }
    
    // Check if reprocessing is enabled
    if (bot.enableReprocessing !== true) {
      console.log('Reprocessing is disabled for this bot');
      this.eventBus.emit(ReprocessingEvents.REPROCESSING_SKIPPED, {
        botId: bot.id,
        reason: 'disabled'
      });
      return false;
    }
    
    // Use the evaluator to check if reprocessing is needed
    const shouldReprocess = await ReprocessingEvaluator.needsReprocessing(
      content,
      bot,
      currentDepth,
      maxDepth
    );
    
    if (shouldReprocess) {
      this.eventBus.emit(ReprocessingEvents.REPROCESSING_NEEDED, {
        botId: bot.id,
        currentDepth,
        content: content.substring(0, 100) + '...' // Only include a preview
      });
    }
    
    return shouldReprocess;
  }
  
  /**
   * Begin reprocessing and track the status
   */
  public startReprocessing(botId: string): number {
    const reprocessCount = processingTracker.startReprocessing(botId);
    
    this.eventBus.emit(ReprocessingEvents.REPROCESSING_STARTED, {
      botId,
      attempt: reprocessCount
    });
    
    return reprocessCount;
  }
  
  /**
   * End reprocessing and track the status
   */
  public endReprocessing(botId: string, success: boolean = true): void {
    processingTracker.endReprocessing(botId);
    
    const eventType = success 
      ? ReprocessingEvents.REPROCESSING_COMPLETED 
      : ReprocessingEvents.REPROCESSING_FAILED;
    
    this.eventBus.emit(eventType, {
      botId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Validates reprocessing configuration and provides warnings for common issues
   */
  public validateReprocessingConfig(bot: Bot): void {
    // Add detailed debugging of the bot object
    console.log('🔍 REPROCESSING CONFIG VALIDATION:');
    console.log('🔍 Full bot object:', JSON.stringify(bot, null, 2));
    console.log('🔍 Bot enableReprocessing:', bot.enableReprocessing, 'Type:', typeof bot.enableReprocessing);
    console.log('🔍 Bot reprocessingCriteria:', bot.reprocessingCriteria, 'Type:', typeof bot.reprocessingCriteria);
    console.log('🔍 Bot reprocessingInstructions:', bot.reprocessingInstructions, 'Type:', typeof bot.reprocessingInstructions);

    const warnings: string[] = [];
    
    // Check for missing criteria when reprocessing is enabled
    if (bot.enableReprocessing === true && (!bot.reprocessingCriteria || bot.reprocessingCriteria.trim() === '')) {
      warnings.push('Reprocessing is enabled but no criteria specified. Reprocessing will be skipped.');
    }
    
    // Check for criteria when reprocessing is disabled
    if (bot.enableReprocessing !== true && bot.reprocessingCriteria && bot.reprocessingCriteria.trim() !== '') {
      warnings.push('Reprocessing criteria specified but reprocessing is disabled. Criteria will be ignored.');
    }
    
    // Check for common issues when criteria is specific
    if (bot.reprocessingCriteria && ['yes', 'true', 'always'].includes(bot.reprocessingCriteria.trim().toLowerCase())) {
      console.log('⚠️ Using test criteria: Always reprocessing with "true" criteria');
    }
    
    // Check for special instructions
    if (bot.reprocessingInstructions && bot.reprocessingInstructions.toLowerCase().includes('bark')) {
      console.log('🐕 Special case: Bark instructions detected');
    }
    
    // Log any warnings
    if (warnings.length > 0) {
      console.warn(`Reprocessing configuration warnings for bot ${bot.id}:`, warnings);
    }
  }
  
  /**
   * Returns the current reprocessing count for a bot
   */
  public getReprocessingCount(botId: string): number {
    return processingTracker.getReprocessingCount(botId);
  }
  
  /**
   * Resets the reprocessing count for a bot
   */
  public resetReprocessingCount(botId: string): void {
    processingTracker.resetReprocessingCount(botId);
  }
}

// Export the singleton for direct use in services
export const reprocessingOrchestrator = ReprocessingOrchestratorService.getInstance(); 