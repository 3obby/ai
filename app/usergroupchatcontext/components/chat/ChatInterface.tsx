'use client';

import React, { useState } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { ChatContainer } from './ChatContainer';
import { Settings } from 'lucide-react';
import { SettingsPanel } from '../settings/SettingsPanel';
import { VoicePlaybackControls } from '../voice/VoicePlaybackControls';
import { VoiceActivityIndicator } from '../voice/VoiceActivityIndicator';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const { state, dispatch } = useGroupChatContext();
  const { state: botState } = useBotRegistry();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Determine if we're in a voice session
  const isVoiceActive = state.isRecording || state.settings.ui?.enableVoice;
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">{state.settings.name || 'Group Chat'}</h2>
          {isVoiceActive && (
            <VoiceActivityIndicator 
              className="ml-2" 
              isActive={state.isRecording} 
            />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Voice playback controls when voice is enabled */}
          {state.settings.ui?.enableVoice && (
            <VoicePlaybackControls 
              className="mr-2" 
              audioSrc=""
            />
          )}
          
          {/* Settings button */}
          <button 
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 overflow-hidden relative">
        {settingsOpen ? (
          <SettingsPanel 
            onClose={() => setSettingsOpen(false)} 
            className="h-full"
          />
        ) : (
          <ChatContainer className="h-full">
            <MessageList />
          </ChatContainer>
        )}
      </div>
      
      {/* Input area */}
      <ChatInput 
        disabled={state.isLoading} 
        placeholder={state.isLoading ? "Waiting for response..." : "Type a message or activate voice..."}
      />
    </div>
  );
} 