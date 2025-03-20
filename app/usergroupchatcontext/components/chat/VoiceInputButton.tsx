'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Volume2, Volume1, VolumeX } from 'lucide-react';
import { useVoiceTranscription } from '../../services/voiceTranscriptionService';
import { cn } from '@/lib/utils';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import VoiceOverlay from '../voice/VoiceOverlay';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import React from 'react';
import { VoiceSynthesisService } from '../../services/voiceSynthesisService';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import sessionConnectionManager from '../../services/livekit/session-connection-manager';
import audioTrackManager from '../../services/livekit/audio-track-manager';
import participantManager from '../../services/livekit/participant-manager';
import voiceModeManager from '../../services/voice/VoiceModeManager';

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
  title,
  'aria-label': ariaLabel,
}: VoiceInputButtonProps) {
  const [isRecordingComplete, setIsRecordingComplete] = useState(false);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
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
    isListening: isLiveKitListening, 
    startListening: startLiveKitListening,
    stopListening: stopLiveKitListening,
    resumeAudioContext,
    isInVoiceMode
  } = useLiveKitIntegration();
  
  const [isInitializing, setIsInitializing] = useState(false);

  // Boolean flag for whether we're in voice mode or text mode
  const isActive = isVoiceEnabled ? isLiveKitListening : isRecording;

  // Add a state for the ripple effect
  const [showRipple, setShowRipple] = useState(false);
  const rippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Handles the transition from voice mode back to text mode
   * Ensures proper cleanup and context preservation
   */
  const stopLiveKitVoiceMode = () => {
    // Reset any audio-related state
    lastSentMessageRef.current = '';
    setShowVoiceOverlay(false);
    
    // Clear any flags or indicators
    multimodalAgentService.stopListening();
    stopLiveKitListening();
    
    // Set voice mode inactive in session connection manager to prevent reconnections
    sessionConnectionManager.setVoiceModeActive(false);
    
    // Stop any active audio
    voiceSynthesisService.stop();
    
    // Use VoiceModeManager to properly handle the voice-to-text transition
    // This ensures processing hooks are re-enabled and context is preserved
    voiceModeManager.deactivateVoiceMode();
    
    // Preserve voice session data for history
    voiceModeManager.preserveVoiceSessionData({
      messages: [],  // These will be preserved in the global state already
      duration: Date.now() - (voiceModeStartTimeRef.current || Date.now()),
      botIds: []     // Active bot IDs are tracked in the group chat state
    });
    
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
      
      console.log('[VoiceInputButton] Received transcription:', { text, isFinal });
      
      if (isFinal && text && text.trim() !== '') {
        // Avoid duplicates by checking if this is the same as the last sent message
        if (text !== lastSentMessageRef.current) {
          console.log('[VoiceInputButton] Sending transcription to chat:', text);
          lastSentMessageRef.current = text;
          
          // Send directly to the chat system
          sendMessage(text, 'voice');
          
          // Also notify the parent component via callback
          onTranscriptionComplete(text);
        } else {
          console.log('[VoiceInputButton] Skipping duplicate message:', text);
        }
      }
    };

    // Use the proper methods for adding a transcription handler
    multimodalAgentService.onTranscription((text: string, isFinal: boolean) => {
      handleLiveKitTranscription({ text, isFinal });
    });
    
    console.log('[VoiceInputButton] Registered transcription handler with multimodalAgentService');
    
    return () => {
      // Use the proper offTranscription method for cleanup
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
   * Controls the transitions in both directions
   */
  const handleToggleRecording = async () => {
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

    // Toggle between voice mode and text mode
    if (isVoiceEnabled) {
      // We're using the LiveKit integration
      if (isLiveKitListening) {
        // Currently in voice mode - switch to text mode
        console.log('Transitioning from voice mode to text mode...');
        stopLiveKitVoiceMode();
        
        // Log completion of voice mode with context preservation
        console.log('Voice context preserved in unified text chat history');
        
        // Force a complete disconnect before returning to text mode
        try {
          // Get the active connection's room name if available
          const activeRoomName = sessionConnectionManager.getActiveRoomName();
          
          if (activeRoomName) {
            // First clean up audio tracks
            await audioTrackManager.cleanupAudioTracks();
            
            // Clean up participant tracking
            participantManager.cleanupRoom(activeRoomName);
            
            // Close the connection
            await sessionConnectionManager.closeConnection(activeRoomName);
          }
          
          // Let the browser catch up
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Error during transition to text mode:', error);
        }
      } else {
        // Currently in text mode - switch to voice mode
        console.log('Transitioning from text mode to voice mode...');
        
        // Log context inheritance for voice mode
        console.log('Activating voice mode with context inheritance from text mode');
        
        // Initialize voice mode
        try {
          setIsInitializing(true);
          setShowVoiceOverlay(true);
          
          // Mark the start time for tracking voice session duration
          voiceModeStartTimeRef.current = Date.now();
          
          // Set voice mode active first to allow connections
          sessionConnectionManager.setVoiceModeActive(true);
          
          // Resume audio context first
          await resumeAudioContext();
          
          // Connect to LiveKit and enter voice mode
          await startLiveKitListening();
          setIsInitializing(false);
        } catch (error) {
          console.error('Error transitioning to voice mode:', error);
          setAudioContextError('Error transitioning to voice mode');
          setIsInitializing(false);
          sessionConnectionManager.setVoiceModeActive(false);
        }
      }
    } else {
      // Fallback to basic voice recording (not using LiveKit integration)
      if (isRecording) {
        // Switch from voice mode to text mode
        stopRecording();
        setIsRecordingComplete(true);
        setShowVoiceOverlay(false);
      } else {
        // Switch from text mode to voice mode
        resetTranscript();
        startRecording();
        setShowVoiceOverlay(true);
      }
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

  // Function to get appropriate mic icon based on audio level
  const getMicIcon = () => {
    if (isInitializing) {
      return <Loader2 className="h-5 w-5 animate-spin" />;
    } 
    
    if (isVoiceEnabled) {
      // Show volume level indicators when active
      if (currentAudioLevel > 0.3) {
        return <Volume2 className="h-5 w-5" />; // High volume
      } else if (currentAudioLevel > 0.1) {
        return <Volume1 className="h-5 w-5" />; // Medium volume
      } else if (showLowVolumeWarning) {
        return <VolumeX className="h-5 w-5" />; // Low/no volume warning
      } else {
        return <MicOff className="h-5 w-5" />; // Default off icon
      }
    }
    
    return <Mic className="h-5 w-5" />; // Default mic icon
  };

  const getErrorMessage = (error: string): { title: string, message: string } => {
    if (error.includes('permission')) {
      return {
        title: 'Microphone Permission Denied',
        message: 'Please allow microphone access to use voice mode.'
      };
    } else if (error.includes('audio context')) {
      return {
        title: 'Audio Context Error',
        message: 'Failed to initialize audio system. Try refreshing the page.'
      };
    } else {
      return {
        title: 'Voice Mode Error',
        message: error || 'An error occurred with voice mode.'
      };
    }
  };

  return (
    <>
      {/* Blackbar voice mode toggle button */}
      <button
        type="button"
        className={cn(
          "blackbar-voice-toggle rounded-full p-2 transition-colors touch-target",
          isActive
            ? "bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse" // Voice mode active
            : "bg-muted text-muted-foreground hover:bg-muted/90", // Text mode active
          className
        )}
        onClick={handleToggleRecording}
        disabled={disabled || !isSupported}
        aria-label={ariaLabel || (isActive ? "Switch to text mode" : "Switch to voice mode")}
        title={title || (isActive ? "Switch to text mode" : "Switch to voice mode")}
      >
        {/* Ripple effect */}
        {showRipple && (
          <span 
            className={cn(
              "absolute inset-0 rounded-full bg-primary-foreground",
              isActive ? "bg-opacity-30" : "bg-opacity-10"
            )}
            style={{
              animation: 'ripple 0.6s linear forwards'
            }}
          />
        )}
        {getMicIcon()}
      </button>
      
      {/* Voice mode overlay - only shown when in voice mode */}
      {showVoiceOverlay && (
        <VoiceOverlay 
          isActive={isActive}
          interimText={interimTranscript || ''}
          errorMessage={audioContextError ? getErrorMessage(audioContextError) : null}
          onClose={stopLiveKitVoiceMode}
          lowVolumeWarning={showLowVolumeWarning}
          buttonText={isActive ? "Switch to text mode" : "Switch to voice mode"}
        />
      )}
    </>
  );
} 