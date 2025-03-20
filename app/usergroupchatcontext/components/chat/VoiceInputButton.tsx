'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Volume2, Volume1, VolumeX } from 'lucide-react';
import { useVoiceTranscription } from '../../services/voiceTranscriptionService';
import { cn } from '@/lib/utils';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import { VoiceSynthesisService } from '../../services/voiceSynthesisService';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import sessionConnectionManager from '../../services/livekit/session-connection-manager';
import voiceModeManager from '../../services/voice/VoiceModeManager';
import { useLiveKit } from '../../context/LiveKitProvider';

// Create a single instance of the service for use in this component
const voiceSynthesisService = new VoiceSynthesisService();

interface VoiceInputButtonProps {
  onTranscriptionComplete: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
  autoSend?: boolean;
  title?: string;
  'aria-label'?: string;
}

/**
 * VoiceInputButton
 * 
 * A key control in the blackbar that toggles between text mode and voice mode.
 * - In text mode: Displays a microphone icon that can be clicked to activate voice mode
 * - In voice mode: Shows audio level indicators and can be clicked to return to text mode
 */
export function VoiceInputButton({
  onTranscriptionComplete,
  className,
  disabled = false,
  autoSend = true,
  title = "Voice Mode",
  'aria-label': ariaLabel = "Toggle voice mode",
}: VoiceInputButtonProps) {
  const [isRecordingComplete, setIsRecordingComplete] = useState(false);
  const [audioContextError, setAudioContextError] = useState('');
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const [showLowVolumeWarning, setShowLowVolumeWarning] = useState(false);
  const lastSentMessageRef = React.useRef('');
  const voiceModeStartTimeRef = React.useRef<number | null>(null);
  
  const { sendMessage } = useRealGroupChat();
  const {
    transcript,
    interimTranscript,
    isRecording,
    isListening: isMicrophoneListening,
    startRecording,
    stopRecording,
    resetTranscript,
    isSupported,
  } = useVoiceTranscription();

  const { 
    isVoiceEnabled,
    voiceSettings
  } = useVoiceSettings();
  
  const { 
    startListening: startLiveKitListening, 
    stopListening: stopLiveKitListening,
    resumeAudioContext,
    isListening: isLiveKitListening,
  } = useLiveKitIntegration();
  
  // Get the ensureConnection function from LiveKit provider
  const { ensureConnection } = useLiveKit();
  
  const [isInitializing, setIsInitializing] = useState(false);

  // Boolean flag for whether we're in voice mode or text mode
  const isActive = isVoiceEnabled ? isLiveKitListening : isRecording;

  // Add a state for the ripple effect
  const [showRipple, setShowRipple] = useState(false);
  const rippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { state, dispatch } = useGroupChatContext();
  
  /**
   * Handles the transition from voice mode back to text mode
   * Ensures proper cleanup and context preservation
   */
  const stopLiveKitVoiceMode = () => {
    // Reset any audio-related state
    lastSentMessageRef.current = '';
    
    // Clear any flags or indicators
    multimodalAgentService.stopListening();
    stopLiveKitListening();
    
    // Set voice mode inactive in session connection manager to prevent reconnections
    sessionConnectionManager.setVoiceModeActive(false);
    
    // Stop any active audio
    voiceSynthesisService.stop();
    
    // Use VoiceModeManager to properly handle the voice-to-text transition
    voiceModeManager.deactivateVoiceMode();
    
    // Preserve voice session data for history if the method exists
    if (typeof voiceModeManager.preserveVoiceSessionData === 'function') {
      const duration = Date.now() - (voiceModeStartTimeRef.current || Date.now());
      
      voiceModeManager.preserveVoiceSessionData({
        duration,
        messages: [], // Already preserved in the global state
        botIds: []    // Active bot IDs are tracked in the group chat state
      });
    }
    
    console.log('Transitioning from voice mode to text mode with context preservation');
  };

  useEffect(() => {
    if (transcript && isRecordingComplete && autoSend) {
      onTranscriptionComplete(transcript);
      resetTranscript();
      setIsRecordingComplete(false);
    }
  }, [transcript, isRecordingComplete, onTranscriptionComplete, resetTranscript, autoSend]);

  // Handle LiveKit transcriptions
  useEffect(() => {
    const handleLiveKitTranscription = (data: {text: string, isFinal: boolean}) => {
      // Destructure the data to get text and isFinal
      const { text, isFinal } = data;
      
      if (isFinal && text && text.trim() !== '') {
        // Avoid duplicates by checking if this is the same as the last sent message
        if (text !== lastSentMessageRef.current) {
          console.log('[VoiceInputButton] Sending transcription to chat:', text);
          lastSentMessageRef.current = text;
          
          // Send directly to the chat system
          sendMessage(text, 'voice');
          
          // Also notify the parent component via callback
          onTranscriptionComplete(text);
        }
      }
    };

    multimodalAgentService.onTranscription((text: string, isFinal: boolean) => {
      handleLiveKitTranscription({ text, isFinal });
    });
    
    return () => {
      multimodalAgentService.offTranscription((text: string, isFinal: boolean) => {
        handleLiveKitTranscription({ text, isFinal });
      });
    };
  }, [onTranscriptionComplete, sendMessage]);

  // Set voice mode start time when activating voice mode
  useEffect(() => {
    if (isLiveKitListening) {
      voiceModeStartTimeRef.current = Date.now();
    } else {
      voiceModeStartTimeRef.current = null;
    }
  }, [isLiveKitListening]);

  // Monitor audio levels to detect if microphone is working
  useEffect(() => {
    if (!isLiveKitListening) {
      setCurrentAudioLevel(0);
      setShowLowVolumeWarning(false);
      return;
    }

    let lowVolumeCounter = 0;
    const maxLowVolumeCounts = 30; // 3 seconds of low volume before warning
    
    const checkAudioLevel = () => {
      const level = multimodalAgentService.getCurrentAudioLevel();
      setCurrentAudioLevel(level);
      
      // Only show warning after sustained low volume
      if (level < 0.05) {
        lowVolumeCounter++;
        if (lowVolumeCounter >= maxLowVolumeCounts) {
          setShowLowVolumeWarning(true);
        }
      } else {
        lowVolumeCounter = 0;
        setShowLowVolumeWarning(false);
      }
    };
    
    const intervalId = setInterval(checkAudioLevel, 100);
    return () => clearInterval(intervalId);
  }, [isLiveKitListening]);

  /**
   * Handles the blackbar mode toggle between text and voice
   */
  const handleToggleRecording = async () => {
    console.log('*** VOICE BUTTON CLICKED ***');
    console.log('Current state:', {
      isVoiceEnabled,
      isLiveKitListening,
      isRecording,
      isInitializing,
      disabled
    });

    // Play ripple effect animation
    setShowRipple(true);
    
    // Clear any existing timeout
    if (rippleTimeoutRef.current) {
      clearTimeout(rippleTimeoutRef.current);
    }
    
    // Remove the ripple after animation completes
    rippleTimeoutRef.current = setTimeout(() => {
      setShowRipple(false);
    }, 600); // Animation takes 600ms

    // If already in an error state, clear it when user tries again
    if (audioContextError) {
      setAudioContextError('');
    }

    // TEMPORARILY FORCE VOICE MODE REGARDLESS OF SETTINGS
    // Toggle between voice mode and text mode
    //if (isVoiceEnabled) {
    if (true) { // Force to always attempt voice mode activation
      // We're using the LiveKit integration
      if (isLiveKitListening) {
        // Currently in voice mode - switch to text mode
        console.log('Transitioning from voice mode to text mode...');
        stopLiveKitVoiceMode();
      } else {
        // Not in voice mode yet - switch to voice mode
        try {
          console.log('Transitioning from text mode to voice mode...');
          setIsInitializing(true);
          
          // CRITICAL: Resume AudioContext first 
          // This must happen directly in response to a user interaction
          const audioContextResumed = await resumeAudioContext();
          if (!audioContextResumed) {
            throw new Error("Failed to resume AudioContext. Browser may be blocking audio access.");
          }
          console.log('AudioContext successfully resumed');
          
          // Activate voice mode using VoiceModeManager with required parameters
          // This needs to happen regardless of LiveKit connection
          const activeBotIds = state.settings.activeBotIds || [];
          const bots = state.bots || [];
          const messages = state.messages || [];
          
          try {
            // Create voice ghosts
            await voiceModeManager.activateVoiceMode(activeBotIds, bots, messages);
          } catch (err) {
            console.error('Error activating voice mode:', err);
            // Continue anyway - we want the UI to show
          }
          
          // Force UI transition to voice mode before attempting connection
          // This provides immediate feedback to the user
          setIsInitializing(false);
          console.log('Voice mode UI activated');
          
          // Set the voice mode as active in the session connection manager
          sessionConnectionManager.setVoiceModeActive(true);
          
          // Try to establish LiveKit connection with retries
          try {
            // First ensure LiveKit connection is ready
            console.log('Ensuring LiveKit connection is established...');
            const connectionSuccessful = await ensureConnection();
            
            if (!connectionSuccessful) {
              console.log('Initial connection attempt failed, retrying...');
              
              // Add retry mechanism with delay
              for (let attempt = 0; attempt < 3; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
                console.log(`Retry attempt ${attempt + 1}...`);
                
                if (await ensureConnection()) {
                  console.log('Connection established on retry');
                  break;
                }
              }
            }
            
            // Start LiveKit listening - continues even if connection failed
            // to ensure the UI feedback works regardless
            await startLiveKitListening();
            
            // Force an attempt with multimodal agent service
            try {
              await multimodalAgentService.startListening();
            } catch (agentErr) {
              console.warn('Error starting multimodal agent:', agentErr);
              // Continue even if agent service fails
            }
          } catch (connErr) {
            console.error('Connection error (continuing with UI):', connErr);
            // Continue anyway to show the UI
          }
        } catch (error) {
          console.error('Error activating voice mode:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing voice mode';
          setAudioContextError(errorMessage);
          setIsInitializing(false);
          
          // Clean up any partial initializations
          try {
            stopLiveKitListening();
            voiceModeManager.deactivateVoiceMode();
          } catch (cleanupErr) {
            console.error('Error during cleanup:', cleanupErr);
          }
        }
      }
    } else {
      // Not using LiveKit voice mode - use the legacy recording approach
      console.warn('Legacy recording not implemented');
    }
  };

  // Cleanup effect for ripple timeout
  useEffect(() => {
    return () => {
      if (rippleTimeoutRef.current) {
        clearTimeout(rippleTimeoutRef.current);
      }
    };
  }, []);

  // Get the appropriate icon based on current state
  const getButtonIcon = () => {
    if (isInitializing) {
      return <Loader2 className="h-5 w-5 animate-spin" />;
    } 
    
    if (isActive) {
      return <MicOff className="h-5 w-5" />;
    }
    
    return <Mic className="h-5 w-5" />;
  };

  // Force enable voice for testing
  useEffect(() => {
    console.log('Voice is enabled:', isVoiceEnabled);
  }, [isVoiceEnabled]);

  return (
    <button
      className={cn(
        "relative blackbar-voice-toggle rounded-full p-2 transition-colors touch-target",
        isActive
          ? "voice-mode-active bg-primary text-primary-foreground"
          : "text-mode-active bg-muted text-muted-foreground hover:bg-muted/80",
        isInitializing ? "opacity-70 cursor-wait" : "opacity-100",
        className
      )}
      onClick={handleToggleRecording}
      // TEMPORARY: Remove disabled state for testing
      // disabled={isInitializing || !isVoiceEnabled || disabled}
      disabled={false}
      aria-label={ariaLabel}
      title={title}
    >
      {/* Ripple effect */}
      {showRipple && (
        <span className="absolute inset-0 rounded-full bg-white/30 animate-ripple" />
      )}
      {getButtonIcon()}
    </button>
  );
} 