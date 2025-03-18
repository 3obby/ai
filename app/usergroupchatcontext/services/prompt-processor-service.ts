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

/**
 * Process a message through the bot's response pipeline
 * Handles pre-processing, API calls, and post-processing
 */
export const processMessage = async (
  userMessage: Message,
  bot: Bot,
  context: ProcessingContext,
  onBotResponse: (botResponse: Message) => void,
  options: {
    includeToolCalls?: boolean;
    availableTools?: any[];
  } = {}
) => {
  let content = userMessage.content;
  let processingMetadata: ProcessingMetadata = {
    originalContent: content,
    preProcessed: false,
    postProcessed: false,
    fromVoiceMode: userMessage.type === 'voice'
  };
  
  // Log the message processing
  console.log(`Processing message for bot ${bot.name}, type: ${userMessage.type}, voice mode: ${userMessage.type === 'voice'}`);
  
  // Apply pre-processing if enabled and not at max reprocessing depth
  if (
    context.settings.processing.enablePreProcessing &&
    bot.preProcessingPrompt &&
    context.currentDepth < context.settings.maxReprocessingDepth
  ) {
    const preprocessedContent = await preProcessMessage(userMessage, bot, context);
    if (preprocessedContent !== content) {
      content = preprocessedContent;
      processingMetadata.preProcessed = true;
      processingMetadata.preprocessedContent = content;
    }
  }
  
  // Get messages for context
  const messageHistory = context.messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  // Set up API options based on whether this is a voice message
  const isVoiceMessage = userMessage.type === 'voice';
  const modelToUse = isVoiceMessage && bot.voiceSettings?.model ? 
    bot.voiceSettings.model : 
    bot.model || 'gpt-4o';
    
  // Log the model selection
  console.log(`Using model ${modelToUse} for ${isVoiceMessage ? 'voice' : 'text'} message`);
  
  // Make API call to OpenAI
  let apiResponseContent = '';
  let toolResults: ToolResult[] = [];
  
  try {
    if (process.env.NEXT_PUBLIC_USE_MOCK_SERVICE === 'true') {
      // Use mock service for testing/dev
      const { content: mockContent } = await getMockBotResponse(content, bot.name);
      apiResponseContent = mockContent;
      processingMetadata.usedMockService = true;
    } else {
      // Prepare request body
      let requestBody: any = {
        messages: [...messageHistory, { role: 'user', content }],
        model: modelToUse,
        temperature: bot.temperature || 0.7,
        max_tokens: bot.maxTokens || 1024
      };
      
      // Add tools if enabled and not a voice message
      if (options.includeToolCalls && bot.useTools && !isVoiceMessage) {
        requestBody.tools = options.availableTools || [];
      }
      
      // Make API call
      const response = await fetch('/usergroupchatcontext/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if response includes tool calls
      if (data.choices?.[0]?.message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
        // Extract tool calls and execute them
        const formattedToolCalls = data.choices[0].message.tool_calls.map((call: any) => ({
          id: call.id,
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments)
        }));
        
        // Execute tool calls and get results
        toolResults = await executeToolCalls(formattedToolCalls);
        
        // Add tool results to the message history for a follow-up completion
        const toolResponseMessages = toolResults.map(result => ({
          role: 'tool' as const,
          content: JSON.stringify(result.output),
          tool_call_id: result.id
        }));
        
        // Get final response that includes tool outputs
        const finalResponse = await fetch('/usergroupchatcontext/api/openai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...messageHistory, 
              { role: 'user', content },
              ...toolResponseMessages
            ],
            model: modelToUse,
            temperature: bot.temperature || 0.7,
            max_tokens: bot.maxTokens || 1024,
          }),
        });
        
        if (!finalResponse.ok) {
          throw new Error(`Final API request failed with status ${finalResponse.status}`);
        }
        
        const finalData = await finalResponse.json();
        apiResponseContent = finalData.choices?.[0]?.message?.content || "I couldn't generate a response.";
      } else {
        // Extract the content from a regular response
        apiResponseContent = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
      }
    }
    
    // Update metadata
    processingMetadata.modifiedContent = apiResponseContent;
    
    // Apply post-processing if enabled and not at max reprocessing depth
    if (
      context.settings.processing.enablePostProcessing &&
      bot.postProcessingPrompt &&
      context.currentDepth < context.settings.maxReprocessingDepth &&
      !isVoiceMessage // Skip post-processing for voice messages
    ) {
      const postprocessedContent = await postProcessMessage(apiResponseContent, userMessage, bot, context);
      if (postprocessedContent !== apiResponseContent) {
        apiResponseContent = postprocessedContent;
        processingMetadata.postProcessed = true;
        processingMetadata.postprocessedContent = apiResponseContent;
      }
    }
    
    // Create bot response message
    const botResponse: Message = {
      id: uuidv4(),
      content: apiResponseContent,
      role: 'assistant',
      sender: bot.id,
      senderName: bot.name,
      timestamp: Date.now(),
      type: isVoiceMessage ? 'voice' : 'text', // Mark voice responses accordingly
      metadata: {
        processing: processingMetadata,
        toolResults
      }
    };
    
    // Call the callback with the bot response
    onBotResponse(botResponse);
    
    // Return the response content
    return apiResponseContent;
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
} 