'use client';

/**
 * PromptTemplateManager - Centralized management of all prompts for consistent formatting
 * 
 * This service follows the single-responsibility principle by:
 * 1. Managing all prompt templates in one place
 * 2. Providing consistent formatting for all prompts
 * 3. Separating prompt creation from processing logic
 */
export class PromptTemplateManager {
  /**
   * Creates a prompt for preprocessing user input
   * 
   * @param userInput - The user input to process
   * @param instructions - The preprocessing instructions
   * @returns A formatted preprocessing prompt
   */
  static createPreprocessingPrompt(instructions: string): string {
    return `${instructions}\n\nYour task is to process the following user input according to the instructions above. Maintain the core meaning but improve clarity and focus.`;
  }
  
  /**
   * Creates a prompt for postprocessing bot responses
   * 
   * @param botResponse - The bot's response to process
   * @param instructions - The postprocessing instructions
   * @returns A formatted postprocessing prompt
   */
  static createPostprocessingPrompt(instructions: string): string {
    return `${instructions}\n\nYour task is to refine the following bot response according to the instructions above. Improve quality while preserving the intended meaning.`;
  }
  
  /**
   * Creates a prompt for evaluating if a response meets specific criteria
   * 
   * @param criteria - The criteria to evaluate against
   * @param response - The response to evaluate
   * @returns A formatted evaluation prompt
   */
  static createEvaluationPrompt(criteria: string, response: string): string {
    return `
You are an evaluation system that determines if a response needs to be regenerated.
Your task is to evaluate if the following response matches the specified criteria.
Only return "true" if the criteria is matched (meaning the response should be regenerated), 
or "false" if it's not matched (meaning the response is good as is).

CRITERIA:
${criteria}

RESPONSE TO EVALUATE:
${response}

Return ONLY "true" or "false" with no other text:
`;
  }
  
  /**
   * Creates a prompt for reprocessing a response to improve it
   * 
   * @param systemPrompt - The original system prompt
   * @param instructions - Instructions for improvement
   * @param previousResponse - The previous response to improve
   * @returns A formatted reprocessing prompt
   */
  static createReprocessingPrompt(
    systemPrompt: string,
    instructions: string | undefined,
    previousResponse: string
  ): string {
    const instructionText = instructions && instructions.trim()
      ? `\n\nYour previous response needs improvement:\n${previousResponse}\n\nPlease address these specific issues:\n${instructions}`
      : `\n\nYour previous response needs improvement:\n${previousResponse}\n\nPlease generate a better response.`;
    
    return `${systemPrompt}${instructionText}`;
  }
  
  /**
   * Creates a system prompt with role and context instructions
   * 
   * @param role - The bot's role description
   * @param contextInstructions - Additional context or constraints
   * @returns A formatted system prompt
   */
  static createSystemPrompt(role: string, contextInstructions?: string): string {
    let prompt = `You are ${role}.`;
    
    if (contextInstructions) {
      prompt += `\n\n${contextInstructions}`;
    }
    
    return prompt;
  }
} 