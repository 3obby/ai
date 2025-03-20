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
    startListening: startVoiceListening, 
    stopListening: stopVoiceListening
  } = useVoiceSettings();
  
  const { 
    isListening: isLiveKitListening, 
    startListening: startLiveKitListening,
    stopListening: stopLiveKitListening,
    resumeAudioContext,
    isInVoiceMode
  } = useLiveKitIntegration();
  
  const [isInitializing, setIsInitializing] = useState(false);

  // Boolean flag for whether any voice mode is active (either type)
  const isActive = isVoiceEnabled ? isLiveKitListening : isRecording;

  // Function to stop LiveKit voice mode
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
    
    console.log('Voice mode deactivated with proper transition to text mode');
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
    const handleLiveKitTranscription = (text: string, isFinal: boolean) => {
      if (isFinal && text && text.trim() !== '') {
        // Avoid duplicates by checking if this is the same as the last sent message
        if (text !== lastSentMessageRef.current) {
          lastSentMessageRef.current = text;
          onTranscriptionComplete(text);
        }
      }
    };

    multimodalAgentService.onTranscription(handleLiveKitTranscription);
    
    return () => {
      multimodalAgentService.offTranscription(handleLiveKitTranscription);
    };
  }, [onTranscriptionComplete]);

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

  const handleToggleRecording = async () => {
    // If already in an error state, clear it when user tries again
    if (audioContextError) {
      setAudioContextError('');
    }

    // If we're using LiveKit integration, toggle LiveKit voice mode
    if (isVoiceEnabled) {
      if (isLiveKitListening) {
        console.log('Stopping voice mode...');
        stopLiveKitVoiceMode();
        
        // Log completion of voice mode with context preservation
        console.log('Deactivating voice mode, voice context preserved in history');
        
        // Force a complete disconnect before returning
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
          console.error('Error during voice mode cleanup:', error);
        }
      } else {
        console.log('Starting voice mode...');
        
        // Log context inheritance for voice mode
        console.log('Activating voice mode with context inheritance');
        
        // Start voice mode
        try {
          setIsInitializing(true);
          setShowVoiceOverlay(true);
          
          // Mark the start time for tracking voice session duration
          voiceModeStartTimeRef.current = Date.now();
          
          // Set voice mode active first to allow connections
          sessionConnectionManager.setVoiceModeActive(true);
          
          // Resume audio context first
          await resumeAudioContext();
          
          // Connect to LiveKit
          await startLiveKitListening();
          setIsInitializing(false);
        } catch (error) {
          console.error('Error starting voice mode:', error);
          setAudioContextError('Error starting voice mode');
          setIsInitializing(false);
          sessionConnectionManager.setVoiceModeActive(false);
        }
      }
    } else {
      // Fallback to basic voice recording
      if (isRecording) {
        stopRecording();
        setIsRecordingComplete(true);
        setShowVoiceOverlay(false);
      } else {
        resetTranscript();
        startRecording();
        setShowVoiceOverlay(true);
      }
    }
  };

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
      <button
        type="button"
        className={cn(
          "rounded-full p-2 transition-colors touch-target",
          isActive
            ? "bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse"
            : "bg-muted text-muted-foreground hover:bg-muted/90",
          className
        )}
        onClick={handleToggleRecording}
        disabled={disabled || !isSupported}
        aria-label={ariaLabel || (isActive ? "Stop voice mode" : "Start voice mode")}
        title={title || (isActive ? "End Voice Mode" : "Voice Mode")}
      >
        {getMicIcon()}
      </button>
      
      {/* Only show overlay when voice is active */}
      {showVoiceOverlay && (
        <VoiceOverlay 
          isActive={isActive}
          interimText={interimTranscript || ''}
          errorMessage={audioContextError ? getErrorMessage(audioContextError) : null}
          onClose={stopLiveKitVoiceMode}
          lowVolumeWarning={showLowVolumeWarning}
          buttonText={isActive ? "End Voice Mode" : "Voice Mode"}
        />
      )}
    </>
  );
} 