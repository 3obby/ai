import { useState, useCallback, useRef } from 'react';
import WebRTCTranscriptionService from '../services/webrtc-transcription-service';

export function useAudioTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptionServiceRef = useRef(WebRTCTranscriptionService.getInstance());

  const startAudioStreaming = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const service = transcriptionServiceRef.current;
      await service.startStreaming(stream);
      
      setIsStreaming(true);
      
      // Subscribe to transcription updates
      service.subscribeToUpdates((text) => {
        if (text) setInterimTranscript(text);
      });
      
    } catch (error) {
      console.error('Failed to start audio streaming:', error);
      setIsStreaming(false);
    }
  }, []);

  const stopAudioStreaming = useCallback(async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      await transcriptionServiceRef.current.stopStreaming();
      setIsStreaming(false);
      setInterimTranscript('');
      
    } catch (error) {
      console.error('Failed to stop audio streaming:', error);
    }
  }, []);

  const handleMicButtonClick = useCallback(() => {
    if (isStreaming) {
      stopAudioStreaming();
    } else {
      startAudioStreaming();
    }
  }, [isStreaming, startAudioStreaming, stopAudioStreaming]);

  return {
    // State
    isRecording,
    isStreaming,
    interimTranscript,
    // State setters
    setIsRecording,
    setIsStreaming,
    setInterimTranscript,
    // Actions
    handleMicButtonClick,
    startAudioStreaming,
    stopAudioStreaming
  };
} 