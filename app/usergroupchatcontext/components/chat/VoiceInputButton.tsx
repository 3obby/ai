'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2, Volume2, Volume1, VolumeX } from 'lucide-react';
import { useVoiceTranscription } from '../../services/voiceTranscriptionService';
import { cn } from '@/lib/utils';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import VoiceOverlay from '../voice/VoiceOverlay';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';

interface VoiceInputButtonProps {
  onTranscriptionComplete: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
  autoSend?: boolean;
}

export function VoiceInputButton({
  onTranscriptionComplete,
  className,
  disabled = false,
  autoSend = true,
}: VoiceInputButtonProps) {
  const [isRecordingComplete, setIsRecordingComplete] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [audioContextError, setAudioContextError] = useState<string | null>(null);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const [showLowVolumeWarning, setShowLowVolumeWarning] = useState(false);
  
  const { sendMessage } = useRealGroupChat();
  
  const {
    isVoiceEnabled,
    isListening: isLiveKitListening,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening
  } = useVoiceSettings();
  
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
    const handleLiveKitTranscription = (text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        console.log('Final transcription received:', text.trim());
        
        if (autoSend) {
          // Add to chat and send message
          sendMessage(text.trim());
        } else {
          // Just add to input field
          onTranscriptionComplete(text.trim());
        }
        
        // Hide overlay after successful transcription
        if (showVoiceOverlay) {
          stopLiveKitVoiceMode();
        }
      } else if (!isFinal && text.trim()) {
        // For interim results, we could update a state to show this is being transcribed
        console.log('Interim transcription:', text);
      }
    };

    multimodalAgentService.onTranscription(handleLiveKitTranscription);

    return () => {
      multimodalAgentService.offTranscription(handleLiveKitTranscription);
    };
  }, [onTranscriptionComplete, autoSend, sendMessage, showVoiceOverlay]);

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
    // Reset any previous errors
    setAudioContextError(null);
    
    if (isVoiceEnabled) {
      // Use LiveKit for voice mode
      if (isLiveKitListening) {
        stopVoiceListening();
        multimodalAgentService.stopListening();
        setShowVoiceOverlay(false);
      } else {
        setIsInitializing(true);
        try {
          // First, try to resume the AudioContext (this requires user interaction)
          // Add retry logic for AudioContext resume
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
          
          // Then proceed with starting the voice listening
          const success = await startVoiceListening();
          if (success) {
            await multimodalAgentService.startListening();
            setShowVoiceOverlay(true);
          } else {
            throw new Error('Failed to start voice listening');
          }
        } catch (error) {
          console.error('Failed to start listening:', error);
          setAudioContextError(error instanceof Error ? error.message : 'Failed to initialize audio');
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
    
    if (isActive) {
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
    if (isVoiceEnabled) {
      stopVoiceListening();
      multimodalAgentService.stopListening();
      setShowVoiceOverlay(false);
    }
  };

  if (!isSupported && !isVoiceEnabled) {
    return null;
  }

  const isActive = isVoiceEnabled ? isLiveKitListening : isRecording;

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "relative rounded-full p-2 transition-colors",
          isActive 
            ? "bg-red-500 text-white hover:bg-red-600" 
            : "bg-primary/10 text-primary hover:bg-primary/20",
          className
        )}
        onClick={handleToggleRecording}
        disabled={disabled || isInitializing}
        aria-label={isActive ? "Stop recording" : "Start voice recording"}
        title={isActive ? "Stop voice mode" : "Click to activate voice mode"}
      >
        {getMicIcon()}
      </button>
      
      {/* Pulsing indicator when recording */}
      {isActive && (
        <span className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
        </span>
      )}

      {/* Error message */}
      {audioContextError && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-lg py-1 px-3 text-xs shadow-lg whitespace-nowrap">
          <p className="font-medium">Audio initialization failed</p>
          <p className="text-xs opacity-80">Try clicking again or check browser permissions</p>
        </div>
      )}

      {/* Low volume warning */}
      {showLowVolumeWarning && isActive && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 rounded-lg py-1 px-3 text-xs shadow-lg whitespace-nowrap">
          <p className="font-medium">Low microphone volume detected</p>
          <p className="text-xs opacity-80">Check your microphone or speak louder</p>
        </div>
      )}

      {/* Transcript indicator */}
      {((transcript || interimTranscript) && isRecording) && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border rounded-lg py-1 px-3 text-xs shadow-lg">
          <p className="font-medium">{transcript} <span className="text-muted-foreground">{interimTranscript}</span></p>
        </div>
      )}
      
      {/* Voice overlay */}
      {showVoiceOverlay && isActive && (
        <VoiceOverlay onClose={() => {
          if (isVoiceEnabled) {
            stopLiveKitVoiceMode();
          } else {
            stopRecording();
            setIsRecordingComplete(true);
          }
          setShowVoiceOverlay(false);
        }} />
      )}
    </div>
  );
} 