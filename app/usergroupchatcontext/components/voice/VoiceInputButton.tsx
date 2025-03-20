'use client';

import React, { useState, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import AudioVisualizer from './AudioVisualizer';
import eventBus from '../../services/events/EventBus';
import { VoiceModeState } from '../../services/voice/VoiceModeManager';
import { useVoiceState } from '../../hooks/useVoiceState';
import { cn } from '@/lib/utils';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';

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
  // Use our new hooks for centralized state management
  const { isVoiceEnabled } = useVoiceSettings();
  const { 
    isRecording, 
    isProcessing,
    currentState,
    toggleVoiceMode,
    lastError
  } = useVoiceState();
  
  const [audioLevel, setAudioLevel] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);

  // Set button size based on prop
  const buttonSize = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }[size];

  // Track audio level for visualizer
  useEffect(() => {
    if (!isRecording) return;
    
    const handleAudioLevel = (data: { level: number }) => {
      setAudioLevel(data.level);
    };
    
    // Subscribe to audio level events
    eventBus.on('audio:level', handleAudioLevel);
    
    return () => {
      eventBus.off('audio:level', handleAudioLevel);
    };
  }, [isRecording]);
  
  // Handle transcription events
  useEffect(() => {
    if (!onTranscription) return;
    
    const handleInterimTranscription = (data: { text: string; timestamp: number }) => {
      onTranscription(data.text, false);
    };
    
    const handleFinalTranscription = (data: { text: string; timestamp: number }) => {
      onTranscription(data.text, true);
    };
    
    // Subscribe to transcription events
    eventBus.on('transcription:interim', handleInterimTranscription);
    eventBus.on('transcription:final', handleFinalTranscription);
    
    return () => {
      eventBus.off('transcription:interim', handleInterimTranscription);
      eventBus.off('transcription:final', handleFinalTranscription);
    };
  }, [onTranscription]);
  
  // Track initialization state based on current voice mode state
  useEffect(() => {
    setIsInitializing(currentState === VoiceModeState.INITIALIZING);
  }, [currentState]);

  // Handle voice button click
  const handleVoiceButtonClick = async () => {
    if (!isVoiceEnabled) return;
    
    try {
      toggleVoiceMode();
    } catch (error) {
      console.error('Error toggling voice mode:', error);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        className={cn(
          buttonSize,
          'rounded-full flex items-center justify-center transition-all duration-200',
          isRecording
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-primary hover:bg-primary-dark text-white',
          isInitializing ? 'opacity-70 cursor-wait' : 'opacity-100',
          !isVoiceEnabled ? 'opacity-50 cursor-not-allowed' : '',
          className
        )}
        onClick={handleVoiceButtonClick}
        disabled={isInitializing || !isVoiceEnabled}
        aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
      >
        {isInitializing ? (
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
        ) : isRecording ? (
          <StopIcon className="h-5 w-5" />
        ) : (
          <MicrophoneIcon className="h-5 w-5" />
        )}
      </button>
      
      {showVisualizer && isRecording && (
        <div className="mt-2">
          <AudioVisualizer audioLevel={audioLevel} />
        </div>
      )}
    </div>
  );
} 