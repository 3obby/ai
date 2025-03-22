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
import { GhostPromptsList } from './GhostPromptsList';
import { SettingsPanel } from '../settings/SettingsPanel';
import { VoicePlaybackControls } from '../voice/VoicePlaybackControls';
import { VoiceActivityIndicator } from '../voice/VoiceActivityIndicator';
import VoiceIntegration from '../voice/VoiceIntegration';
import VoiceBotSelector from '../voice/VoiceBotSelector';
import VoiceContextInheritance from '../voice/VoiceContextInheritance';
import VoiceTextTransitionHandler from '../voice/VoiceTextTransitionHandler';
import { cn } from '@/lib/utils';
import { Bot } from '../../types';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { MessageList } from './MessageList';
import { PromptsButton, PromptsDrawer } from '../prompts';
import { usePromptsContext } from '../../context/PromptsContext';

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const { state, dispatch } = useGroupChatContext();
  const { state: botState } = useBotRegistry();
  const { isBotSpeaking, isListening, isInVoiceMode } = useLiveKitIntegration();
  const { sendMessage } = useRealGroupChat();
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

  // Reset interrupt toggle when voice mode changes
  useEffect(() => {
    // When entering voice mode, ensure interruptions are disabled by default
    if (isInVoiceMode) {
      setAllowInterruptions(false);
    }
  }, [isInVoiceMode]);

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
  }, [allowInterruptions, isListening]);

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

  const handleVoiceContextInherited = () => {
    console.log('Voice context inheritance completed');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      {/* Prompts Button */}
      <PromptsButton />
      
      {/* Prompts Drawer */}
      <PromptsDrawer />
      
      {/* Chat Header with settings button */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/10">
        <div className="flex items-center">
          <h2 className="font-medium text-sm">AI Assistant</h2>
        </div>
        <button
          onClick={toggleSettings}
          className="p-1.5 text-muted-foreground hover:text-primary rounded-md transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      
      {/* Main chat area with messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <MessageList
          messages={state.messages}
          showDebugInfo={state.settings?.ui?.showDebugInfo || false}
        />
      </div>
      
      {/* Blackbar - Contains all input controls for both text and voice modes */}
      <div className={cn("blackbar-container", isInVoiceMode && "in-voice-mode")}>
        <ChatInput
          disabled={state.isProcessing || state.isRecording}
          className={cn(isInVoiceMode && "voice-mode")}
        />
      </div>
      
      {/* Voice integration components */}
      <VoiceContextInheritance onContextInherited={handleVoiceContextInherited} />
      <VoiceTextTransitionHandler 
        onTransitionComplete={() => {
          console.log('Voice-to-text transition completed');
        }} 
      />
      <VoiceIntegration />
      
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