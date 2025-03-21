'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import unifiedTranscriptionService from '../../services/voiceTranscriptionService';

// Define Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface HoldRecordVoiceMessageButtonProps {
  onTranscriptionComplete: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function HoldRecordVoiceMessageButton({
  onTranscriptionComplete,
  className,
  disabled = false
}: HoldRecordVoiceMessageButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [interimText, setInterimText] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionActiveRef = useRef<boolean>(false);

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        // Set up handlers on initialization
        if (recognitionRef.current) {
          // Handle recognition ending
          recognitionRef.current.onend = () => {
            recognitionActiveRef.current = false;
            console.log('Speech recognition ended');
          };
          
          // Handle recognition errors
          recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            recognitionActiveRef.current = false;
          };
        }
      }
    }

    // Add window blur event listener to handle cases where button loses focus
    const handleWindowBlur = () => {
      if (isRecording) {
        stopRecording();
      }
    };
    
    window.addEventListener('blur', handleWindowBlur);

    // Also listen for interim transcription updates
    const handleInterimTranscription = (record: any) => {
      if (isRecording) {
        setInterimText(record.text);
      }
    };

    unifiedTranscriptionService.on('interim-transcription', handleInterimTranscription);
    
    return () => {
      // Clean up on unmount
      window.removeEventListener('blur', handleWindowBlur);
      unifiedTranscriptionService.off('interim-transcription', handleInterimTranscription);
      stopRecording();
    };
  }, [isRecording]);

  const startRecording = () => {
    if (disabled) return;
    
    try {
      if (recognitionRef.current) {
        // First check if recognition is already active
        if (recognitionActiveRef.current) {
          console.log('Recognition already active, stopping first');
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore errors when stopping
            console.log('Error stopping existing recognition:', e);
          }
          
          // Small delay to ensure it's properly stopped
          setTimeout(() => {
            startRecording();
          }, 100);
          return;
        }
        
        // Set up result handler
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          try {
            const transcript = event.results[event.results.length - 1][0].transcript;
            const isFinal = event.results[event.results.length - 1].isFinal;
            
            // Use the unified transcription service to process the transcription
            if (transcript) {
              unifiedTranscriptionService.processTranscription(transcript, isFinal);
            }
          } catch (error) {
            console.error('Error processing recognition result:', error);
          }
        };
        
        recognitionRef.current.onend = () => {
          recognitionActiveRef.current = false;
          // Only restart if we're still recording and it ended unexpectedly
          if (isRecording && recordingStartTimeRef.current) {
            try {
              console.log('Recognition ended unexpectedly, restarting...');
              startRecognitionSafely();
            } catch (e) {
              console.error('Error restarting recognition:', e);
            }
          }
        };
        
        // Start recognition
        startRecognitionSafely();
        
        // Set recording state
        setIsRecording(true);
        recordingStartTimeRef.current = Date.now();
        
        // Start timer for UI
        timerRef.current = setInterval(() => {
          if (recordingStartTimeRef.current) {
            const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
            setRecordingDuration(duration);
          }
        }, 1000);
        
        // Subscribe to transcription events
        const handleTranscriptionMessage = (message: any) => {
          onTranscriptionComplete(message.content);
        };
        
        unifiedTranscriptionService.on('transcription-message', handleTranscriptionMessage);
        
        // Store the handler for cleanup
        (window as any).transcriptionHandler = handleTranscriptionMessage;
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  
  // Helper function to safely start recognition
  const startRecognitionSafely = () => {
    if (recognitionRef.current && !recognitionActiveRef.current) {
      try {
        recognitionRef.current.start();
        recognitionActiveRef.current = true;
        console.log('Speech recognition started successfully');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        recognitionActiveRef.current = false;
      }
    }
  };

  const stopRecording = () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop recognition
    if (recognitionRef.current && recognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionActiveRef.current = false;
      } catch (e) {
        // Ignore errors when stopping
        console.log('Error stopping recognition during cleanup:', e);
      }
    }
    
    // Reset state
    setIsRecording(false);
    setRecordingDuration(0);
    setInterimText('');
    recordingStartTimeRef.current = null;
    
    // Remove event listener
    if ((window as any).transcriptionHandler) {
      unifiedTranscriptionService.off('transcription-message', (window as any).transcriptionHandler);
      (window as any).transcriptionHandler = null;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        onTouchCancel={stopRecording}
        onContextMenu={(e) => {
          // Prevent context menu and ensure recording stops
          e.preventDefault();
          stopRecording();
        }}
        className={cn(
          "rounded-full p-2 flex items-center justify-center w-9 h-9 transition-colors touch-target",
          isRecording 
            ? "bg-red-500 text-white animate-pulse" 
            : "bg-muted/60 text-muted-foreground hover:bg-muted/80",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        aria-label="Hold to record voice message"
      >
        <Mic className="h-5 w-5" />
      </button>
      
      {isRecording && (
        <>
          {/* Recording duration indicator */}
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {recordingDuration}
          </span>
          
          {/* Interim text indicator */}
          {interimText && (
            <div className="absolute -bottom-8 right-0 bg-background text-foreground text-xs py-1 px-2 rounded shadow-sm border border-input whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
              {interimText}
            </div>
          )}
        </>
      )}
    </div>
  );
} 