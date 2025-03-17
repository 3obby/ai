'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { SettingsModal } from '../settings/SettingsModal';
import { Settings, Users } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { SettingsPanel } from '../settings/SettingsPanel';
import { VoicePlaybackControls } from '../voice/VoicePlaybackControls';
import { VoiceActivityIndicator } from '../voice/VoiceActivityIndicator';
import VoiceIntegration from '../voice/VoiceIntegration';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const { state, dispatch } = useGroupChat();
  const { state: botState } = useBotRegistry();
  const bots = botState.availableBots;
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll on new messages or when typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.typingBotIds]);

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Voice integration for handling transcriptions and synthesis */}
      {state.settings?.ui?.enableVoice && <VoiceIntegration />}
      
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/10">
        <div className="flex items-center">
          <h2 className="font-medium text-sm">Group Chat</h2>
          <div className="ml-2 flex items-center">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-xs text-primary">
              {state.settings?.activeBotIds?.length || 0}
            </span>
            <Users className="h-3 w-3 ml-1 text-muted-foreground" />
          </div>
        </div>
        <button
          onClick={toggleSettings}
          className="p-1.5 text-muted-foreground hover:text-primary rounded-md transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
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
              <MessageBubble
                key={message.id}
                message={message}
                isUser={message.sender === 'user'}
                showDebug={true}
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
      
      <ChatInput
        disabled={state.isLoading}
        placeholder={state.isLoading ? "Processing..." : "Type your message..."}
      />
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
} 