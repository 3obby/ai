'use client';

import { useState, useEffect, useCallback } from 'react';
import unifiedTranscriptionService from '../services/voiceTranscriptionService';

export interface UseVoiceTranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface UseVoiceTranscriptionResult {
  transcript: string;
  interimTranscript: string;
  isRecording: boolean;
  isListening: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}

/**
 * Hook that provides voice transcription functionality
 * This is a compatibility layer that uses the unified transcription service
 * to provide the same interface as the old useVoiceTranscription hook
 */
export function useVoiceTranscription(
  options: UseVoiceTranscriptionOptions = {}
): UseVoiceTranscriptionResult {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the Web Speech API directly for browser support detection
  const isSupportedValue = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );
  
  // Set up event listeners for the unified transcription service
  useEffect(() => {
    if (!isRecording) return;

    // Handle interim transcription updates
    const handleInterimTranscription = (record: any) => {
      setInterimTranscript(record.text);
    };

    // Handle final transcription messages
    const handleTranscriptionMessage = (message: any) => {
      setTranscript(prev => prev ? `${prev} ${message.content}`.trim() : message.content);
      setInterimTranscript('');
    };

    // Subscribe to events
    unifiedTranscriptionService.on('interim-transcription', handleInterimTranscription);
    unifiedTranscriptionService.on('transcription-message', handleTranscriptionMessage);

    // Cleanup
    return () => {
      unifiedTranscriptionService.off('interim-transcription', handleInterimTranscription);
      unifiedTranscriptionService.off('transcription-message', handleTranscriptionMessage);
    };
  }, [isRecording]);

  // Start recording function
  const startRecording = useCallback(() => {
    if (isRecording) return;
    
    try {
      // In this compatibility layer, we don't actually start the unified service
      // directly, as that would be done elsewhere in the app through LiveKit
      // Instead, we just update our local state to match
      setIsRecording(true);
      setIsListening(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error starting recording');
      console.error('Error starting voice transcription:', err);
    }
  }, [isRecording]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    
    try {
      // Similar to startRecording, we're not directly controlling the service
      // but just updating our state
      setIsRecording(false);
      setIsListening(false);
      setInterimTranscript('');
    } catch (err) {
      console.error('Error stopping voice transcription:', err);
    }
  }, [isRecording]);

  // Reset transcript function
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    interimTranscript,
    isRecording,
    isListening,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
    isSupported: isSupportedValue
  };
}

export default useVoiceTranscription; 