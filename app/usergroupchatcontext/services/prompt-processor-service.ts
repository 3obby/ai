'use client';

import { Bot, Message, ProcessingMetadata, GroupChatSettings } from '../types';
import { getMockBotResponse } from './mockBotService';
import { getOpenAIChatResponse } from './openaiChatService';
import { v4 as uuidv4 } from 'uuid';

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
    reprocessingDepth: number;
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
  if (!context.settings.processing?.enablePreProcessing) {
    return {
      content: message.content,
      metadata: {
        processingTime: 0,
        preProcessed: false,
        postProcessed: false,
        reprocessingDepth: context.currentDepth,
        originalContent: message.content,
        modifiedContent: message.content
      }
    };
  }

  // If the bot has a pre-processing prompt, use it
  let processedContent = message.content;
  if (bot.preProcessingPrompt) {
    try {
      processedContent = await processWithLLM(
        message.content,
        bot.preProcessingPrompt,
        bot.model
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
      reprocessingDepth: context.currentDepth,
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
  
  // Get the post-processing prompt - either from bot configuration or group settings
  const postProcessingPrompt = bot.postProcessingPrompt || 
    (context.settings.processing?.enablePostProcessing ? context.settings.processing.postProcessingPrompt : undefined);
  
  // Skip if post-processing is disabled or no prompt exists
  if (!postProcessingPrompt) {
    return {
      content: botResponse,
      metadata: {
        processingTime: 0,
        preProcessed: false,
        postProcessed: false,
        reprocessingDepth: context.currentDepth,
        originalContent: botResponse,
        modifiedContent: botResponse
      }
    };
  }

  // Process the content with the post-processing prompt
  let processedContent = botResponse;
  try {
    console.log("Applying post-processing with prompt:", postProcessingPrompt);
    processedContent = await processWithLLM(
      botResponse,
      postProcessingPrompt,
      bot.model
    );
  } catch (error) {
    console.error('Error in post-processing:', error);
    // Fall back to original content
    processedContent = botResponse;
  }

  const endTime = performance.now();
  
  return {
    content: processedContent,
    metadata: {
      processingTime: endTime - startTime,
      preProcessed: false,
      postProcessed: true,
      reprocessingDepth: context.currentDepth,
      originalContent: botResponse,
      modifiedContent: processedContent
    }
  };
}

// Check if the message needs reprocessing
export function needsReprocessing(
  result: ProcessedMessageResult,
  bot: Bot,
  context: ProcessingContext
): boolean {
  // First, check if reprocessing is enabled for this bot
  if (bot.enableReprocessing === false) {
    return false;
  }
  
  // Don't reprocess if we've hit the maximum depth
  if (context.currentDepth >= context.settings.maxReprocessingDepth) {
    return false;
  }
  
  // Simple check: if content was modified significantly, consider reprocessing
  const originalLength = result.metadata.originalContent.length;
  const modifiedLength = result.metadata.modifiedContent.length;
  
  // If length changed by more than 20%, consider it a significant modification
  const changeRatio = Math.abs(modifiedLength - originalLength) / originalLength;
  
  return changeRatio > 0.2;
}

// Process content with LLM using the provided prompt
async function processWithLLM(
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
      content: content
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

// Main function to process messages with reprocessing control
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
  
  // Get response from the OpenAI API, falling back to mock service if needed
  let botResponse;
  try {
    botResponse = await getOpenAIChatResponse(
      bot,
      preProcessed.content,
      context.messages,
      {
        includeToolCalls: toolOptions?.includeToolCalls,
        availableTools: toolOptions?.availableTools
      }
    );
  } catch (error) {
    console.error("Error calling OpenAI, falling back to mock:", error);
    // Fall back to mock service if there's an error with OpenAI
    botResponse = await getMockBotResponse(
      bot, 
      preProcessed.content, 
      context.messages,
      {
        includeToolCalls: toolOptions?.includeToolCalls,
        availableTools: toolOptions?.availableTools
      }
    );
  }
  
  // Post-process the bot response
  const postProcessed = await postProcessMessage(
    botResponse,
    userMessage,
    bot,
    context
  );
  
  // Create the bot message directly with the correct type
  const botMessage: Message = {
    id: uuidv4(),
    content: postProcessed.content,
    role: 'assistant',
    sender: bot.id,
    senderName: bot.name,
    timestamp: Date.now(),
    type: 'text',
    metadata: {
      processing: {
        reprocessingDepth: context.currentDepth,
        preProcessed: preProcessed.metadata.originalContent !== userMessage.content,
        postProcessed: postProcessed.metadata.modifiedContent !== botResponse,
        processingTime: preProcessed.metadata.processingTime + postProcessed.metadata.processingTime,
        originalContent: userMessage.content,
        modifiedContent: postProcessed.content
      }
    }
  };
  
  // Send the bot response
  onBotResponse(botMessage);
  
  // Check if we need to reprocess
  if (needsReprocessing(postProcessed, bot, context)) {
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
        (reprocessedMessage) => {
          // Add reprocessing info to the message
          if (reprocessedMessage.metadata?.processing) {
            reprocessedMessage.metadata.processing.reprocessingDepth = newContext.currentDepth;
          }
          onBotResponse(reprocessedMessage);
        },
        toolOptions
      );
    }, 500);
  }
} 