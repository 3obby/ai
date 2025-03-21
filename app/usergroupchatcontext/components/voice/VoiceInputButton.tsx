'use client';

import React, { useState, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import AudioVisualizer from './AudioVisualizer';
import useEventBus from '../../hooks/useEventBus';
import { VoiceModeState } from '../../services/voice/VoiceModeManager';
import { useVoiceStateStore } from '../../hooks/useVoiceStateStore';
import { cn } from '@/lib/utils';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useGroupChat } from '../../hooks/useGroupChat';
import { useBotRegistry } from '../../context/BotRegistryProvider';

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
    currentVoiceModeState,
    error,
    voiceLevel,
    setVoiceLevel,
    toggleVoiceMode
  } = useVoiceStateStore();

  // Required for starting voice mode
  const { state: groupChatState } = useGroupChat();
  const { state: botRegistryState } = useBotRegistry();
  
  const [isInitializing, setIsInitializing] = useState(false);

  // Set button size based on prop
  const buttonSize = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }[size];

  // Track audio level for visualizer using the useEventBus hook
  useEventBus(
    isRecording ? 'audio:level' : undefined, 
    (data) => setVoiceLevel(data.level)
  );
  
  // Handle transcription events using the useEventBus hook
  const handleInterimTranscription = onTranscription 
    ? (data: { text: string; timestamp: number }) => onTranscription(data.text, false)
    : undefined;
    
  const handleFinalTranscription = onTranscription 
    ? (data: { text: string; timestamp: number }) => onTranscription(data.text, true)
    : undefined;
  
  // Subscribe to interim transcriptions
  useEventBus(
    onTranscription ? 'transcription:interim' : undefined,
    handleInterimTranscription
  );
  
  // Subscribe to final transcriptions
  useEventBus(
    onTranscription ? 'transcription:final' : undefined,
    handleFinalTranscription
  );
  
  // Track initialization state based on current voice mode state
  useEffect(() => {
    setIsInitializing(currentVoiceModeState === VoiceModeState.INITIALIZING);
  }, [currentVoiceModeState]);

  // Handle voice button click
  const handleVoiceButtonClick = async () => {
    if (!isVoiceEnabled) return;
    
    try {
      // Call toggleVoiceMode with the required parameters
      toggleVoiceMode(
        groupChatState.settings.activeBotIds,
        botRegistryState.availableBots,
        groupChatState.messages
      );
    } catch (error) {
      console.error('Error toggling voice mode:', error);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleVoiceButtonClick}
        disabled={isInitializing}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        className={cn(
          'rounded-full flex items-center justify-center transition-all',
          buttonSize,
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground',
          isInitializing && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isRecording ? (
          <StopIcon className="h-5 w-5" />
        ) : (
          <MicrophoneIcon className="h-5 w-5" />
        )}
      </button>
      
      {showVisualizer && isRecording && (
        <AudioVisualizer
          audioLevel={voiceLevel}
          className="absolute -top-1 -right-1 -bottom-1 -left-1"
        />
      )}
    </div>
  );
} 