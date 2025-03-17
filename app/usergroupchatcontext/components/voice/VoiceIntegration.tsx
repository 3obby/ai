'use client';

import React, { useEffect, useCallback } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../../types';
import { useBotRegistry } from '../../context/BotRegistryProvider';

/**
 * VoiceIntegration connects the LiveKit voice services to the chat message flow
 * It handles:
 * 1. Converting transcriptions to user messages
 * 2. Converting bot responses to speech synthesis
 * 3. Coordinating conversation turns between user and bots
 */
export default function VoiceIntegration() {
  const { state, dispatch } = useGroupChatContext();
  const { state: botRegistryState } = useBotRegistry();
  const { 
    isListening, 
    isBotSpeaking, 
    currentSpeakingBotId,
    playBotResponse
  } = useLiveKitIntegration();
  
  const { settings } = state;
  const isVoiceEnabled = settings.ui?.enableVoice;
  
  // Update UI state based on LiveKit integration state
  useEffect(() => {
    if (!isVoiceEnabled) return;
    
    // Update recording state if it doesn't match LiveKit state
    if (state.isRecording !== isListening) {
      dispatch({ type: 'TOGGLE_RECORDING' });
    }
    
    // Update typing bots if a bot is speaking
    if (isBotSpeaking && currentSpeakingBotId) {
      if (!state.typingBotIds.includes(currentSpeakingBotId)) {
        dispatch({ 
          type: 'SET_TYPING_BOT_IDS', 
          payload: [...state.typingBotIds, currentSpeakingBotId] 
        });
      }
    } else if (currentSpeakingBotId && state.typingBotIds.includes(currentSpeakingBotId)) {
      // Remove bot from typing if it's no longer speaking
      dispatch({
        type: 'SET_TYPING_BOT_IDS',
        payload: state.typingBotIds.filter(id => id !== currentSpeakingBotId)
      });
    }
  }, [isListening, isBotSpeaking, currentSpeakingBotId, isVoiceEnabled, state.isRecording, state.typingBotIds, dispatch]);
  
  // Handle text-to-speech for new bot messages
  useEffect(() => {
    if (!isVoiceEnabled || !state.messages.length) return;
    
    // Get the last bot message in the chat
    const lastMessage = state.messages[state.messages.length - 1];
    
    // Skip if it's not a bot message or if speaking is already in progress
    if (lastMessage.role !== 'assistant' || isBotSpeaking) return;
    
    // Skip if the message is older than 5 seconds (to avoid speaking old messages when component mounts)
    const messageAge = Date.now() - lastMessage.timestamp;
    if (messageAge > 5000) return;
    
    // Find the bot for this message
    const botId = lastMessage.sender;
    const bot = botRegistryState.availableBots.find(b => b.id === botId);
    
    if (bot) {
      // Play the bot response using text-to-speech
      playBotResponse(botId, lastMessage.content);
    }
  }, [isVoiceEnabled, state.messages, isBotSpeaking, botRegistryState.availableBots, playBotResponse]);
  
  // This component doesn't render anything visible
  return null;
} 