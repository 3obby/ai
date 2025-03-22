'use client';

import React, { useEffect, useCallback, useRef } from 'react';
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
    playBotResponse,
    isInVoiceMode
  } = useLiveKitIntegration();
  
  const { settings } = state;
  const isVoiceEnabled = settings.ui?.enableVoice;
  
  // Track last processed message to avoid duplicate playback
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const lastProcessedTimestampRef = useRef<number>(0);
  const processingMessageRef = useRef<boolean>(false);
  
  // Update UI state based on LiveKit integration state
  useEffect(() => {
    if (!isVoiceEnabled) return;
    
    // Only update the recording state when transitioning from recording to not recording
    // This prevents automatic activation of voice mode
    if (state.isRecording && !isListening) {
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
    // Only synthesize speech if we're actually in voice mode, not just when it's enabled in settings
    if (!isVoiceEnabled || !isInVoiceMode || !state.messages.length || isBotSpeaking) return;
    
    // Prevent duplicate processing
    if (processingMessageRef.current) {
      return;
    }
    
    // Get the last bot message in the chat
    const lastMessage = state.messages[state.messages.length - 1];
    
    // Skip if it's not a bot message
    if (lastMessage.role !== 'assistant') return;
    
    // Skip if we've already processed this message recently
    if (lastMessage.id === lastProcessedMessageIdRef.current) {
      return;
    }
    
    // Skip if the message is older than 3 seconds (to avoid speaking old messages when component mounts)
    const messageAge = Date.now() - lastMessage.timestamp;
    if (messageAge > 3000) return;
    
    // Skip if any message was processed in the last 1 second (to avoid back-to-back responses)
    const timeSinceLastProcess = Date.now() - lastProcessedTimestampRef.current;
    if (timeSinceLastProcess < 1000) return;
    
    // Find the bot for this message
    const botId = lastMessage.sender;
    const bot = botRegistryState.availableBots.find(b => b.id === botId);
    
    if (bot) {
      // Set processing flag
      processingMessageRef.current = true;
      
      // Update last processed info
      lastProcessedMessageIdRef.current = lastMessage.id;
      lastProcessedTimestampRef.current = Date.now();
      
      // Play the bot response using text-to-speech
      // Pass message ID to prevent duplicate playback
      playBotResponse(botId, lastMessage.content, lastMessage.id)
        .finally(() => {
          // Release processing flag
          processingMessageRef.current = false;
        });
    }
  }, [isVoiceEnabled, isInVoiceMode, state.messages, isBotSpeaking, botRegistryState.availableBots, playBotResponse]);
  
  // This component doesn't render anything visible
  return null;
} 