import React, { useEffect, useCallback, useRef } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../../types';

/**
 * VoiceIntegration connects the multimodal voice services to the chat message flow
 * It handles:
 * 1. Converting transcriptions to user messages
 * 2. Converting bot responses to speech synthesis
 */
export default function VoiceIntegration() {
  const { state, dispatch } = useGroupChatContext();
  const { settings } = state;
  const isVoiceEnabled = settings.ui?.enableVoice;
  
  // Use a ref to track processed messages to avoid re-synthesis
  const processedMessageIds = useRef(new Set<string>());

  // Handle transcriptions from voice input, creating messages
  const handleTranscription = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      // Create a new user message from the transcription
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: uuidv4(),
          content: text.trim(),
          role: 'user',
          sender: 'user',
          timestamp: Date.now(),
          type: 'voice',
          metadata: {
            processing: {
              preProcessed: false,
              postProcessed: false
            }
          }
        }
      });
    }
  }, [dispatch]);

  // Handle new assistant messages, sending them to speech synthesis
  useEffect(() => {
    if (!isVoiceEnabled) return;

    // Get the last bot message
    const lastBotMessage = [...state.messages]
      .reverse()
      .find(msg => msg.role === 'assistant');

    // If there's a new bot message and we're not already processing it
    if (lastBotMessage && !processedMessageIds.current.has(lastBotMessage.id)) {
      // Send to speech synthesis
      multimodalAgentService.synthesizeSpeech(lastBotMessage.content, {
        voice: settings.voiceSettings?.defaultVoice || 'nova'
      });
      
      // Mark this message as processed
      processedMessageIds.current.add(lastBotMessage.id);
    }
  }, [state.messages, isVoiceEnabled, settings]);

  // Connect to transcription service
  useEffect(() => {
    if (!isVoiceEnabled) return;

    multimodalAgentService.onTranscription(handleTranscription);
    
    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, [isVoiceEnabled, handleTranscription]);

  return null;
} 