'use client';

import { Bot, Message, ProcessingMetadata, GroupChatSettings, ToolResult } from '../types';
import { getFallbackBotResponse } from './fallbackBotService';
import { getOpenAIChatResponse } from './openaiChatService';
import { v4 as uuidv4 } from 'uuid';

// Message processing lock to prevent concurrent processing
// This will help prevent duplicate responses when in voice mode
const messageProcessingLocks = new Map<string, boolean>();
// Message correlation tracking
const messageCorrelationMap = new Map<string, string>();

// Helper function to acquire a lock for a specific bot and user message
function acquireProcessingLock(botId: string, messageId: string): boolean {
  const lockKey = `${botId}:${messageId}`;
  if (messageProcessingLocks.has(lockKey)) {
    return false; // Lock already exists
  }
  messageProcessingLocks.set(lockKey, true);
  return true;
}

// Helper function to release a lock
function releaseProcessingLock(botId: string, messageId: string): void {
  const lockKey = `${botId}:${messageId}`;
  messageProcessingLocks.delete(lockKey);
}

// Helper to track message correlation
function trackMessageCorrelation(userMessageId: string, botResponseId: string): void {
  messageCorrelationMap.set(userMessageId, botResponseId);
}

// Helper to check if a response already exists for a user message
function hasExistingResponse(userMessageId: string): boolean {
  return messageCorrelationMap.has(userMessageId);
}

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

// Mock tool execution function that should be imported from the correct service
async function executeToolCalls(toolCalls: any[]): Promise<ToolResult[]> {
  // This is a placeholder - in a real implementation, 
  // this would be imported from toolCallService or similar
  console.warn('Using mock executeToolCalls - replace with actual implementation');
  return toolCalls.map(call => ({
    toolName: call.name,
    input: call.arguments,
    output: { result: `Mock result for ${call.name}` },
    executionTime: 0,
  }));
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
): Promise<void> => {
  // Acquire lock for this bot and message combination
  // This prevents the same message being processed by the same bot multiple times
  if (!acquireProcessingLock(bot.id, userMessage.id)) {
    console.warn(`Message ${userMessage.id} is already being processed by bot ${bot.id}. Skipping duplicate processing.`);
    return;
  }

  // Check if a response already exists for this user message
  if (hasExistingResponse(userMessage.id)) {
    console.warn(`A response already exists for message ${userMessage.id}. Skipping duplicate processing.`);
    releaseProcessingLock(bot.id, userMessage.id);
    return;
  }

  try {
    let content = userMessage.content;
    let processingMetadata: ProcessingMetadata = {
      originalContent: content,
      preProcessed: false,
      postProcessed: false,
      isVoiceGhost: bot.id.startsWith('ghost-') || bot.id.startsWith('voice-'),
      userMessageId: userMessage.id // Track which user message this responds to
    };
    
    // Flag to track if this is a voice message
    const isVoiceMessage = userMessage.type === 'voice';
    
    // Check if this is a voice ghost bot (created for voice mode)
    const isVoiceGhost = processingMetadata.isVoiceGhost;
    
    // Start timing
    const startTime = Date.now();
    
    try {
      // Log the message processing
      console.log(`Processing message for bot ${bot.name}, type: ${userMessage.type}, voice mode: ${isVoiceMessage}, is ghost: ${isVoiceGhost}`);
      
      // Apply pre-processing if:
      // 1. Pre-processing is enabled in settings
      // 2. Bot has a pre-processing prompt
      // 3. Not at max reprocessing depth
      // 4. Not a voice ghost OR voice ghost with pre-processing explicitly enabled
      if (
        context.settings.processing.enablePreProcessing &&
        bot.preProcessingPrompt &&
        context.currentDepth < context.settings.maxReprocessingDepth &&
        (!isVoiceGhost || (context.settings.voiceSettings?.keepPreprocessingHooks === true))
      ) {
        const result = await preProcessMessage(userMessage, bot, context);
        if (result.content !== content) {
          content = result.content;
          processingMetadata.preProcessed = true;
          processingMetadata.preprocessedContent = content;
        }
      } else if (isVoiceGhost) {
        console.log(`Skipping pre-processing for voice ghost bot ${bot.name}`);
      }
      
      // Get messages for context
      const messageHistory = context.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Set up API options based on whether this is a voice message
      let modelToUse = bot.model || 'gpt-4o';
      
      // Check if this is a realtime model and replace it with a standard model for API compatibility
      if (modelToUse.includes('realtime')) {
        console.log(`Converting realtime model ${modelToUse} to gpt-4o for API compatibility`);
        modelToUse = 'gpt-4o';
      }
        
      // Log the model selection
      console.log(`Using model ${modelToUse} for ${isVoiceMessage ? 'voice' : 'text'} message`);
      
      // Process message with OpenAI
      let toolResults: ToolResult[] = [];
      
      try {
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
        
        // Debug log the request body (redact long messages for clarity)
        const debugRequestBody = {
          ...requestBody,
          messages: requestBody.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content.length > 50 ? `${msg.content.substring(0, 50)}...` : msg.content
          }))
        };
        console.log(`Sending request to OpenAI chat API:`, debugRequestBody);
        
        // Make API call
        const response = await fetch('/usergroupchatcontext/api/openai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          // Try to get more details from the error response
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = JSON.stringify(errorData);
            console.error('API error details:', errorData);
          } catch (parseError) {
            console.error('Could not parse error response:', parseError);
          }
          
          throw new Error(`API request failed with status ${response.status}${errorDetails ? `: ${errorDetails}` : ''}`);
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
            tool_call_id: result.toolName // Use toolName instead of id
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
          content = finalData.choices?.[0]?.message?.content || "I couldn't generate a response.";
        } else {
          // Extract the content from a regular response
          content = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
        }
      } catch (error) {
        console.error('Error processing with OpenAI:', error);
        throw error;
      }
      
      // Update metadata
      processingMetadata.modifiedContent = content;
      
      // Create bot response message
      const botResponse: Message = {
        id: uuidv4(),
        content: content,
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
      
      // Track correlation between user message and bot response
      trackMessageCorrelation(userMessage.id, botResponse.id);
      
      // Apply post-processing if enabled and not at max reprocessing depth
      if (
        context.settings.processing.enablePostProcessing &&
        bot.postProcessingPrompt &&
        context.currentDepth < context.settings.maxReprocessingDepth &&
        (!isVoiceGhost || (context.settings.voiceSettings?.keepPostprocessingHooks === true))
      ) {
        const result = await postProcessMessage(botResponse.content, userMessage, bot, context);
        if (result.content !== botResponse.content) {
          botResponse.content = result.content;
          processingMetadata.postProcessed = true;
          processingMetadata.postprocessedContent = result.content;
          
          // Update the metadata in the response
          botResponse.metadata = {
            ...botResponse.metadata,
            processing: processingMetadata
          };
          
          // Check if response needs further reprocessing
          const reprocessingEnabled = (
            context.settings.processing.enablePreProcessing && // Use enablePreProcessing as a fallback since enableReprocessing doesn't exist in GroupChatSettings
            bot.enableReprocessing === true && 
            (!isVoiceGhost || (context.settings.voiceSettings?.keepPreprocessingHooks === true))
          );
          
          if (
            reprocessingEnabled &&
            needsReprocessing(result, bot, context) && 
            context.currentDepth < context.settings.maxReprocessingDepth - 1
          ) {
            processingMetadata.reprocessingDepth = (processingMetadata.reprocessingDepth || 0) + 1;
            // Create new context with increased depth
            const newContext = {
              ...context,
              currentDepth: context.currentDepth + 1,
            };
            
            // Process recursively
            processMessage(userMessage, bot, newContext, onBotResponse, options);
            return;
          }
        }
      } else if (isVoiceGhost) {
        console.log(`Skipping post-processing for voice ghost bot ${bot.name}`);
      }
      
      // Call the onBotResponse callback with the final response
      onBotResponse(botResponse);
      
      // Return the response content
      return;
    } catch (error) {
      console.error(`Error in processMessage for bot ${bot.id}:`, error);
      
      // For voice mode, provide a fallback response rather than failing completely
      if (isVoiceMessage) {
        const errorResponse: Message = {
          id: uuidv4(),
          content: "I'm sorry, I encountered a problem processing your voice input. Please try again or switch to text mode if the issue persists.",
          role: 'assistant',
          sender: bot.id,
          senderName: bot.name,
          timestamp: Date.now(),
          type: 'voice',
          metadata: {
            processing: {
              ...processingMetadata,
              error: error instanceof Error ? error.message : String(error)
            }
          }
        };
        
        // Call the callback with the error response
        onBotResponse(errorResponse);
        
        // Return early
        return;
      }
      
      // For text mode, throw the error to be handled by the caller
      throw error;
    }
  } finally {
    // Always release the lock when done, regardless of success or failure
    releaseProcessingLock(bot.id, userMessage.id);
  }
}; 