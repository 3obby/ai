'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2, Volume2, Volume1, VolumeX } from 'lucide-react';
import { useVoiceTranscription } from '../../services/voiceTranscriptionService';
import { cn } from '@/lib/utils';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import VoiceOverlay from '../voice/VoiceOverlay';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import React from 'react';
import { VoiceSynthesisService } from '../../services/voiceSynthesisService';
import { useLiveKit } from '../../context/LiveKitProvider';
import sessionConnectionManager from '../../services/livekit/session-connection-manager';
import audioTrackManager from '../../services/livekit/audio-track-manager';
import participantManager from '../../services/livekit/participant-manager';

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
  const [isInitializing, setIsInitializing] = useState(false);
  const [audioContextError, setAudioContextError] = useState<string | null>(null);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const [showLowVolumeWarning, setShowLowVolumeWarning] = useState(false);
  const lastSentMessageRef = React.useRef('');
  
  const { sendMessage } = useRealGroupChat();
  
  const {
    isVoiceEnabled,
    isListening: isLiveKitListening,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening
  } = useVoiceSettings();
  
  const liveKit = useLiveKit(); // Get LiveKit context
  
  const {
    isRecording,
    transcript,
    interimTranscript,
    isListening,
    startRecording,
    stopRecording,
    resetTranscript,
    isSupported,
    error
  } = useVoiceTranscription({
    continuous: true,
    interimResults: true,
  });

  // Handle transcription from LiveKit
  useEffect(() => {
    // Skip setting up LiveKit transcription handler if not in voice mode
    // This prevents duplicate processing of transcriptions
    if (!isVoiceEnabled || !isLiveKitListening) return;
    
    const handleLiveKitTranscription = (text: string, isFinal: boolean) => {
      console.log('[DEBUG] Voice transcription received:', { text, isFinal, isVoiceEnabled, isLiveKitListening });
      
      if (isFinal && text.trim()) {
        console.log('[DEBUG] Final transcription received in VoiceInputButton:', text.trim());
        
        // Store the last transcription for deduplication purposes
        lastSentMessageRef.current = text.trim();
        
        // Don't send the message here - LiveKitIntegrationProvider will handle it
        // This prevents duplicate messages
        
        if (!autoSend) {
          // Only if not auto-sending, add to input field
          onTranscriptionComplete(text.trim());
        }
      } else if (!isFinal && text.trim() && text !== 'Listening...' && text !== 'Processing...') {
        // For interim results, we could update a state to show this is being transcribed
        console.log('[DEBUG] Interim transcription:', text);
      }
    };
    
    // Use the multimodalAgentService directly rather than DOM events
    console.log('[DEBUG] Setting up LiveKit transcription handler');
    multimodalAgentService.onTranscription(handleLiveKitTranscription);

    return () => {
      console.log('[DEBUG] Cleaning up LiveKit transcription handler');
      multimodalAgentService.offTranscription(handleLiveKitTranscription);
    };
  }, [onTranscriptionComplete, autoSend, isVoiceEnabled, isLiveKitListening]);

  // When recording is complete and we have a transcript
  useEffect(() => {
    if (isRecordingComplete && transcript.trim()) {
      onTranscriptionComplete(transcript.trim());
      resetTranscript();
      setIsRecordingComplete(false);
    }
  }, [isRecordingComplete, transcript, onTranscriptionComplete, resetTranscript]);

  // Clear audio context error after 5 seconds
  useEffect(() => {
    if (audioContextError) {
      const timer = setTimeout(() => {
        setAudioContextError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [audioContextError]);

  // Monitor audio levels for low volume warning
  useEffect(() => {
    if (!isLiveKitListening) return;
    
    // Check audio levels to show low volume warning
    let silentTime = 0;
    const startTime = Date.now();
    
    const checkAudioLevel = () => {
      const level = multimodalAgentService.getCurrentAudioLevel();
      setCurrentAudioLevel(level);
      
      // If we've been listening for 3+ seconds and levels are consistently low
      const listeningDuration = Date.now() - startTime;
      
      if (listeningDuration > 3000) {
        if (level < 0.1) {
          silentTime += 100;
          if (silentTime > 2000) { // Show warning after 2 seconds of silence
            setShowLowVolumeWarning(true);
          }
        } else {
          silentTime = 0;
          setShowLowVolumeWarning(false);
        }
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
        } catch (stopError) {
          console.error('Error during complete voice mode cleanup:', stopError);
          // Continue anyway as we're stopping
        }
      } else {
        // Start LiveKit voice mode with additional cleanup first
        setIsInitializing(true);
        
        try {
          // First ensure we have completely disconnected any previous LiveKit sessions
          console.log('Clean disconnect before starting voice mode...');
          sessionConnectionManager.setVoiceModeActive(false);
          
          // Get the active room name if available
          const activeRoomName = sessionConnectionManager.getActiveRoomName();
          
          if (activeRoomName) {
            console.log(`Closing previous connection for room ${activeRoomName}`);
            
            // First clean up audio tracks
            await audioTrackManager.cleanupAudioTracks();
            
            // Clean up participant tracking
            participantManager.cleanupRoom(activeRoomName);
            
            // Close the connection
            await sessionConnectionManager.closeConnection(activeRoomName);
            
            // Wait a moment to ensure full cleanup
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Connect to LiveKit service with a fresh token
          console.log('[DEBUG] Fetching LiveKit token...');

          // Using the direct API endpoint for token
          try {
            const response = await fetch('/usergroupchatcontext/api/livekit-token');
            if (!response.ok) {
              throw new Error(`Failed to get LiveKit token: ${response.status} ${response.statusText}`);
            }
            
            // Parse the JSON response
            const tokenData = await response.json();
            if (!tokenData || !tokenData.token) {
              throw new Error('Invalid token response from server');
            }

            // Initialize LiveKit connection with fresh token
            const roomName = tokenData.roomName || 'default-room';
            const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
            
            if (!livekitUrl) {
              throw new Error('LiveKit URL not configured in environment variables');
            }
            
            // Create a new LiveKit connection
            await sessionConnectionManager.createConnection(roomName, tokenData.token, livekitUrl);
            
            // Resume the AudioContext (this requires user interaction)
            let audioContextResumed = await multimodalAgentService.resumeAudioContext();
            if (!audioContextResumed) {
              console.log('Audio context resume failed on first attempt, retrying...');
              // Try one more time with a small delay
              await new Promise(resolve => setTimeout(resolve, 300));
              audioContextResumed = await multimodalAgentService.resumeAudioContext();
              
              if (!audioContextResumed) {
                throw new Error('Could not initialize audio. Please try clicking the button again.');
              }
            }
            
            // Enable local audio publication
            await audioTrackManager.enableLocalAudio();
            
            // Activate session for voice mode
            sessionConnectionManager.setVoiceModeActive(true);
            
            // Start voice listening
            try {
              const success = await startVoiceListening();
              
              if (success) {
                // Start the multimodal agent listening
                await multimodalAgentService.startListening();
                
                // Show the voice overlay
                setShowVoiceOverlay(true);
              } else {
                console.warn('[DEBUG] startVoiceListening returned false without throwing an error');
                throw new Error('Failed to start voice mode. Please try again.');
              }
            } catch (listenError) {
              console.error('[DEBUG] Voice listening failed:', listenError);
              throw new Error(`Voice mode error: ${listenError instanceof Error ? listenError.message : 'Failed to start voice mode'}`);
            }
          } catch (tokenError) {
            console.error('Error getting token or starting voice mode:', tokenError);
            throw tokenError;
          }
        } catch (error) {
          console.error('Failed to start listening:', error);
          setAudioContextError(error instanceof Error ? error.message : 'Failed to initialize audio');
          
          // Add error message to chat
          sendMessage(`Voice mode error: ${error instanceof Error ? error.message : 'Failed to initialize audio'}`, "text");
        } finally {
          setIsInitializing(false);
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

  // Function to stop LiveKit voice mode
  const stopLiveKitVoiceMode = () => {
    // Reset any audio-related state
    lastSentMessageRef.current = '';
    setShowVoiceOverlay(false);
    
    // Clear any flags or indicators
    multimodalAgentService.stopListening();
    stopVoiceListening();
    
    // Set voice mode inactive in session connection manager to prevent reconnections
    sessionConnectionManager.setVoiceModeActive(false);
    
    // Stop any active audio
    voiceSynthesisService.stop();
  };

  // Get a more user-friendly error message
  const getErrorMessage = (error: string): { title: string, message: string } => {
    if (error.includes('permission') || error.includes('denied')) {
      return {
        title: 'Microphone access denied',
        message: 'Please allow microphone access in your browser settings.'
      };
    } else if (error.includes('initialize') || error.includes('AudioContext')) {
      return {
        title: 'Audio initialization failed',
        message: 'Try clicking again or refreshing the page.'
      };
    } else if (error.includes('no-speech')) {
      return {
        title: 'No speech detected',
        message: 'Please try speaking more clearly or check your microphone.'
      };
    } else {
      return {
        title: 'Voice input error',
        message: 'Please try again or use text input instead.'
      };
    }
  };

  if (!isSupported && !isVoiceEnabled) {
    return null;
  }

  const isActive = isVoiceEnabled ? isLiveKitListening : isRecording;
  const errorDetails = audioContextError ? getErrorMessage(audioContextError) : null;

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