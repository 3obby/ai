'use client';

import { useGroupChatContext } from '../context/GroupChatContext';
import { useBotRegistry } from '../context/BotRegistryProvider';
import { v4 as uuidv4 } from 'uuid';
import { getMockBotResponse } from '../services/mockBotService';
import { processMessage, ProcessingContext } from '../services/prompt-processor-service';
import { GroupChatSettings } from '../types';

export function useRealGroupChat() {
  const context = useGroupChatContext();
  const botRegistry = useBotRegistry();
  
  if (!context) {
    throw new Error('useRealGroupChat must be used within a GroupChatProvider');
  }
  
  const { state, dispatch } = context;
  
  // Helper function to send a user message
  const sendMessage = async (content: string, messageType: 'text' | 'voice' = 'text') => {
    if (!content.trim()) return;
    
    // Create a user message
    const userMessage = {
      id: uuidv4(),
      content: content.trim(),
      role: 'user' as const,
      sender: 'user',
      senderName: 'You',
      timestamp: Date.now(),
      type: messageType
    };
    
    // Add the message to the chat
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    
    // Set processing state
    dispatch({ type: 'SET_PROCESSING', payload: true });
    
    // Trigger bot responses
    // Get active bot IDs from settings
    const activeBotIds = state.settings?.activeBotIds || [];
    
    // If no active bots, just end processing
    if (activeBotIds.length === 0) {
      console.warn("No active bots configured to respond");
      dispatch({ type: 'SET_PROCESSING', payload: false });
      return;
    }
    
    // Check if this is a voice message - we'll handle it differently
    const isVoiceMessage = messageType === 'voice';
    
    // Process responses for each active bot sequentially
    for (const botId of activeBotIds) {
      const bot = botRegistry.getBot(botId);
      
      if (!bot) {
        console.warn(`Bot with ID ${botId} not found in registry`);
        continue;
      }
      
      // Set typing indicator for this bot
      dispatch({ type: 'SET_TYPING_BOT_IDS', payload: [...state.typingBotIds, botId] });
      
      try {
        // For voice messages, we'll bypass the normal processing pipeline to avoid delays
        if (isVoiceMessage) {
          // Make a direct API call for voice messages
          try {
            // Get history/context from previous messages
            const messageHistory = state.messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }));
            
            // Make direct API call to OpenAI
            const response = await fetch('/usergroupchatcontext/api/openai/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [...messageHistory, { role: 'user', content }],
                model: bot.model || 'gpt-4o',
                temperature: bot.temperature || 0.7,
                max_tokens: bot.maxTokens || 1024,
              }),
            });
            
            if (!response.ok) {
              throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Voice API response data:', data);
            
            // Extract the content from the OpenAI response structure
            const responseContent = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
            
            // Create bot response message
            const botResponse = {
              id: uuidv4(),
              content: responseContent,
              role: 'assistant' as const,
              sender: botId,
              senderName: bot.name,
              timestamp: Date.now(),
              type: 'text' as const,
              metadata: {
                processing: {
                  originalContent: responseContent,
                  preProcessed: false,
                  postProcessed: false,
                  fromVoiceMode: true
                }
              }
            };
            
            // Add the bot's message to the chat
            dispatch({ type: 'ADD_MESSAGE', payload: botResponse });
          } catch (apiError) {
            console.error(`Error getting direct response from OpenAI for bot ${botId}:`, apiError);
            throw apiError; // Propagate to the outer catch block
          }
        } else {
          // Normal text message processing with pre/post processing pipeline
          // Create processing context that matches the expected type
          const processingContext: ProcessingContext = {
            settings: state.settings,
            messages: state.messages,
            currentDepth: 0
          };
          
          // Process the message with pre/post processing applied
          await processMessage(
            userMessage,
            bot,
            processingContext,
            (botResponse) => {
              // Add the bot's message to the chat
              dispatch({ type: 'ADD_MESSAGE', payload: botResponse });
            },
            { includeToolCalls: bot.useTools }
          );
        }
      } catch (error) {
        console.error(`Error getting response from bot ${botId}:`, error);
        
        // Create an error message if the bot fails to respond
        const errorResponse = {
          id: uuidv4(),
          content: "Sorry, I encountered an error while processing your request.",
          role: 'assistant' as const,
          sender: botId,
          senderName: bot.name,
          timestamp: Date.now(),
          type: 'text' as const
        };
        
        dispatch({ type: 'ADD_MESSAGE', payload: errorResponse });
      } finally {
        // Remove typing indicator
        dispatch({ 
          type: 'SET_TYPING_BOT_IDS', 
          payload: state.typingBotIds.filter(id => id !== botId)
        });
      }
    }
    
    // End processing
    dispatch({ type: 'SET_PROCESSING', payload: false });
  };
  
  // Helper function to reset the chat
  const resetChat = () => {
    dispatch({ type: 'RESET_CHAT' });
  };
  
  // Helper function to update settings
  const updateSettings = (settings: any) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  };
  
  // Computed property for whether the system is processing
  const isProcessing = state.isProcessing || state.isLoading;
  
  return {
    // State
    state,
    messages: state.messages,
    isProcessing,
    
    // Actions
    dispatch,
    sendMessage,
    resetChat,
    updateSettings,
  };
} 