'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import sessionConnectionManager from '../../services/livekit/session-connection-manager';

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
  const [textOutputMode, setTextOutputMode] = useState(false);
  const [transcriptionStartTime, setTranscriptionStartTime] = useState<number | null>(null);
  const [transcriptionDuration, setTranscriptionDuration] = useState(0);
  
  // Use a ref to track the timer interval
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        console.log('Transcription started/ongoing:', text);
        setIsTranscribing(true);
        
        // Always reset and start the timer
        const currentTime = Date.now();
        setTranscriptionStartTime(currentTime);
        
        // Immediately set the initial duration to 0
        setTranscriptionDuration(0);
        
        // Clear any existing interval
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        
        // Set up an interval to update the duration
        timerIntervalRef.current = setInterval(() => {
          const newDuration = Math.floor((Date.now() - currentTime) / 1000);
          console.log('Updating timer duration:', newDuration);
          setTranscriptionDuration(newDuration);
        }, 1000);
        
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
                    interimTranscripts: [text]
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
                      interimTranscripts: [],  // Clear interim transcripts for final message
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
        
        // Clear transcribing state and reset timer
        setIsTranscribing(false);
        resetTranscriptionTimer();
      }
    };

    multimodalAgentService.onTranscription(handleTranscription);

    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
      // Clean up the timer interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [interimTranscriptionId, dispatch, state.messages, transcriptionStartTime]);

  // Reset the transcription timer
  const resetTranscriptionTimer = () => {
    setTranscriptionStartTime(null);
    setTranscriptionDuration(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Format the duration in HH:MM:SS format if needed
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return seconds.toString();
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Cancels the current transcription
  const cancelTranscription = () => {
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
      resetTranscriptionTimer();
      
      console.log('Transcription canceled by user');
      
      // Restart transcription system
      multimodalAgentService.stopListening();
      setTimeout(() => {
        multimodalAgentService.startListening();
      }, 300);
    }
  };

  const handleCloseVoiceMode = () => {
    // First, make sure we stop any transcription
    if (isTranscribing && interimTranscriptionId) {
      cancelTranscription();
    }
    
    // Stop any active audio first
    if (isBotSpeaking) {
      speechSynthesisService.setSpeaking(false);
      multimodalAgentService.setSpeaking(false);
    }
    
    // Comprehensive voice mode shutdown:
    
    // 1. Stop listening for audio
    try {
      multimodalAgentService.stopListening();
    } catch (error) {
      console.error('Error stopping multimodal agent:', error);
    }
    
    // 2. Set voice mode inactive in session connection manager to prevent reconnections
    sessionConnectionManager.setVoiceModeActive(false);
    
    // 3. Use VoiceModeManager to properly handle the voice-to-text transition
    try {
      voiceModeManager.deactivateVoiceMode();
    } catch (error) {
      console.error('Error deactivating voice mode:', error);
    }
    
    // 4. Clear any voice service state
    try {
      // Close any active room connections
      const activeRoomName = sessionConnectionManager.getActiveRoomName();
      if (activeRoomName) {
        sessionConnectionManager.closeConnection(activeRoomName);
      }
    } catch (error) {
      console.error('Error cleaning up voice session:', error);
    }
    
    // 5. Call onClose to notify parent components
    console.log('Exiting voice mode via close button - complete shutdown sequence executed');
    onClose();
  };

  const toggleMute = () => {
    const newMuteState = !muteAudio;
    setMuteAudio(newMuteState);
    // Instead we can just update the UI state for now
    // The actual muting functionality could be implemented in the service later
  };
  
  const toggleOutputMode = () => {
    setTextOutputMode(!textOutputMode);
    // TODO: Implement actual output mode switching logic
    console.log(`Switching to ${!textOutputMode ? 'text' : 'voice'} output mode`);
  };
  
  // Handle recording button press (cancel/interrupt)
  const handleRecordingButtonPress = () => {
    if (isBotSpeaking) {
      // Interrupt bot speech
      speechSynthesisService.setSpeaking(false);
      multimodalAgentService.setSpeaking(false);
      console.log('Bot speech interrupted by user');
    } else if (isTranscribing) {
      // Cancel current transcription
      cancelTranscription();
    }
  };

  // Determine if the user is currently speaking
  const isSpeaking = userAudioLevel > (voiceSettings.vadThreshold || 0.3);

  return (
    <div className="redbar voice-mode">
      {/* User audio visualizer */}
      <div className="w-full mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center text-xs font-medium text-red-700 dark:text-red-200">
            <Mic className="w-3 h-3 mr-1" />
            <span>You</span>
            {activeBot && (
              <span className="ml-2">→ {activeBot.name}</span>
            )}
          </div>
          <span className="text-xs text-red-600/80 dark:text-red-300/80">
            {isSpeaking ? 'Speaking' : 'Silent'}
          </span>
        </div>
        <div className="h-12 bg-red-100/70 dark:bg-red-800/50 rounded-md overflow-hidden relative">
          <AudioVisualizer 
            audioLevel={userAudioLevel} 
            color={isSpeaking ? 'bg-red-500' : 'bg-red-300 dark:bg-red-700'} 
            barCount={24}
            className="px-1 h-full"
          />
          
          {/* Transcription timer - Always show when transcribing */}
          {isTranscribing && (
            <div 
              className="transcription-timer" 
              style={{
                zIndex: 30,
                position: 'absolute',
                top: '50%',
                right: '8px',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div 
                className="timer-display"
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.8)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontWeight: 'bold' }}>{formatDuration(transcriptionDuration)}</span>
                <button 
                  onClick={cancelTranscription} 
                  className="ml-2 p-0.5 hover:bg-red-600/50 rounded-full"
                  aria-label="Cancel transcription"
                  title="Cancel transcription"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          
          {/* Bot speaking indicator with interrupt button */}
          {isBotSpeaking && (
            <div 
              className="interrupt-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(220, 38, 38, 0.4)',
                backdropFilter: 'blur(1px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20
              }}
            >
              <button
                onClick={() => {
                  speechSynthesisService.setSpeaking(false);
                  multimodalAgentService.setSpeaking(false);
                }}
                className="interrupt-button"
                style={{
                  backgroundColor: 'white',
                  color: 'rgb(220, 38, 38)',
                  borderRadius: '9999px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                aria-label="Interrupt bot"
                title="Interrupt bot"
              >
                <Mic className="w-4 h-4" />
                <span>Interrupt</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls row - Matches blackbar control positioning */}
      <div className="flex justify-end items-center gap-3 w-full">
        {/* Output mode toggle (A for text, speaker for voice) - Position matches voice mode button */}
        <button
          onClick={toggleOutputMode}
          className="rounded-full p-2 flex items-center justify-center w-10 h-10 bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200 transition-colors"
          aria-label={textOutputMode ? "Switch to voice output" : "Switch to text output"}
          title={textOutputMode ? "Switch to voice output" : "Switch to text output"}
        >
          {textOutputMode ? (
            <span className="font-bold text-lg">A</span>
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
        
        {/* Exit voice mode button - Now positioned where cancel button was */}
        <button 
          onClick={handleCloseVoiceMode}
          className="rounded-full p-2 flex items-center justify-center w-10 h-10 bg-red-500 text-white hover:bg-red-600 transition-colors"
          aria-label="Exit voice mode"
          title="Exit voice mode"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 