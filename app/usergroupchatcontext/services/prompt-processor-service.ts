'use client';

import { Bot } from '../types';
import { Message, createBotMessage } from '../types/messages';
import { GroupChatSettings } from '../types/settings';
import { getMockBotResponse } from './mockBotService';

export interface ProcessingContext {
  settings: GroupChatSettings;
  messages: Message[];
  currentDepth: number;
}

export interface ProcessedMessageResult {
  content: string;
  metadata: {
    processingTime: number;
    preProcessed: boolean;
    postProcessed: boolean;
    recursionDepth: number;
    originalContent: string;
    modifiedContent: string;
  };
}

// Process the user message before sending to the bot
export async function preProcessMessage(
  message: Message,
  bot: Bot,
  context: ProcessingContext
): Promise<ProcessedMessageResult> {
  const startTime = performance.now();
  
  // Skip if pre-processing is disabled
  if (!context.settings.promptProcessor.preProcessingEnabled) {
    return {
      content: message.content,
      metadata: {
        processingTime: 0,
        preProcessed: false,
        postProcessed: false,
        recursionDepth: context.currentDepth,
        originalContent: message.content,
        modifiedContent: message.content
      }
    };
  }

  // If the bot has a pre-processing prompt, use it
  let processedContent = message.content;
  if (bot.preProcessingPrompt) {
    try {
      // In a real implementation, this would call an LLM API with the preProcessingPrompt
      // For now, we'll just simulate the processing
      processedContent = await simulateProcessing(
        message.content,
        bot.preProcessingPrompt,
        300 // Simulate 300ms delay
      );
    } catch (error) {
      console.error('Error in pre-processing:', error);
      // Fall back to original content
      processedContent = message.content;
    }
  }

  const endTime = performance.now();
  
  return {
    content: processedContent,
    metadata: {
      processingTime: endTime - startTime,
      preProcessed: bot.preProcessingPrompt !== undefined,
      postProcessed: false,
      recursionDepth: context.currentDepth,
      originalContent: message.content,
      modifiedContent: processedContent
    }
  };
}

// Process the bot response before displaying to the user
export async function postProcessMessage(
  botResponse: string,
  originalMessage: Message,
  bot: Bot,
  context: ProcessingContext
): Promise<ProcessedMessageResult> {
  const startTime = performance.now();
  
  // Skip if post-processing is disabled
  if (!context.settings.promptProcessor.postProcessingEnabled) {
    return {
      content: botResponse,
      metadata: {
        processingTime: 0,
        preProcessed: false,
        postProcessed: false,
        recursionDepth: context.currentDepth,
        originalContent: botResponse,
        modifiedContent: botResponse
      }
    };
  }

  // If the bot has a post-processing prompt, use it
  let processedContent = botResponse;
  if (bot.postProcessingPrompt) {
    try {
      // In a real implementation, this would call an LLM API with the postProcessingPrompt
      // For now, we'll just simulate the processing
      processedContent = await simulateProcessing(
        botResponse,
        bot.postProcessingPrompt,
        300 // Simulate 300ms delay
      );
    } catch (error) {
      console.error('Error in post-processing:', error);
      // Fall back to original content
      processedContent = botResponse;
    }
  }

  const endTime = performance.now();
  
  return {
    content: processedContent,
    metadata: {
      processingTime: endTime - startTime,
      preProcessed: false,
      postProcessed: bot.postProcessingPrompt !== undefined,
      recursionDepth: context.currentDepth,
      originalContent: botResponse,
      modifiedContent: processedContent
    }
  };
}

// Check if the message needs recursive processing
export function needsRecursiveProcessing(
  result: ProcessedMessageResult,
  context: ProcessingContext
): boolean {
  // Don't recurse if we've hit the maximum depth
  if (context.currentDepth >= context.settings.promptProcessor.maxRecursionDepth) {
    return false;
  }
  
  // Simple check: if content was modified significantly, consider recursion
  const originalLength = result.metadata.originalContent.length;
  const modifiedLength = result.metadata.modifiedContent.length;
  
  // If length changed by more than 20%, consider it a significant modification
  const changeRatio = Math.abs(modifiedLength - originalLength) / originalLength;
  
  return changeRatio > 0.2;
}

// Helper function to simulate processing delay
async function simulateProcessing(
  content: string,
  prompt: string,
  delay: number
): Promise<string> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // In a real implementation, this would call an LLM API
  // For now, just add a simple prefix to show it was processed
  return `[Processed with "${prompt.substring(0, 20)}..."] ${content}`;
}

// Main function to process messages with recursion control
export async function processMessage(
  userMessage: Message,
  bot: Bot,
  context: ProcessingContext,
  onBotResponse: (botMessage: Message) => void,
  toolOptions?: {
    includeToolCalls?: boolean;
    availableTools?: any[];
  }
): Promise<void> {
  // Pre-process the user message
  const preProcessed = await preProcessMessage(userMessage, bot, context);
  
  // Get response from the mock bot service (in a real app, this would call an LLM API)
  const botResponse = await getMockBotResponse(
    bot, 
    preProcessed.content, 
    context.messages,
    {
      includeToolCalls: toolOptions?.includeToolCalls,
      availableTools: toolOptions?.availableTools
    }
  );
  
  // Post-process the bot response
  const postProcessed = await postProcessMessage(
    botResponse,
    userMessage,
    bot,
    context
  );
  
  // Create the bot message
  const botMessage = createBotMessage(
    bot.id,
    bot.name,
    postProcessed.content,
    bot.avatar
  );
  
  // Add metadata
  botMessage.metadata = {
    processingInfo: {
      preProcessed: preProcessed.metadata.preProcessed,
      postProcessed: postProcessed.metadata.postProcessed,
      recursionDepth: context.currentDepth,
      processingTime: preProcessed.metadata.processingTime + postProcessed.metadata.processingTime,
      originalContent: userMessage.content,
      modifiedContent: postProcessed.content
    }
  };
  
  // Send the bot response
  onBotResponse(botMessage);
  
  // Check if we need to recursively process
  if (needsRecursiveProcessing(postProcessed, context)) {
    // Create a new context with increased depth
    const newContext: ProcessingContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      messages: [...context.messages, botMessage]
    };
    
    // Process recursively after a short delay
    setTimeout(() => {
      processMessage(
        userMessage, 
        bot, 
        newContext, 
        (recursiveMessage) => {
          // Add recursion info to the message
          recursiveMessage.metadata = {
            ...recursiveMessage.metadata,
            processingInfo: {
              ...recursiveMessage.metadata?.processingInfo,
              recursionDepth: newContext.currentDepth
            }
          };
          onBotResponse(recursiveMessage);
        },
        toolOptions
      );
    }, 500);
  }
} 