'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useOpenAIRealtime } from '../../services/openaiRealtimeService';
import { cn } from '@/lib/utils';

interface OpenAIVoiceButtonProps {
  onTranscriptionComplete: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
}

export function OpenAIVoiceButton({
  onTranscriptionComplete,
  className,
  disabled = false,
}: OpenAIVoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [shouldCapture, setShouldCapture] = useState(false);
  
  const {
    isRecording,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useOpenAIRealtime({
    language: 'en', // Default language
  });

  // Handle finish recording
  useEffect(() => {
    // When recording is stopped and we have a transcript
    if (!isRecording && shouldCapture && transcript.trim()) {
      onTranscriptionComplete(transcript.trim());
      resetTranscript();
      setShouldCapture(false);
    }
  }, [isRecording, transcript, shouldCapture, onTranscriptionComplete, resetTranscript]);
  
  // Animation for pulsing effect
  const [isPulsing, setIsPulsing] = useState(false);
  
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setIsPulsing(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
    setIsPulsing(false);
  }, [isRecording]);

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording and set the flag to capture the result
      setShouldCapture(true);
      await stopRecording();
      setIsListening(false);
    } else {
      // Start recording
      resetTranscript();
      try {
        await startRecording();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    }
  };

  // If there's an error, log it
  useEffect(() => {
    if (error) {
      console.error('Voice recording error:', error);
    }
  }, [error]);

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
          <span className={cn(
            "absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75",
            isPulsing ? "scale-125" : "scale-100",
            "transition-all duration-500"
          )}></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
        </span>
      )}

      {/* Transcript indicators */}
      {(transcript || interimTranscript) && isRecording && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border rounded-lg py-1 px-3 text-xs shadow-lg max-w-[250px]">
          <p className="font-medium">
            {transcript} 
            <span className="text-muted-foreground">{interimTranscript}</span>
          </p>
        </div>
      )}
    </div>
  );
} 