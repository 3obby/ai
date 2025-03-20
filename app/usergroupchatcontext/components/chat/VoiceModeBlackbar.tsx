'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Mic, X, Volume2, VolumeX, Settings } from 'lucide-react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useGroupChatContext } from '../../context/GroupChatContext';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { Bot } from '../../types';
import voiceActivityService from '../../services/livekit/voice-activity-service';
import { cn } from '@/lib/utils';
import voiceModeManager from '../../services/voice/VoiceModeManager';

// Inline AudioVisualizer to avoid import issues
interface AudioVisualizerProps {
  audioLevel: number; // 0-1 scale
  color?: string;
  barCount?: number;
  className?: string;
}

function AudioVisualizer({
  audioLevel,
  color = 'bg-primary',
  barCount = 20,
  className
}: AudioVisualizerProps) {
  // Generate visualization bars based on current audio level
  const bars = useMemo(() => {
    const bars = [];
    const normalizedLevel = Math.min(Math.max(audioLevel, 0), 1);
    
    for (let i = 0; i < barCount; i++) {
      // Calculate height for this bar (0-100%)
      let heightPercentage = 0;
      
      // Generate a smooth, natural-looking visualization
      // Each bar has a different threshold at which it becomes visible
      const barThreshold = i / barCount;
      
      if (normalizedLevel > barThreshold) {
        // Calculate how far above threshold this level is (0-1)
        const aboveThreshold = (normalizedLevel - barThreshold) / (1 - barThreshold);
        
        // Add some randomness for a more natural look
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2
        heightPercentage = Math.min(aboveThreshold * randomFactor * 100, 100);
      }
      
      bars.push(
        <div 
          key={i} 
          className={cn("w-1 rounded-sm mx-0.5", color)}
          style={{ 
            height: `${heightPercentage}%`,
            transition: 'height 50ms ease'
          }}
        />
      );
    }
    
    return bars;
  }, [audioLevel, barCount, color]);

  return (
    <div 
      className={cn(
        "w-full h-full flex items-end justify-center", 
        className
      )}
    >
      {bars}
    </div>
  );
}

interface VoiceModeBlackbarProps {
  onClose: () => void;
}

export default function VoiceModeBlackbar({ onClose }: VoiceModeBlackbarProps) {
  const { voiceSettings, updateVoiceSettings } = useVoiceSettings();
  const { state } = useGroupChatContext();
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [botAudioLevel, setBotAudioLevel] = useState(0);
  const [activeBot, setActiveBot] = useState<Bot | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [muteAudio, setMuteAudio] = useState(false);

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
    // Subscribe to audio level updates
    const audioLevelInterval = setInterval(() => {
      const state = voiceActivityService.getState();
      setUserAudioLevel(state.level);
    }, 50);

    // Simulate bot audio levels - would be replaced with actual bot audio level
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

  const handleCloseVoiceMode = () => {
    // Use VoiceModeManager to properly handle the voice-to-text transition
    voiceModeManager.deactivateVoiceMode();
    
    // Call onClose to notify parent components
    onClose();
  };

  const toggleMute = () => {
    const newMuteState = !muteAudio;
    setMuteAudio(newMuteState);
    // Instead we can just update the UI state for now
    // The actual muting functionality could be implemented in the service later
  };

  // Determine if the user is currently speaking
  const isSpeaking = userAudioLevel > (voiceSettings.vadThreshold || 0.3);

  return (
    <div className="blackbar voice-mode border-t bg-background/80 backdrop-blur-md p-3 pb-safe-area-inset-bottom">
      {/* Current transcription status */}
      {isTranscribing && currentTranscription && (
        <div className="mb-2 p-2 bg-primary/10 rounded-md">
          <p className="text-xs font-medium">
            <span className="italic">{currentTranscription}</span>
          </p>
        </div>
      )}
      
      <div className="flex items-center justify-between gap-2">
        {/* User audio visualizer */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center text-xs font-medium">
              <Mic className="w-3 h-3 mr-1" />
              <span>You</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {isSpeaking ? 'Speaking' : 'Silent'}
            </span>
          </div>
          <div className="h-6 bg-muted/20 rounded-md overflow-hidden">
            <AudioVisualizer 
              audioLevel={userAudioLevel} 
              color={isSpeaking ? 'bg-green-500' : 'bg-gray-300'} 
              barCount={16}
              className="px-1"
            />
          </div>
        </div>
        
        {/* Bot indicator and controls */}
        <div className="flex items-center gap-2">
          {/* Bot avatar */}
          {activeBot && (
            <div className="relative">
              <img 
                src={activeBot.avatar || '/bot-default-avatar.png'} 
                alt={activeBot.name}
                className="w-8 h-8 rounded-full border border-primary/20" 
              />
              {botAudioLevel > 0 && (
                <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></span>
              )}
            </div>
          )}
          
          {/* Control buttons */}
          <button 
            onClick={toggleMute}
            className={cn(
              "rounded-full p-2 transition-colors",
              muteAudio ? "bg-red-500 text-white" : "bg-muted hover:bg-muted/80"
            )}
            aria-label={muteAudio ? "Unmute audio" : "Mute audio"}
            title={muteAudio ? "Unmute audio" : "Mute audio"}
          >
            {muteAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={handleCloseVoiceMode}
            className="rounded-full p-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="Exit voice mode"
            title="Exit voice mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 