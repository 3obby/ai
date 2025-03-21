'use client';

import { useGroupChatContext } from '../context/GroupChatContext';
import { useBotRegistry } from '../context/BotRegistryProvider';
import { v4 as uuidv4 } from 'uuid';
import { getFallbackBotResponse } from '../services/fallbackBotService';
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
    
    // Create a user message with unique ID for correlation
    const messageId = uuidv4();
    const userMessage = {
      id: messageId,
      content: content.trim(),
      role: 'user' as const,
      sender: 'user',
      senderName: 'You',
      timestamp: Date.now(),
      type: messageType,
      metadata: {
        processing: {
          originalContent: content.trim(),
          fromVoiceMode: messageType === 'voice'
        }
      }
    };
    
    console.log(`Sending ${messageType} message: "${content.trim().substring(0, 30)}..."`);
    
    // Add the message to the chat
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    
    // Set processing state
    dispatch({ type: 'SET_PROCESSING', payload: true });
    
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
    
    try {
      // Get the current voice mode state to implement strict mode-based routing
      const isInVoiceMode = state.settings?.voiceSettings?.modality === 'audio' ||
        (state.isRecording === true); // Fallback check
      
      // STRICT MODE-BASED MESSAGE ROUTING:
      // 1. Text messages should only be handled by regular bots (not voice ghosts)
      // 2. Voice messages in voice mode should only be handled by voice ghosts
      // This prevents duplicate processing and ensures clear responsibilities
      
      // Process responses for each active bot sequentially
      for (const botId of activeBotIds) {
        // Get the bot from the registry
        const bot = botRegistry.getBot(botId);
        
        if (!bot) {
          console.warn(`Bot with ID ${botId} not found in registry`);
          continue;
        }
        
        // Implement strict mode-based routing
        const isVoiceGhost = bot.id.startsWith('ghost-') || bot.id.startsWith('voice-');
        
        // Skip voice ghosts for text messages and vice versa
        if ((isVoiceMessage && isInVoiceMode && !isVoiceGhost) || 
            (isVoiceMessage && !isInVoiceMode && isVoiceGhost) ||
            (!isVoiceMessage && isVoiceGhost)) {
          console.log(`Skipping bot ${bot.id} due to mode mismatch. Voice message: ${isVoiceMessage}, Voice mode: ${isInVoiceMode}, Voice ghost: ${isVoiceGhost}`);
          continue;
        }
        
        // Add cooldown for voice outputs to prevent rapid responses
        if (isVoiceMessage && isVoiceGhost) {
          // Check if we need to add a small delay between voice responses
          const lastVoiceResponseTime = state.messages
            .filter(m => m.type === 'voice' && m.role === 'assistant')
            .map(m => m.timestamp)
            .sort((a, b) => b - a)[0] || 0;
          
          const timeSinceLastVoice = Date.now() - lastVoiceResponseTime;
          if (lastVoiceResponseTime > 0 && timeSinceLastVoice < 800) {
            // Add a small delay to prevent responses from stepping on each other
            await new Promise(resolve => setTimeout(resolve, 800 - timeSinceLastVoice));
          }
        }
        
        // Set typing indicator for this bot
        dispatch({ type: 'SET_TYPING_BOT_IDS', payload: [...state.typingBotIds, botId] });
        
        try {
          // For voice messages, we need to use a different processing path
          // that takes advantage of the real-time voice models
          if (isVoiceMessage) {
            // Make a direct API call for voice messages using the LiveKitIntegrationProvider
            // The generateBotResponse will handle selecting the appropriate voice model
            const processingContext: ProcessingContext = {
              settings: state.settings,
              messages: state.messages,
              currentDepth: 0
            };
            
            // Process the message through the voice-optimized path
            await processMessage(
              userMessage,
              bot,
              processingContext,
              (botResponse) => {
                // Ensure the response is marked as a voice response
                const voiceResponse = {
                  ...botResponse,
                  metadata: {
                    ...(botResponse.metadata || {}),
                    processing: {
                      ...(botResponse.metadata?.processing || {}),
                      fromVoiceMode: true
                    }
                  }
                };
                
                // Add the bot's message to the chat
                dispatch({ type: 'ADD_MESSAGE', payload: voiceResponse });
              },
              { 
                includeToolCalls: false // Disable tool calls for voice messages for now
              }
            );
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
          // Remove typing indicator for this bot
          dispatch({ 
            type: 'SET_TYPING_BOT_IDS', 
            payload: state.typingBotIds.filter(id => id !== botId)
          });
        }
      }
    } finally {
      // Ensure typing indicators are completely cleared at the end
      // This prevents the typing indicator from getting stuck
      dispatch({ type: 'SET_TYPING_BOT_IDS', payload: [] });
      
      // End processing
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
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