'use client';

import { useEffect, useState } from 'react';
import { Mic, Settings, Volume2, VolumeX, X } from 'lucide-react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useGroupChatContext } from '../../context/GroupChatContext';
import AudioVisualizer from './AudioVisualizer';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { Bot } from '../../types';
import { VoiceSettings, MultimodalAgentConfig } from '../../types/voice';

interface VoiceOverlayProps {
  onClose: () => void;
}

export default function VoiceOverlay({ onClose }: VoiceOverlayProps) {
  const { voiceSettings, updateVoiceSettings, autoAdjustVadSensitivity } = useVoiceSettings();
  const { state } = useGroupChatContext();
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [botAudioLevel, setBotAudioLevel] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeBot, setActiveBot] = useState<Bot | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [microphoneInfo, setMicrophoneInfo] = useState<{devices: MediaDeviceInfo[], stream: boolean | null}>({
    devices: [],
    stream: null
  });

  // Get the most recently interacted with bot
  useEffect(() => {
    // Find the most recent bot message
    const messages = state.messages || [];
    const botMessages = messages.filter(msg => msg.role === 'assistant');
    
    if (botMessages.length > 0) {
      const lastBotMessage = botMessages[botMessages.length - 1];
      const botId = lastBotMessage.sender;
      const selectedBot = state.bots?.find((bot: Bot) => bot.id === botId) || null;
      setActiveBot(selectedBot);
    } else if (state.bots && state.bots.length > 0) {
      // Default to first bot if no messages
      setActiveBot(state.bots[0]);
    }
  }, [state.messages, state.bots]);

  // Listen for audio level changes
  useEffect(() => {
    // Subscribe to audio level updates from the multimodal agent service
    const audioLevelInterval = setInterval(() => {
      const level = multimodalAgentService.getCurrentAudioLevel();
      setUserAudioLevel(level);
    }, 50);

    // Simulate bot audio levels for now - would be replaced with actual bot audio level
    const botAudioInterval = setInterval(() => {
      if (multimodalAgentService.isSpeaking()) {
        setBotAudioLevel(Math.random() * 0.5 + 0.2);
      } else {
        setBotAudioLevel(0);
      }
    }, 50);

    return () => {
      clearInterval(audioLevelInterval);
      clearInterval(botAudioInterval);
    };
  }, []);

  // Listen for transcription status
  useEffect(() => {
    const handleTranscription = (text: string, isFinal: boolean) => {
      if (!isFinal) {
        setIsTranscribing(true);
        setCurrentTranscription(text || 'Processing speech...');
      } else {
        // When transcription is final, show it briefly then clear
        setCurrentTranscription(text);
        setTimeout(() => {
          setIsTranscribing(false);
          setCurrentTranscription('');
        }, 2000);
      }
    };

    multimodalAgentService.onTranscription(handleTranscription);

    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, []);

  // Add function to debug microphone
  const debugMicrophone = async () => {
    try {
      // Get list of audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      // Try to get a microphone stream
      let hasStream = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        hasStream = !!stream;
        // Stop the stream immediately to not interfere with LiveKit
        stream.getTracks().forEach(track => track.stop());
      } catch (streamError) {
        console.error('Failed to get microphone stream:', streamError);
      }
      
      setMicrophoneInfo({
        devices: audioDevices,
        stream: hasStream
      });
      
      setShowDebugInfo(true);
    } catch (error) {
      console.error('Error debugging microphone:', error);
    }
  };

  const handleVadSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateVoiceSettings({ vadThreshold: value });
  };

  const handleVoiceSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    multimodalAgentService.updateConfig({ voiceSpeed: value });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-background/80 backdrop-blur-md border-t border-border pb-safe-area-inset-bottom">
      <div className="container px-4 py-3 mx-auto">
        {/* Top bar with close button */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Voice Mode</h3>
          <button 
            className="p-1 rounded-full hover:bg-muted"
            onClick={onClose}
            aria-label="Close voice mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Development mode notice */}
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            Development Mode: Real-time speech transcription is disabled in local development.
          </p>
          <p className="text-xs text-yellow-500/80 mt-1">
            In production, this would connect to OpenAI Whisper for high-quality speech recognition.
          </p>
        </div>

        {/* Current transcription status */}
        {isTranscribing && (
          <div className="mb-3 p-2 bg-primary/10 rounded-md">
            <p className="text-xs font-medium">
              {currentTranscription ? (
                <>Transcribing: <span className="italic">{currentTranscription}</span></>
              ) : (
                'Listening...'
              )}
            </p>
          </div>
        )}

        {/* Bot info and audio visualization */}
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0 mr-3">
            {activeBot && (
              <div className="relative">
                <img 
                  src={activeBot.avatar || '/bot-default-avatar.png'} 
                  alt={activeBot.name}
                  className="w-12 h-12 rounded-full" 
                />
                {botAudioLevel > 0 && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full"></span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{activeBot?.name || 'AI Assistant'}</h4>
              <span className="text-xs text-muted-foreground">
                {multimodalAgentService.isSpeaking() ? 'Speaking' : 'Listening'}
              </span>
            </div>
            
            {/* Bot audio visualizer */}
            <div className="mt-1 h-8">
              <AudioVisualizer 
                audioLevel={botAudioLevel} 
                color={botAudioLevel > 0 ? 'bg-blue-500' : 'bg-blue-300/30'} 
              />
            </div>
          </div>
        </div>

        {/* User audio visualizer */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <Mic className="w-4 h-4 mr-1" />
              <span className="text-xs">Your voice</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {userAudioLevel > (voiceSettings.vadThreshold || 0.3) ? 'Speaking' : 'Silent'}
            </span>
          </div>
          <div className="h-6">
            <AudioVisualizer 
              audioLevel={userAudioLevel} 
              color={userAudioLevel > (voiceSettings.vadThreshold || 0.3) ? 'bg-green-500' : 'bg-gray-300'} 
            />
          </div>
        </div>

        {/* Quick settings toggle */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              className="text-xs flex items-center text-muted-foreground hover:text-foreground"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-3 h-3 mr-1" />
              {showSettings ? 'Hide Settings' : 'Show Settings'}
            </button>
            
            {/* Debug button */}
            <button
              className="text-xs flex items-center text-muted-foreground hover:text-foreground"
              onClick={debugMicrophone}
            >
              <span className="text-xs">Debug Mic</span>
            </button>
          </div>
          
          <button
            className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded"
            onClick={autoAdjustVadSensitivity}
          >
            Auto-adjust microphone
          </button>
        </div>

        {/* Microphone debug info */}
        {showDebugInfo && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="bg-black/10 dark:bg-white/5 p-2 rounded text-xs font-mono overflow-auto">
              <p className="font-medium mb-1">Microphone Debug Info:</p>
              <p>Devices found: {microphoneInfo.devices.length}</p>
              <p>Stream access: {microphoneInfo.stream ? 'Yes' : 'No'}</p>
              <p>Current level: {userAudioLevel.toFixed(3)}</p>
              <p>Threshold: {voiceSettings.vadThreshold?.toFixed(3) || '0.300'}</p>
              
              {microphoneInfo.devices.length > 0 && (
                <div className="mt-1">
                  <p className="font-medium">Available devices:</p>
                  {microphoneInfo.devices.map((device, index) => (
                    <div key={index} className="ml-2 mb-1">
                      <p>• {device.label || `Device ${index + 1}`}</p>
                    </div>
                  ))}
                </div>
              )}

              <button 
                className="mt-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded"
                onClick={() => setShowDebugInfo(false)}
              >
                Hide Debug Info
              </button>
            </div>
          </div>
        )}

        {/* Voice settings (collapsible) */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="mb-3">
              <label className="flex justify-between text-xs mb-1">
                <span>Microphone sensitivity</span>
                <span>{(voiceSettings.vadThreshold || 0.3).toFixed(2)}</span>
              </label>
              <input 
                type="range" 
                min="0.1" 
                max="0.9" 
                step="0.05"
                value={voiceSettings.vadThreshold || 0.3}
                onChange={handleVadSensitivityChange}
                className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="mb-3">
              <label className="flex justify-between text-xs mb-1">
                <span>Voice speed</span>
                <span>{(multimodalAgentService.getConfig()?.voiceSpeed || 1).toFixed(1)}x</span>
              </label>
              <input 
                type="range" 
                min="0.5" 
                max="2.0" 
                step="0.1"
                value={multimodalAgentService.getConfig()?.voiceSpeed || 1}
                onChange={handleVoiceSpeedChange}
                className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-2 rounded flex items-center justify-center">
                <Volume2 className="w-3 h-3 mr-1" />
                Test voice
              </button>
              <button className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-2 rounded flex items-center justify-center">
                <VolumeX className="w-3 h-3 mr-1" />
                Mute
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 