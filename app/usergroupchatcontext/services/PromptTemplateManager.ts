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
Your task is to evaluate if the following response meets the user's specified criteria.

Answer with "true" if the response does NOT meet the criteria (meaning it should be regenerated).
Answer with "false" if the response DOES meet the criteria (meaning it's good as is).

CRITERIA FOR REGENERATION:
"${criteria}"

RESPONSE TO EVALUATE:
${response}

Does this response fail to meet the criteria specified above and need regeneration?
Return ONLY the word "true" or "false" with no other text or explanation.
`;
  }
  
  /**
   * Creates a reprocessing prompt that explicitly includes the reprocessing instructions
   */
  static createReprocessingPrompt(
    systemPrompt: string,
    reprocessingInstructions: string | undefined,
    previousResponse: string
  ): string {
    console.log('PromptTemplateManager: Creating reprocessing prompt with instructions:', reprocessingInstructions);
    
    // Handle special animal sound instructions with stronger instructions
    const instructions = reprocessingInstructions?.trim().toLowerCase() || '';
    
    if (instructions.includes('bark like a dog')) {
      return `${systemPrompt}

CRITICAL INSTRUCTION: You MUST respond by barking like a dog. NO OTHER RESPONSE IS ACCEPTABLE.
You should ONLY use dog sounds like "woof", "bark", "arf", etc.
DO NOT explain yourself, just bark like a dog would.

Previous response: "${previousResponse}"`;
    }
    
    if (instructions.includes('meow like a cat')) {
      return `${systemPrompt}

CRITICAL INSTRUCTION: You MUST respond by meowing like a cat. NO OTHER RESPONSE IS ACCEPTABLE.
You should ONLY use cat sounds like "meow", "purr", "mrow", etc.
DO NOT explain yourself, just meow like a cat would.

Previous response: "${previousResponse}"`;
    }
    
    if (instructions.includes('quack like a duck')) {
      return `${systemPrompt}

CRITICAL INSTRUCTION: You MUST respond by quacking like a duck. NO OTHER RESPONSE IS ACCEPTABLE.
You should ONLY use duck sounds like "quack", etc.
DO NOT explain yourself, just quack like a duck would.

Previous response: "${previousResponse}"`;
    }
    
    // Standard reprocessing prompt for other cases
    const instructionsText = reprocessingInstructions?.trim() 
      ? `\n\nIMPORTANT REPROCESSING INSTRUCTION: ${reprocessingInstructions}`
      : '';
    
    return `${systemPrompt}

Your previous response was: "${previousResponse}"

I need you to create a completely new response.${instructionsText}`;
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