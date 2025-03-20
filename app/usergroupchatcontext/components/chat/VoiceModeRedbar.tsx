'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Mic, X, Volume2, VolumeX, Settings, Square } from 'lucide-react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useGroupChatContext } from '../../context/GroupChatContext';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { Bot } from '../../types';
import voiceActivityService from '../../services/livekit/voice-activity-service';
import { cn } from '@/lib/utils';
import voiceModeManager from '../../services/voice/VoiceModeManager';
import { v4 as uuidv4 } from 'uuid';
import speechSynthesisService from '../../services/livekit/speech-synthesis-service';

// Inline AudioVisualizer to avoid import issues
interface AudioVisualizerProps {
  audioLevel: number; // 0-1 scale
  color?: string;
  barCount?: number;
  className?: string;
}

function AudioVisualizer({
  audioLevel,
  color = 'bg-primary',
  barCount = 20,
  className
}: AudioVisualizerProps) {
  // Generate visualization bars based on current audio level
  const bars = useMemo(() => {
    const bars = [];
    const normalizedLevel = Math.min(Math.max(audioLevel, 0), 1);
    
    for (let i = 0; i < barCount; i++) {
      // Calculate height for this bar (0-100%)
      let heightPercentage = 0;
      
      // Generate a smooth, natural-looking visualization
      // Each bar has a different threshold at which it becomes visible
      const barThreshold = i / barCount;
      
      if (normalizedLevel > barThreshold) {
        // Calculate how far above threshold this level is (0-1)
        const aboveThreshold = (normalizedLevel - barThreshold) / (1 - barThreshold);
        
        // Add some randomness for a more natural look
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2
        heightPercentage = Math.min(aboveThreshold * randomFactor * 100, 100);
      }
      
      bars.push(
        <div 
          key={i} 
          className={cn("w-1 rounded-sm mx-0.5", color)}
          style={{ 
            height: `${heightPercentage}%`,
            transition: 'height 50ms ease'
          }}
        />
      );
    }
    
    return bars;
  }, [audioLevel, barCount, color]);

  return (
    <div 
      className={cn(
        "w-full h-full flex items-end justify-center", 
        className
      )}
    >
      {bars}
    </div>
  );
}

interface VoiceModeRedbarProps {
  onClose: () => void;
}

export default function VoiceModeRedbar({ onClose }: VoiceModeRedbarProps) {
  const { voiceSettings, updateVoiceSettings } = useVoiceSettings();
  const { state, dispatch } = useGroupChatContext();
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [botAudioLevel, setBotAudioLevel] = useState(0);
  const [activeBot, setActiveBot] = useState<Bot | null>(null);
  const [interimTranscriptionId, setInterimTranscriptionId] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [muteAudio, setMuteAudio] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  
  // Get the most recently interacted with bot
  useEffect(() => {
    // Find the most recent bot message
    const messages = state.messages || [];
    const botMessages = messages.filter(msg => msg.role === 'assistant');
    
    if (botMessages.length > 0) {
      const lastBotMessage = botMessages[botMessages.length - 1];
      const botId = lastBotMessage.sender;
      const selectedBot = state.bots?.find((bot: Bot) => bot.id === botId) || null;
      setActiveBot(selectedBot);
    } else if (state.bots && state.bots.length > 0) {
      // Default to first bot if no messages
      setActiveBot(state.bots[0]);
    }
  }, [state.messages, state.bots]);

  // Listen for audio level changes
  useEffect(() => {
    // Subscribe to audio level updates
    const audioLevelInterval = setInterval(() => {
      const state = voiceActivityService.getState();
      setUserAudioLevel(state.level);
    }, 50);

    // Retrieve bot speaking state
    const botSpeakingInterval = setInterval(() => {
      const speaking = multimodalAgentService.isSpeaking();
      setIsBotSpeaking(speaking);
      
      if (speaking) {
        setBotAudioLevel(Math.random() * 0.5 + 0.2);
      } else {
        setBotAudioLevel(0);
      }
    }, 50);

    return () => {
      clearInterval(audioLevelInterval);
      clearInterval(botSpeakingInterval);
    };
  }, []);

  // Listen for transcription status
  useEffect(() => {
    const handleTranscription = (text: string, isFinal: boolean) => {
      if (!isFinal) {
        setIsTranscribing(true);
        
        // If this is a new transcription starting, create a new ghost message
        if (!interimTranscriptionId) {
          const ghostId = uuidv4();
          setInterimTranscriptionId(ghostId);
          
          // Add ghost message to the chat
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: ghostId,
              content: text || 'Processing speech...',
              role: 'user',
              sender: 'user',
              timestamp: Date.now(),
              type: 'voice',
              metadata: {
                processing: {
                  voiceProcessing: {
                    interimTranscripts: [text],
                    isInterim: true
                  }
                }
              }
            }
          });
        } else {
          // Update existing ghost message with new transcription
          const updatedMessages = state.messages.map(msg => {
            if (msg.id === interimTranscriptionId) {
              return {
                ...msg,
                content: text || 'Processing speech...',
                metadata: {
                  ...msg.metadata,
                  processing: {
                    ...msg.metadata?.processing,
                    voiceProcessing: {
                      ...msg.metadata?.processing?.voiceProcessing,
                      interimTranscripts: [
                        ...(msg.metadata?.processing?.voiceProcessing?.interimTranscripts || []),
                        text
                      ]
                    }
                  }
                }
              };
            }
            return msg;
          });
          
          dispatch({
            type: 'SET_MESSAGES',
            messages: updatedMessages
          });
        }
      } else {
        // When transcription is final, replace the ghost message with the final transcript
        if (interimTranscriptionId) {
          const updatedMessages = state.messages.map(msg => {
            if (msg.id === interimTranscriptionId) {
              return {
                ...msg,
                content: text,
                metadata: {
                  ...msg.metadata,
                  processing: {
                    ...msg.metadata?.processing,
                    voiceProcessing: {
                      ...msg.metadata?.processing?.voiceProcessing,
                      isInterim: false,
                      speechDuration: Date.now() - msg.timestamp
                    }
                  }
                }
              };
            }
            return msg;
          });
          
          dispatch({
            type: 'SET_MESSAGES', 
            messages: updatedMessages
          });
          
          // Reset interim transcript ID
          setInterimTranscriptionId(null);
        }
        
        // Clear transcribing state
        setIsTranscribing(false);
      }
    };

    multimodalAgentService.onTranscription(handleTranscription);

    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, [interimTranscriptionId, dispatch, state.messages]);

  const handleCloseVoiceMode = () => {
    // Use VoiceModeManager to properly handle the voice-to-text transition
    voiceModeManager.deactivateVoiceMode();
    
    // Call onClose to notify parent components
    onClose();
  };

  const toggleMute = () => {
    const newMuteState = !muteAudio;
    setMuteAudio(newMuteState);
    // Instead we can just update the UI state for now
    // The actual muting functionality could be implemented in the service later
  };
  
  // Handle recording button press (cancel/interrupt)
  const handleRecordingButtonPress = () => {
    if (isBotSpeaking) {
      // Interrupt bot speech
      speechSynthesisService.stopSpeaking();
      multimodalAgentService.setSpeaking(false);
      console.log('Bot speech interrupted by user');
    } else if (isTranscribing) {
      // Cancel current transcription
      if (interimTranscriptionId) {
        // Remove the ghost message from the chat
        const filteredMessages = state.messages.filter(msg => msg.id !== interimTranscriptionId);
        dispatch({
          type: 'SET_MESSAGES',
          messages: filteredMessages
        });
        
        // Reset state
        setInterimTranscriptionId(null);
        setIsTranscribing(false);
        
        console.log('Transcription canceled by user');
        
        // Restart transcription system
        multimodalAgentService.stopListening();
        setTimeout(() => {
          multimodalAgentService.startListening();
        }, 300);
      }
    }
  };

  // Determine if the user is currently speaking
  const isSpeaking = userAudioLevel > (voiceSettings.vadThreshold || 0.3);

  return (
    <div className="redbar voice-mode border-t bg-red-50/90 dark:bg-red-900/30 backdrop-blur-md p-3 pb-safe-area-inset-bottom">
      <div className="flex items-center justify-between gap-2">
        {/* Recording button/cancel button */}
        <div className="flex-none">
          <button
            onClick={handleRecordingButtonPress}
            className={cn(
              "rounded-full p-2 flex items-center justify-center w-10 h-10 transition-all",
              isBotSpeaking 
                ? "bg-white dark:bg-white/80 text-red-500 animate-pulse"
                : isSpeaking
                  ? "bg-red-500 text-white"
                  : "bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200"
            )}
            aria-label={isBotSpeaking ? "Interrupt bot" : "Cancel transcription"}
            title={isBotSpeaking ? "Interrupt bot" : "Cancel transcription"}
          >
            {isBotSpeaking ? <Mic className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
          <div className="text-center text-xs mt-1 text-red-700 dark:text-red-200 font-medium">
            Cancel
          </div>
        </div>
        
        {/* User audio visualizer */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center text-xs font-medium text-red-700 dark:text-red-200">
              <Mic className="w-3 h-3 mr-1" />
              <span>You</span>
            </div>
            <span className="text-xs text-red-600/80 dark:text-red-300/80">
              {isSpeaking ? 'Speaking' : 'Silent'}
            </span>
          </div>
          <div className="h-6 bg-red-100/70 dark:bg-red-800/50 rounded-md overflow-hidden">
            <AudioVisualizer 
              audioLevel={userAudioLevel} 
              color={isSpeaking ? 'bg-red-500' : 'bg-red-300 dark:bg-red-700'} 
              barCount={16}
              className="px-1"
            />
          </div>
        </div>
        
        {/* Bot indicator and controls */}
        <div className="flex items-center gap-2">
          {/* Bot avatar */}
          {activeBot && (
            <div className="relative">
              <img 
                src={activeBot.avatar || '/bot-default-avatar.png'} 
                alt={activeBot.name}
                className="w-8 h-8 rounded-full border border-red-300 dark:border-red-700" 
              />
              {botAudioLevel > 0 && (
                <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-red-50 dark:border-red-900"></span>
              )}
            </div>
          )}
          
          {/* Control buttons */}
          <button 
            onClick={toggleMute}
            className={cn(
              "rounded-full p-2 transition-colors",
              muteAudio ? "bg-red-500 text-white" : "bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700"
            )}
            aria-label={muteAudio ? "Unmute audio" : "Mute audio"}
            title={muteAudio ? "Unmute audio" : "Mute audio"}
          >
            {muteAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={handleCloseVoiceMode}
            className="rounded-full p-2 bg-red-500 text-white hover:bg-red-600 transition-colors"
            aria-label="Exit voice mode"
            title="Exit voice mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 