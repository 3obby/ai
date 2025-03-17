'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2, Activity } from 'lucide-react';
import { useVoiceTranscription } from '../../services/voiceTranscriptionService';
import { cn } from '@/lib/utils';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';

interface VoiceInputButtonProps {
  onTranscriptionComplete: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceInputButton({
  onTranscriptionComplete,
  className,
  disabled = false,
}: VoiceInputButtonProps) {
  const [isRecordingComplete, setIsRecordingComplete] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [audioContextError, setAudioContextError] = useState<string | null>(null);
  
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
        onTranscriptionComplete(text.trim());
      }
    };

    multimodalAgentService.onTranscription(handleLiveKitTranscription);

    return () => {
      multimodalAgentService.offTranscription(handleLiveKitTranscription);
    };
  }, [onTranscriptionComplete]);

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

  const handleToggleRecording = async () => {
    // Reset any previous errors
    setAudioContextError(null);
    
    if (isVoiceEnabled) {
      // Use LiveKit for voice mode
      if (isLiveKitListening) {
        stopVoiceListening();
        multimodalAgentService.stopListening();
      } else {
        setIsInitializing(true);
        try {
          // First, try to resume the AudioContext (this requires user interaction)
          const audioContextResumed = await multimodalAgentService.resumeAudioContext();
          if (!audioContextResumed) {
            throw new Error('Failed to resume AudioContext');
          }
          
          // Then proceed with starting the voice listening
          const success = await startVoiceListening();
          if (success) {
            await multimodalAgentService.startListening();
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
      } else {
        resetTranscript();
        startRecording();
      }
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
      >
        {isInitializing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isActive ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
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
          <p className="font-medium">Audio initialization failed. Try again.</p>
        </div>
      )}

      {/* Transcript indicator */}
      {((transcript || interimTranscript) && isRecording) && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border rounded-lg py-1 px-3 text-xs shadow-lg">
          <p className="font-medium">{transcript} <span className="text-muted-foreground">{interimTranscript}</span></p>
        </div>
      )}
    </div>
  );
} 