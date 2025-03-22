'use client';

import { Bot } from '../types';
import { LLMService } from './LLMService';

/**
 * ReprocessingEvaluator - Service for evaluating if a response needs reprocessing
 * 
 * This service follows the single-responsibility principle by:
 * 1. Focusing solely on evaluating if a response needs reprocessing
 * 2. Separating evaluation logic from processing and tracking logic
 * 3. Providing a centralized place for reprocessing decision rules
 */
export class ReprocessingEvaluator {
  /**
   * Evaluates if a response needs reprocessing based on bot criteria and settings
   * 
   * @param content - The content to evaluate
   * @param bot - The bot with reprocessing criteria and settings
   * @param currentDepth - The current reprocessing depth
   * @param maxDepth - The maximum allowed reprocessing depth
   * @returns Promise resolving to true if reprocessing is needed
   */
  static async needsReprocessing(
    content: string,
    bot: Bot,
    currentDepth: number,
    maxDepth: number
  ): Promise<boolean> {
    // Check if reprocessing is enabled for this bot
    if (bot.enableReprocessing !== true) {
      console.log('Reprocessing is disabled for this bot');
      return false;
    }
    
    // Check if we've reached the maximum reprocessing depth
    if (currentDepth >= maxDepth) {
      console.log(`Maximum reprocessing depth reached (${currentDepth}/${maxDepth})`);
      return false;
    }
    
    // Check if reprocessing criteria are defined
    if (!bot.reprocessingCriteria || bot.reprocessingCriteria.trim() === '') {
      console.log('No reprocessing criteria specified');
      return false;
    }
    
    // Evaluate content against the criteria
    const shouldReprocess = await LLMService.evaluateWithCriteria(
      content,
      bot.reprocessingCriteria,
      bot.model
    );
    
    if (shouldReprocess) {
      console.log(`Content needs reprocessing based on criteria: "${bot.reprocessingCriteria}"`);
    } else {
      console.log(`Content meets quality standards for criteria: "${bot.reprocessingCriteria}"`);
    }
    
    return shouldReprocess;
  }
  
  /**
   * Determines if reprocessing is enabled for a specific bot
   * 
   * @param bot - The bot to check
   * @returns Boolean indicating if reprocessing is enabled
   */
  static isReprocessingEnabled(bot: Bot): boolean {
    return (
      bot.enableReprocessing === true && 
      !!bot.reprocessingCriteria &&
      bot.reprocessingCriteria.trim() !== ''
    );
  }
} 