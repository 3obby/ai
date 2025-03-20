'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import AudioVisualizer from './AudioVisualizer';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import audioContextManager from '../../services/voice/AudioContextManager';
import voiceActivityDetector from '../../services/voice/VoiceActivityDetector';
import voiceModeManager, { VoiceModeState } from '../../services/voice/VoiceModeManager';
import connectionManager, { ConnectionState } from '../../services/connection/ConnectionManager';
import eventBus from '../../services/events/EventBus';

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

  // Track audio level for visualizer
  useEffect(() => {
    if (!isListening) return;
    
    const handleAudioLevel = (data: { level: number }) => {
      setAudioLevel(data.level);
    };
    
    // Use the EventBus for listening to audio level events
    const unsubscribe = eventBus.on('audio:level', handleAudioLevel);
    
    return () => {
      unsubscribe();
    };
  }, [isListening]);

  // Handle transcription events
  useEffect(() => {
    if (!onTranscription) return;

    const handleInterimTranscription = (data: { text: string; timestamp: number }) => {
      onTranscription(data.text, false);
    };

    const handleFinalTranscription = (data: { text: string; timestamp: number }) => {
      onTranscription(data.text, true);
    };

    // Use the EventBus for transcription events
    const unsubscribeInterim = eventBus.on('transcription:interim', handleInterimTranscription);
    const unsubscribeFinal = eventBus.on('transcription:final', handleFinalTranscription);

    return () => {
      unsubscribeInterim();
      unsubscribeFinal();
    };
  }, [onTranscription]);

  // Handle voice mode state changes
  useEffect(() => {
    const handleVoiceModeStateChange = (data: { 
      active: boolean; 
      timestamp: number;
      previousState?: string;
      currentState: string;
    }) => {
      if (data.currentState === 'error') {
        setIsInitializing(false);
        console.error('Voice mode error:', voiceModeManager.getError());
      }
    };
    
    // Use the EventBus for voice mode state changes
    const unsubscribe = eventBus.on('voicemode:changed', handleVoiceModeStateChange);
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle connection state changes
  useEffect(() => {
    const handleConnectionStateChange = (data: { prevState: ConnectionState; state: ConnectionState }) => {
      if (data.state === ConnectionState.ERROR) {
        setIsInitializing(false);
        console.error('Connection error:', connectionManager.getError());
      } else if (data.state === ConnectionState.CONNECTED) {
        // Connection successful, now proceed with voice processing
        if (isInitializing) {
          startVoiceProcessing();
        }
      }
    };
    
    // Listen for connection state changes directly from the ConnectionManager
    connectionManager.on('state:changed', handleConnectionStateChange);
    
    return () => {
      connectionManager.off('state:changed', handleConnectionStateChange);
    };
  }, [isInitializing]);
  
  // Start voice processing after successful connection
  const startVoiceProcessing = async () => {
    try {
      // Get the stream from connection manager
      const stream = connectionManager.getLocalStream();
      
      if (!stream) {
        throw new Error('No media stream available');
      }
      
      // Start voice activity detection
      await voiceActivityDetector.startDetection(stream);
      
      // Activate voice mode in the settings
      await startVoiceListening();
      
      // Start the multimodal agent
      await multimodalAgentService.startListening();
      
      setIsInitializing(false);
    } catch (error) {
      console.error('Failed to start voice processing:', error);
      setIsInitializing(false);
      
      // Emit error event
      eventBus.emit('voicemode:error', { 
        error: error instanceof Error ? error : new Error(String(error)),
        context: 'start_processing' 
      });
    }
  };

  // Toggle listening state
  const toggleListening = async () => {
    if (isListening) {
      // Stop listening
      stopVoiceListening();
      voiceActivityDetector.stopDetection();
      multimodalAgentService.stopListening();
      
      // Disconnect media
      connectionManager.disconnect();
      
      // Emit voice stopped event
      eventBus.emit('voice:stopped', { 
        timestamp: Date.now(),
        duration: 0 // We don't track duration here
      });
    } else {
      // Start listening
      setIsInitializing(true);
      
      try {
        // First, initialize and resume the AudioContext (user gesture required)
        audioContextManager.initialize();
        await audioContextManager.resumeAudioContext();
        
        // Initialize connection manager if needed
        connectionManager.initialize({
          enableAudio: true,
          enableVideo: false,
          audioConstraints: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        // Connect to get media stream
        await connectionManager.connect();
        
        // If we're already connected, start voice processing directly
        if (connectionManager.isConnected()) {
          await startVoiceProcessing();
        }
        // Otherwise, the connection state change handler will call startVoiceProcessing
        
      } catch (error) {
        console.error('Failed to start listening:', error);
        setIsInitializing(false);
        
        // Emit error event
        eventBus.emit('voicemode:error', { 
          error: error instanceof Error ? error : new Error(String(error)),
          context: 'connection' 
        });
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
          <AudioVisualizer audioLevel={audioLevel} />
        </div>
      )}
    </div>
  );
} 