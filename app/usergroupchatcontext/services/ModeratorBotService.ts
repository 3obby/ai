'use client';

import { Bot } from '../types';

/**
 * Service for evaluating bot responses against criteria using a "moderator bot"
 */
export class ModeratorBotService {
  private static instance: ModeratorBotService;
  private moderatorSettings: ModeratorSettings = {
    enabled: true,
    criteria: '',
    instructions: '',
    model: 'gpt-4o'
  };

  /**
   * Get the singleton instance
   */
  public static getInstance(): ModeratorBotService {
    if (!this.instance) {
      this.instance = new ModeratorBotService();
    }
    return this.instance;
  }

  /**
   * Update the moderator settings
   */
  public updateSettings(settings: Partial<ModeratorSettings>): void {
    this.moderatorSettings = {
      ...this.moderatorSettings,
      ...settings
    };
  }

  /**
   * Get the current moderator settings
   */
  public getSettings(): ModeratorSettings {
    return { ...this.moderatorSettings };
  }

  /**
   * Evaluate if a bot response should be reprocessed based on user-defined criteria
   */
  public async evaluateResponse(
    responseContent: string,
    criteria: string,
    model: string = this.moderatorSettings.model
  ): Promise<boolean> {
    if (!criteria || criteria.trim() === '') {
      return false;
    }
    
    // Handle special test cases for quick testing
    if (['yes', 'true', 'always'].includes(criteria.trim().toLowerCase())) {
      console.log('ModeratorBot: Always reprocessing due to criteria being "yes"/"true"/"always"');
      return true;
    }

    const prompt = `
You are a moderator bot that evaluates if a response meets specific criteria.
Your task is to evaluate if the following response matches the specified criteria.
Only return "true" if the criteria is matched (meaning the response should be regenerated), 
or "false" if it's not matched (meaning the response is good as is).

CRITERIA:
${criteria}

RESPONSE TO EVALUATE:
${responseContent}

Return ONLY "true" or "false" with no other text:
`;

    try {
      const evaluationResult = await this.processWithLLM(
        responseContent,
        prompt,
        model
      );
      
      // Parse the result, which should be just "true" or "false"
      const normalizedResult = evaluationResult.trim().toLowerCase();
      const shouldReprocess = normalizedResult.includes('true');
      
      console.log(`ModeratorBot: Evaluation result for criteria "${criteria}": ${shouldReprocess ? 'WILL reprocess' : 'will NOT reprocess'}`);
      return shouldReprocess;
    } catch (error) {
      console.error('ModeratorBot: Error evaluating criteria:', error);
      return false; // Default to not reprocessing if evaluation fails
    }
  }

  /**
   * Process content with LLM using the provided prompt
   */
  private async processWithLLM(
    content: string,
    prompt: string,
    model: string
  ): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: content
      }
    ];
    
    try {
      const response = await fetch('/usergroupchatcontext/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages,
          temperature: 0.3,
          max_tokens: 50
        })
      });
      
      if (!response.ok) {
        throw new Error(`ModeratorBot API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content || content;
      } else {
        throw new Error('No response content received from ModeratorBot');
      }
    } catch (error) {
      console.error('ModeratorBot: Error processing with LLM:', error);
      throw error;
    }
  }
}

/**
 * Moderator bot settings interface
 */
export interface ModeratorSettings {
  enabled: boolean;
  criteria: string;
  instructions: string;
  model: string;
}

// Export singleton instance
export const moderatorBotService = ModeratorBotService.getInstance(); 