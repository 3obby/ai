'use client';

import { Bot } from '../../types';
import { BaseEvaluationStrategy } from './EvaluationStrategy';
import { moderatorBotService } from '../ModeratorBotService';

/**
 * Strategy that uses the ModeratorBot to evaluate content
 */
export class ModeratorBotStrategy extends BaseEvaluationStrategy {
  constructor() {
    super('moderator-bot');
  }
  
  canEvaluate(criteria: string, _content: string): boolean {
    // Check if the moderator bot is enabled
    return moderatorBotService.getSettings().enabled;
  }
  
  async evaluate(content: string, criteria: string, bot: Bot): Promise<boolean> {
    console.log('ModeratorBotStrategy: Evaluating response using moderator bot');
    
    try {
      // Use moderator bot's settings first if available, otherwise use the provided criteria
      const effectiveCriteria = moderatorBotService.getSettings().criteria || criteria;
      
      // If the moderator has no criteria, fall back to the bot's criteria
      if (!effectiveCriteria || effectiveCriteria.trim() === '') {
        console.log('ModeratorBotStrategy: No moderator criteria available, using bot criteria');
        return await moderatorBotService.evaluateResponse(content, criteria, bot.model);
      }
      
      // Use the moderator bot to evaluate
      console.log('ModeratorBotStrategy: Using moderator criteria:', effectiveCriteria);
      return await moderatorBotService.evaluateResponse(
        content, 
        effectiveCriteria, 
        moderatorBotService.getSettings().model
      );
    } catch (error) {
      console.error('ModeratorBotStrategy: Error in evaluation:', error);
      return false; // Default to false on error
    }
  }
} 