'use client';

import { useGroupChatContext } from '../context/GroupChatContext';
import { v4 as uuidv4 } from 'uuid';

export function useGroupChat() {
  const context = useGroupChatContext();
  
  if (!context) {
    throw new Error('useGroupChat must be used within a GroupChatProvider');
  }
  
  const { state, dispatch } = context;
  
  // Helper function to send a user message
  const sendMessage = (content: string) => {
    if (!content.trim()) return;
    
    // Create a user message
    const userMessage = {
      id: uuidv4(),
      content: content.trim(),
      role: 'user' as const,
      sender: 'user',
      senderName: 'You',
      timestamp: Date.now(),
      type: 'text' as const
    };
    
    // Add the message to the chat
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    
    // Set loading state
    dispatch({ type: 'SET_LOADING', isLoading: true });
    
    // Trigger bot responses
    // Get active bot IDs from settings
    const activeBotIds = state.settings?.activeBotIds || [];
    
    // If no active bots, just end processing
    if (activeBotIds.length === 0) {
      console.warn("No active bots configured to respond");
      dispatch({ type: 'SET_LOADING', isLoading: false });
      return;
    }
    
    // Simulate responses from each active bot with slight delay between them
    let delay = 1000;
    
    activeBotIds.forEach((botId, index) => {
      // Set typing indicator for this bot
      setTimeout(() => {
        dispatch({ type: 'SET_TYPING_BOT_IDS', payload: [...state.typingBotIds, botId] });
        
        // After a short delay, add the bot's response
        setTimeout(() => {
          // Create a response message
          const botResponse = {
            id: uuidv4(),
            content: `This is a simulated response from ${botId} to: "${content}"`,
            role: 'assistant' as const,
            sender: botId,
            senderName: botId.charAt(0).toUpperCase() + botId.slice(1),
            timestamp: Date.now(),
            type: 'text' as const
          };
          
          // Add the bot's message
          dispatch({ type: 'ADD_MESSAGE', payload: botResponse });
          
          // Remove typing indicator
          dispatch({ 
            type: 'SET_TYPING_BOT_IDS', 
            payload: state.typingBotIds.filter(id => id !== botId)
          });
          
          // If this is the last bot, end processing
          if (index === activeBotIds.length - 1) {
            dispatch({ type: 'SET_LOADING', isLoading: false });
          }
        }, 1500); // Time to "type" the message
      }, delay);
      
      delay += 800; // Stagger the start of typing for each bot
    });
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
  const isProcessing = state.isLoading;
  
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