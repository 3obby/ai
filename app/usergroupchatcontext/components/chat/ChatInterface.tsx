'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { SettingsModal } from '../settings/SettingsModal';
import { BotSettingsModal } from '../settings/BotSettingsModal';
import { Settings, Mic, VolumeX, Volume2 } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { SettingsPanel } from '../settings/SettingsPanel';
import { VoicePlaybackControls } from '../voice/VoicePlaybackControls';
import { VoiceActivityIndicator } from '../voice/VoiceActivityIndicator';
import VoiceIntegration from '../voice/VoiceIntegration';
import VoiceBotSelector from '../voice/VoiceBotSelector';
import { cn } from '@/lib/utils';
import { Bot } from '../../types';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const { state, dispatch } = useRealGroupChat();
  const { state: botState } = useBotRegistry();
  const { isBotSpeaking, isListening } = useLiveKitIntegration();
  const bots = botState.availableBots;
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [showVoiceBotSelector, setShowVoiceBotSelector] = useState(false);
  const [allowInterruptions, setAllowInterruptions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll on new messages or when typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.typingBotIds]);

  // Listen for bot speaking state changes and disable listening when speaking
  useEffect(() => {
    const handleSpeakingChange = (isSpeaking: boolean) => {
      if (isSpeaking && !allowInterruptions) {
        // If bot starts speaking and interruptions are not allowed, stop listening
        multimodalAgentService.stopListening();
      } else if (!isSpeaking && isListening) {
        // If bot stops speaking and we were listening before, restart listening
        multimodalAgentService.startListening();
      }
    };

    multimodalAgentService.onSpeakingStateChange(handleSpeakingChange);
    
    return () => {
      multimodalAgentService.offSpeakingStateChange(handleSpeakingChange);
    };
  }, [allowInterruptions]);

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  const handleBotSettingsClick = (botId: string) => {
    setSelectedBotId(botId);
  };

  const closeBotSettings = () => {
    setSelectedBotId(null);
  };

  const handleToggleVoiceBotSelector = () => {
    setShowVoiceBotSelector(!showVoiceBotSelector);
  };

  const handleVoiceBotSelected = (voiceBot: Bot) => {
    // Hide the selector after a bot is selected
    setShowVoiceBotSelector(false);
  };
  
  const toggleInterruptions = () => {
    setAllowInterruptions(!allowInterruptions);
    
    // When toggling, immediately apply the new state
    if (isBotSpeaking) {
      if (allowInterruptions) {
        // If switching to no interruptions while bot is speaking, stop listening
        multimodalAgentService.stopListening();
      } else {
        // If switching to allow interruptions while bot is speaking, start listening
        multimodalAgentService.startListening();
      }
    }
  };

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Voice integration for handling transcriptions and synthesis */}
      {state.settings?.ui?.enableVoice && <VoiceIntegration />}
      
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/10">
        <div className="flex items-center">
          <h2 className="font-medium text-sm">AI Assistant</h2>
          {bots.length > 0 && bots[0] && (
            <div className="ml-2 flex items-center">
              <span className="text-xs text-muted-foreground">
                {bots[0].model}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleInterruptions}
            className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 transition-colors ${
              allowInterruptions 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}
            title={allowInterruptions ? "Interruptions allowed" : "Interruptions disabled"}
            aria-label={allowInterruptions ? "Interruptions allowed" : "Interruptions disabled"}
          >
            {allowInterruptions ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            Interrupt
          </button>
          <button
            onClick={toggleSettings}
            className="p-1.5 text-muted-foreground hover:text-primary rounded-md transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-3">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start a conversation</p>
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {state.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                showTimestamp={true}
                showAvatar={true}
                showDebugInfo={state.settings?.ui?.showDebugInfo}
                onBotSettingsClick={handleBotSettingsClick}
              />
            ))}
          </div>
        )}
        
        {state.typingBotIds?.length > 0 && (
          <div className="px-3 py-2">
            <TypingIndicator botIds={state.typingBotIds} />
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
      
      <div className="border-t p-3">
        <div className="flex items-center">
          <ChatInput 
            disabled={state.isProcessing}
            placeholder={state.isProcessing ? "Processing..." : "Type your message..."}
            className="flex-1"
          />
        </div>
        
        {state.isRecording && (
          <div className="flex items-center justify-center mt-2">
            <VoiceActivityIndicator isActive={true} />
            <span className="ml-2 text-xs text-muted-foreground">
              Listening...
            </span>
          </div>
        )}
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Bot Settings Modal */}
      {selectedBotId && (
        <BotSettingsModal 
          botId={selectedBotId}
          onClose={closeBotSettings}
        />
      )}
    </div>
  );
} 