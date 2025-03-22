'use client';

import { PromptTemplateManager } from './PromptTemplateManager';

/**
 * LLMService - Centralized service for all LLM API calls
 * 
 * This service follows the single-responsibility principle by:
 * 1. Handling all API interactions with language models
 * 2. Centralizing error handling for API calls
 * 3. Providing a consistent interface for all LLM operations
 */
export class LLMService {
  /**
   * Process content with an LLM using the provided prompt
   * 
   * @param content - The user message or content to process
   * @param prompt - The system prompt to guide the LLM
   * @param model - The model identifier to use (e.g., 'gpt-4o')
   * @returns Promise resolving to the LLM's response
   */
  static async processWithLLM(
    content: string,
    prompt: string,
    model: string
  ): Promise<string> {
    // Prepare message format for OpenAI API
    const messages = [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content
      }
    ];
    
    try {
      // Call the OpenAI API through our endpoint
      const response = await fetch('/usergroupchatcontext/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages,
          temperature: 0.3,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content || content;
      } else {
        throw new Error('No response content received from OpenAI');
      }
    } catch (error) {
      console.error('Error processing with LLM:', error);
      throw error;
    }
  }
  
  /**
   * Evaluate a response against criteria using an LLM
   * 
   * @param responseContent - The content to evaluate
   * @param criteria - The criteria to evaluate against
   * @param model - The model to use for evaluation
   * @returns Promise resolving to a boolean indicating if criteria is met
   */
  static async evaluateWithCriteria(
    responseContent: string,
    criteria: string,
    model: string
  ): Promise<boolean> {
    // Handle special test cases for easy testing
    if (['yes', 'true', 'always'].includes(criteria.trim().toLowerCase())) {
      console.log('Always returning true due to criteria being "yes"/"true"/"always"');
      return true;
    }
    
    // Use PromptTemplateManager to create the evaluation prompt
    const evaluationPrompt = PromptTemplateManager.createEvaluationPrompt(criteria, responseContent);
    
    try {
      const evaluationResult = await this.processWithLLM(
        responseContent,
        evaluationPrompt,
        model
      );
      
      // Parse the result, which should be just "true" or "false"
      const normalizedResult = evaluationResult.trim().toLowerCase();
      const shouldReprocess = normalizedResult.includes('true');
      
      console.log(`Evaluation result for criteria "${criteria}": ${shouldReprocess ? 'true' : 'false'}`);
      return shouldReprocess;
    } catch (error) {
      console.error('Error during evaluation:', error);
      return false; // Default to false on error
    }
  }
  
  /**
   * Generate an improved response based on previous content and instructions
   * 
   * @param originalContent - The original response to improve
   * @param systemPrompt - The base system prompt
   * @param instructions - Instructions for improvement
   * @param model - The model to use
   * @returns Promise resolving to the improved response
   */
  static async generateImprovedResponse(
    originalContent: string,
    systemPrompt: string,
    instructions: string | undefined,
    model: string
  ): Promise<string> {
    // Use PromptTemplateManager to create the reprocessing prompt
    const improvedPrompt = PromptTemplateManager.createReprocessingPrompt(
      systemPrompt, 
      instructions, 
      originalContent
    );
    
    return await this.processWithLLM(
      "Please improve your previous response",
      improvedPrompt,
      model
    );
  }
  
  /**
   * Preprocess user input with instructions
   * 
   * @param userInput - The user input to preprocess
   * @param instructions - The preprocessing instructions
   * @param model - The model to use
   * @returns Promise resolving to the preprocessed input
   */
  static async preprocessUserInput(
    userInput: string,
    instructions: string,
    model: string
  ): Promise<string> {
    // Use PromptTemplateManager to create the preprocessing prompt
    const preprocessingPrompt = PromptTemplateManager.createPreprocessingPrompt(instructions);
    
    return await this.processWithLLM(
      userInput,
      preprocessingPrompt,
      model
    );
  }
  
  /**
   * Postprocess a bot response with instructions
   * 
   * @param botResponse - The bot response to postprocess
   * @param instructions - The postprocessing instructions
   * @param model - The model to use
   * @returns Promise resolving to the postprocessed response
   */
  static async postprocessBotResponse(
    botResponse: string,
    instructions: string,
    model: string
  ): Promise<string> {
    // Use PromptTemplateManager to create the postprocessing prompt
    const postprocessingPrompt = PromptTemplateManager.createPostprocessingPrompt(instructions);
    
    return await this.processWithLLM(
      botResponse,
      postprocessingPrompt,
      model
    );
  }
} 