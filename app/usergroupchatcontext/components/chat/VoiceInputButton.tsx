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
import roomSessionManager from '../../services/livekit/room-session-manager';
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
      if (isFinal && text.trim()) {
        console.log('Final transcription received in VoiceInputButton:', text.trim());
        
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
        console.log('Interim transcription:', text);
      }
    };
    
    // Use the multimodalAgentService directly rather than DOM events
    multimodalAgentService.onTranscription(handleLiveKitTranscription);

    return () => {
      multimodalAgentService.offTranscription(handleLiveKitTranscription);
    };
  }, [onTranscriptionComplete, autoSend, lastSentMessageRef, isVoiceEnabled, isLiveKitListening]);

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
          // Get the active session's room name if available
          const activeSession = roomSessionManager.getActiveSession();
          const roomName = activeSession?.roomName || 'default-room';
          
          // Completely close the session to force a clean reconnect next time
          await roomSessionManager.closeSession(roomName);
          
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
          if (roomSessionManager) {
            console.log('Clean disconnect before starting voice mode...');
            roomSessionManager.setVoiceModeActive(false);
            
            // Get the active session's room name if available
            const activeSession = roomSessionManager.getActiveSession();
            const roomName = activeSession?.roomName || 'default-room';
            
            // Completely close the session before creating a new one
            if (activeSession) {
              console.log(`Closing previous session for room ${roomName}`);
              await roomSessionManager.closeSession(roomName);
              
              // Wait a moment to ensure full cleanup
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          // Connect to LiveKit service with a fresh token
          console.log('Fetching LiveKit token...');

          // Add retry logic for token fetch
          const maxTokenRetries = 3;
          let tokenRetries = 0;
          let tokenData;

          while (tokenRetries < maxTokenRetries) {
            try {
              const response = await fetch('/usergroupchatcontext/api/livekit-token');
              if (!response.ok) {
                console.error(`LiveKit token API returned status: ${response.status}`);
                throw new Error(`Failed to get LiveKit token: ${response.status} ${response.statusText}`);
              }

              // Log raw response for debugging
              const responseText = await response.text();
              console.log(`LiveKit token response (attempt ${tokenRetries + 1}):`, 
                responseText.length > 100 ? `${responseText.substring(0, 100)}...` : responseText);

              // Parse the JSON response
              try {
                tokenData = JSON.parse(responseText);
                
                // If we got an error response from our API
                if (tokenData.error) {
                  console.error('API returned error:', tokenData.error, tokenData.details || '');
                  throw new Error(`LiveKit API error: ${tokenData.error}`);
                }
                
                console.log('Token data keys:', Object.keys(tokenData));
                
                // Validate token
                if (!tokenData || typeof tokenData !== 'object') {
                  console.error('Invalid token data format:', tokenData);
                  throw new Error('Invalid token data format received');
                }

                if (!tokenData.token || typeof tokenData.token !== 'string') {
                  console.error('No valid token in response:', tokenData);
                  throw new Error('No token received from LiveKit token API');
                }
                
                // If we got here, we have a valid token
                break;
              } catch (parseError) {
                console.error(`Failed to parse token response as JSON (attempt ${tokenRetries + 1}):`, parseError);
                
                // If we've already retried several times, give up
                if (tokenRetries >= maxTokenRetries - 1) {
                  throw new Error('Invalid token response format after multiple attempts');
                }
                
                // Otherwise, retry
                tokenRetries++;
                await new Promise(resolve => setTimeout(resolve, 1000 * tokenRetries));
              }
            } catch (fetchError) {
              console.error(`Error fetching token (attempt ${tokenRetries + 1}):`, fetchError);
              
              // If we've already retried several times, give up
              if (tokenRetries >= maxTokenRetries - 1) {
                throw fetchError;
              }
              
              // Otherwise, retry
              tokenRetries++;
              await new Promise(resolve => setTimeout(resolve, 1000 * tokenRetries));
            }
          }

          // Initialize LiveKit session with fresh token
          const roomName = tokenData.roomName || 'default-room';
          const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
          
          if (!livekitUrl) {
            throw new Error('LiveKit URL not configured in environment variables');
          }
          
          // Create a new LiveKit session
          await roomSessionManager.createSession(roomName, tokenData.token, livekitUrl);
          
          // Resume the AudioContext (this requires user interaction)
          let audioContextResumed = false;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (!audioContextResumed && retryCount < maxRetries) {
            audioContextResumed = await multimodalAgentService.resumeAudioContext();
            if (!audioContextResumed) {
              console.log(`AudioContext resume attempt ${retryCount + 1} failed, retrying...`);
              // Small delay between retries
              await new Promise(resolve => setTimeout(resolve, 300));
              retryCount++;
            }
          }
          
          if (!audioContextResumed) {
            // If we still can't resume after retries, show a more helpful error
            throw new Error('Could not initialize audio. Please try clicking the button again.');
          }
          
          // Request microphone permission explicitly
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream after getting permission
            stream.getTracks().forEach(track => track.stop());
          } catch (micError) {
            throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
          }
          
          // Start voice listening with retry logic
          let success = false;
          retryCount = 0;
          
          while (!success && retryCount < maxRetries) {
            try {
              // Try to start voice listening
              success = await startVoiceListening();
              
              if (success) {
                // Before starting to listen, ensure roomSessionManager knows we're in voice mode
                roomSessionManager.setVoiceModeActive(true);
                
                // Wait a moment to ensure everything is initialized properly
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Start the multimodal agent listening - this should trigger the voice recognition
                try {
                  await multimodalAgentService.startListening();
                  
                  // Add a message to chat to confirm voice mode activation
                  sendMessage("Voice mode activated. You can speak now.", "text");
                  
                  // Show the voice overlay
                  setShowVoiceOverlay(true);
                  break; // Success! Exit the retry loop
                } catch (listenerError) {
                  console.error('Error starting multimodal agent listening:', listenerError);
                  
                  // Try to recover automatically
                  roomSessionManager.setVoiceModeActive(true);
                  
                  // Use a more basic approach as fallback
                  const webSpeechAvailable = multimodalAgentService.isWebSpeechAvailable();
                  if (webSpeechAvailable) {
                    console.log('Using Web Speech API as fallback');
                    sendMessage("Voice mode activated with fallback transcription. You can speak now.", "text");
                    setShowVoiceOverlay(true);
                    break;
                  } else {
                    throw new Error('Voice recognition unavailable. Please try another browser.');
                  }
                }
              } else {
                console.log(`Failed to start voice listening (attempt ${retryCount + 1})...`);
                retryCount++;
                
                if (retryCount >= maxRetries) {
                  throw new Error('Failed to start voice mode after multiple attempts');
                }
                
                // Wait before retrying (increasing delay for each retry)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            } catch (listenError) {
              console.error(`Error in voice mode start attempt ${retryCount + 1}:`, listenError);
              retryCount++;
              
              if (retryCount >= maxRetries) {
                throw listenError;
              }
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
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
    
    // Set voice mode inactive in room session manager to prevent reconnections
    roomSessionManager.setVoiceModeActive(false);
    
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