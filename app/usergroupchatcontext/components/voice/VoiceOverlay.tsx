'use client';

import { useEffect, useState } from 'react';
import { Mic, Settings, Volume2, VolumeX, X } from 'lucide-react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useGroupChatContext } from '../../context/GroupChatContext';
import AudioVisualizer from './AudioVisualizer';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { Bot } from '../../types';
import { VoiceSettings, MultimodalAgentConfig } from '../../types/voice';
import voiceActivityService from '../../services/livekit/voice-activity-service';

interface VoiceOverlayProps {
  onClose: () => void;
  isActive?: boolean;
  interimText?: string;
  errorMessage?: { title: string; message: string } | null;
  lowVolumeWarning?: boolean;
  buttonText?: string;
}

export default function VoiceOverlay({ 
  onClose,
  isActive = true,
  interimText = '',
  errorMessage = null,
  lowVolumeWarning = false,
  buttonText = 'Voice Mode'
}: VoiceOverlayProps) {
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
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [currentVoice, setCurrentVoice] = useState<string>(
    multimodalAgentService.getConfig().voice || 'ash'
  );

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
    // Subscribe to audio level updates from the voice activity service
    const audioLevelInterval = setInterval(() => {
      const state = voiceActivityService.getState();
      setUserAudioLevel(state.level);
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
          <h3 className="text-sm font-medium">{buttonText}</h3>
          <button 
            className="p-1 rounded-full hover:bg-muted"
            onClick={onClose}
            aria-label="Close voice mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message display */}
        {errorMessage && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md">
            <p className="text-xs font-medium">{errorMessage.title}</p>
            <p className="text-xs">{errorMessage.message}</p>
          </div>
        )}

        {/* Low volume warning */}
        {lowVolumeWarning && (
          <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-md">
            <p className="text-xs font-medium">Low microphone volume detected</p>
            <p className="text-xs">Check your microphone or speak louder</p>
          </div>
        )}

        {/* Current transcription status */}
        {(isTranscribing || interimText) && (
          <div className="mb-3 p-2 bg-primary/10 rounded-md">
            <p className="text-xs font-medium">
              {currentTranscription || interimText ? (
                <>Transcribing: <span className="italic">{currentTranscription || interimText}</span></>
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
            <h4 className="text-sm font-medium mb-2">Voice Settings</h4>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs block mb-1">Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className={`text-xs px-2 py-1 rounded ${currentVoice === 'ash' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => {
                      multimodalAgentService.updateConfig({ voice: 'ash' });
                      setCurrentVoice('ash');
                    }}
                  >
                    Ash (Female)
                  </button>
                  <button 
                    className={`text-xs px-2 py-1 rounded ${currentVoice === 'coral' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => {
                      multimodalAgentService.updateConfig({ voice: 'coral' });
                      setCurrentVoice('coral');
                    }}
                  >
                    Coral (Female)
                  </button>
                  <button 
                    className={`text-xs px-2 py-1 rounded ${currentVoice === 'alloy' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => {
                      multimodalAgentService.updateConfig({ voice: 'alloy' });
                      setCurrentVoice('alloy');
                    }}
                  >
                    Alloy (Neutral)
                  </button>
                  <button 
                    className={`text-xs px-2 py-1 rounded ${currentVoice === 'echo' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => {
                      multimodalAgentService.updateConfig({ voice: 'echo' });
                      setCurrentVoice('echo');
                    }}
                  >
                    Echo (Male)
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs block mb-1">Voice Quality</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
                    onClick={() => multimodalAgentService.updateConfig({ voiceQuality: 'high-quality' })}
                  >
                    High Quality
                  </button>
                  <button 
                    className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                    onClick={() => multimodalAgentService.updateConfig({ voiceQuality: 'standard' })}
                  >
                    Standard
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs block mb-1">Voice Speed: {voiceSpeed.toFixed(1)}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceSpeed}
                  onChange={(e) => {
                    const newSpeed = parseFloat(e.target.value);
                    setVoiceSpeed(newSpeed);
                    multimodalAgentService.updateConfig({ voiceSpeed: newSpeed });
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 