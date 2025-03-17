'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceTranscription } from '../../services/voiceTranscriptionService';
import { cn } from '@/lib/utils';

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

  // When recording is complete and we have a transcript
  useEffect(() => {
    if (isRecordingComplete && transcript.trim()) {
      onTranscriptionComplete(transcript.trim());
      resetTranscript();
      setIsRecordingComplete(false);
    }
  }, [isRecordingComplete, transcript, onTranscriptionComplete, resetTranscript]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      setIsRecordingComplete(true);
    } else {
      resetTranscript();
      startRecording();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "relative rounded-full p-2 transition-colors",
          isRecording 
            ? "bg-red-500 text-white hover:bg-red-600" 
            : "bg-primary/10 text-primary hover:bg-primary/20",
          className
        )}
        onClick={handleToggleRecording}
        disabled={disabled}
        aria-label={isRecording ? "Stop recording" : "Start voice recording"}
      >
        {isRecording ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      
      {/* Pulsing indicator when recording */}
      {isRecording && (
        <span className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
        </span>
      )}

      {/* Transcript indicator */}
      {(transcript || interimTranscript) && isRecording && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border rounded-lg py-1 px-3 text-xs shadow-lg">
          <p className="font-medium">{transcript} <span className="text-muted-foreground">{interimTranscript}</span></p>
        </div>
      )}
    </div>
  );
} 