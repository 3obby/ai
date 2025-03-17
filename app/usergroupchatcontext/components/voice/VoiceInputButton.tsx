'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import AudioVisualizer from './AudioVisualizer';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';

interface VoiceInputButtonProps {
  onTranscription?: (text: string, isFinal: boolean) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showVisualizer?: boolean;
}

export default function VoiceInputButton({
  onTranscription,
  className = '',
  size = 'md',
  showVisualizer = true
}: VoiceInputButtonProps) {
  const {
    isVoiceEnabled,
    isListening,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening
  } = useVoiceSettings();
  
  const [audioLevel, setAudioLevel] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);

  // Set button size based on prop
  const buttonSize = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }[size];

  // Handle transcription events
  useEffect(() => {
    if (!onTranscription) return;

    const handleTranscription = (text: string, isFinal: boolean) => {
      onTranscription(text, isFinal);
    };

    multimodalAgentService.onTranscription(handleTranscription);

    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, [onTranscription]);

  // Toggle listening state
  const toggleListening = async () => {
    if (isListening) {
      stopVoiceListening();
      multimodalAgentService.stopListening();
    } else {
      setIsInitializing(true);
      try {
        // First, resume the AudioContext (user gesture required)
        await multimodalAgentService.resumeAudioContext();
        
        const success = await startVoiceListening();
        if (success) {
          await multimodalAgentService.startListening();
        }
      } catch (error) {
        console.error('Failed to start listening:', error);
      } finally {
        setIsInitializing(false);
      }
    }
  };

  // Disable button if voice is not enabled
  if (!isVoiceEnabled) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={isInitializing}
        className={`rounded-full bg-primary text-white flex items-center justify-center transition-all ${buttonSize} ${
          isListening ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-primary/90'
        } ${isInitializing ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
      >
        {isInitializing ? (
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
        ) : isListening ? (
          <StopIcon className="h-5 w-5" />
        ) : (
          <MicrophoneIcon className="h-5 w-5" />
        )}
      </button>
      
      {showVisualizer && isListening && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-32">
          <AudioVisualizer level={audioLevel} />
        </div>
      )}
    </div>
  );
} 