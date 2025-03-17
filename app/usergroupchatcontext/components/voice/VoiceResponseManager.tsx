'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import turnTakingService from '../../services/livekit/turn-taking-service';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { BotId } from '../../types';
import { EventEmitter } from 'events';

/**
 * VoiceResponseManager coordinates bot responses with the turn-taking system
 * It handles:
 * 1. Managing when bots should respond to voice input
 * 2. Coordinating multi-bot responses based on turn-taking rules
 * 3. Ensuring context is maintained across text and voice modalities
 */
export default function VoiceResponseManager() {
  const { state, dispatch } = useGroupChatContext();
  const { 
    isListening, 
    isBotSpeaking,
    currentSpeakingBotId,
    playBotResponse
  } = useLiveKitIntegration();
  const { state: botRegistryState } = useBotRegistry();
  const { settings } = state;
  
  // Access active bot IDs from settings
  const activeBotIds = settings.activeBotIds || [];
  
  const lastTranscriptRef = useRef<string>('');
  const processingRef = useRef<boolean>(false);
  
  // Create a local event emitter for voice activity events
  const voiceActivityEmitter = useRef<EventEmitter>(new EventEmitter());
  
  // Listen for turn-taking events
  useEffect(() => {
    const handleTurnStarted = (speaker: 'user' | BotId) => {
      console.log(`Turn started: ${speaker}`);
      
      if (speaker !== 'user') {
        // Bot's turn to speak - update typing indicator
        dispatch({
          type: 'SET_TYPING_BOT_IDS',
          payload: [...state.typingBotIds, speaker]
        });
      }
    };
    
    const handleTurnEnded = (speaker: 'user' | BotId) => {
      console.log(`Turn ended: ${speaker}`);
      
      if (speaker !== 'user') {
        // Remove bot from typing indicators
        dispatch({
          type: 'SET_TYPING_BOT_IDS',
          payload: state.typingBotIds.filter(id => id !== speaker)
        });
      } else if (!processingRef.current) {
        // User finished speaking, process transcript if not already processing
        processingRef.current = true;
        processLatestTranscript();
      }
    };
    
    // Subscribe to turn events
    turnTakingService.on('turn:started', handleTurnStarted);
    turnTakingService.on('turn:ended', handleTurnEnded);
    
    return () => {
      // Cleanup event listeners
      turnTakingService.off('turn:started', handleTurnStarted);
      turnTakingService.off('turn:ended', handleTurnEnded);
    };
  }, [state.typingBotIds, dispatch]);
  
  // Process the latest transcript when user finishes speaking
  const processLatestTranscript = useCallback(async () => {
    try {
      const turnState = turnTakingService.getTurnState();
      
      // If user wasn't the last speaker, don't process
      if (turnState.currentSpeaker !== 'user' && turnState.currentSpeaker !== null) {
        processingRef.current = false;
        return;
      }
      
      // Get the latest transcription from state if available
      const latestMessages = state.messages.slice(-5);
      const lastUserMessage = latestMessages.reverse().find(msg => 
        msg.role === 'user' && msg.metadata?.processing?.originalContent !== undefined
      );
      
      if (!lastUserMessage || lastTranscriptRef.current === lastUserMessage.content) {
        processingRef.current = false;
        return;
      }
      
      // Update last processed transcript
      lastTranscriptRef.current = lastUserMessage.content;
      
      // Process bot responses according to active bots and current settings
      for (const botId of activeBotIds) {
        const bot = botRegistryState.availableBots.find(b => b.id === botId);
        if (!bot) continue;
        
        // Request turn for this bot
        const turnGranted = turnTakingService.requestTurn(botId);
        
        if (turnGranted) {
          // Bot turn was granted - it's in the queue or active
          console.log(`Turn granted for bot: ${botId}`);
        }
      }
    } catch (error) {
      console.error('Error processing voice transcript:', error);
    } finally {
      processingRef.current = false;
    }
  }, [state.messages, activeBotIds, botRegistryState.availableBots]);
  
  // Listen for voice activity changes
  useEffect(() => {
    const handleVoiceActivityStateChange = (activityState: any) => {
      if (activityState.isSpeaking === false && activityState.confidence > 0.8) {
        // High confidence that user stopped speaking
        if (!processingRef.current) {
          processingRef.current = true;
          // Small delay to ensure transcription is complete
          setTimeout(() => {
            processLatestTranscript();
          }, 500);
        }
      }
    };
    
    // Set up direct event subscription through our ref
    const emitter = voiceActivityEmitter.current;
    emitter.on('voiceActivity:stateChange', handleVoiceActivityStateChange);
    
    // Subscribe voice activity service events to our local emitter
    const handleVoiceActivity = (state: any) => {
      emitter.emit('voiceActivity:stateChange', state);
    };
    
    // Set up manual subscription to multimodal agent
    // Using hack: direct EventEmitter access since the service doesn't expose on/off methods
    const agentEmitter = (multimodalAgentService as any).emitter;
    if (agentEmitter && typeof agentEmitter.on === 'function') {
      agentEmitter.on('voiceActivity:stateChange', handleVoiceActivity);
    }
    
    return () => {
      // Cleanup
      emitter.off('voiceActivity:stateChange', handleVoiceActivityStateChange);
      
      if (agentEmitter && typeof agentEmitter.off === 'function') {
        agentEmitter.off('voiceActivity:stateChange', handleVoiceActivity);
      }
    };
  }, [processLatestTranscript]);
  
  // This component doesn't render anything visible
  return null;
} 