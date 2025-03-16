'use client';

import React, { useState } from 'react';
import { GroupChatProvider } from './context/GroupChatContext';
import { sampleBots } from './data/sampleBots';
import { defaultGroupChatSettings } from './data/defaultSettings';
import { ChatInterface } from './components/chat/ChatInterface';
import { Info, X } from 'lucide-react';

export default function GroupChatContextPage() {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden">
      <header className="py-2 px-3 border-b bg-background z-10 flex items-center justify-between">
        <h1 className="text-xl font-bold">Group Chat Context</h1>
        <button 
          className="text-muted-foreground hover:text-primary p-1 rounded-full"
          onClick={() => setInfoOpen(!infoOpen)}
          aria-label="Toggle information"
        >
          <Info className="h-4 w-4" />
        </button>
      </header>
      
      <div className="flex-1 overflow-hidden relative">
        <GroupChatProvider 
          initialSettings={defaultGroupChatSettings}
          availableBots={sampleBots}
        >
          <ChatInterface className="h-full" />
        </GroupChatProvider>
        
        {/* Mobile-optimized info panel */}
        {infoOpen && (
          <div className="absolute inset-0 bg-background z-20 overflow-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">About Group Chat Context</h2>
                <button 
                  onClick={() => setInfoOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Close info panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                The Group Chat Context system provides a flexible framework for managing conversations with multiple AI assistants. 
                It handles state management, bot configuration, and message processing in a unified interface.
              </p>
              
              <div>
                <h3 className="font-medium mb-2">Key Features</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Multiple bot personalities in one chat</li>
                  <li>Configurable response modes</li>
                  <li>Individual bot configuration</li>
                  <li>Pre and post-processing of messages</li>
                  <li>Tool usage capabilities</li>
                  <li>Voice input support</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Implementation Details</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Built using React Context API and custom hooks for state management.
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>GroupChatContext - Core state management</li>
                  <li>BotRegistryContext - Bot configuration</li>
                  <li>MessageList - Rendering messages</li>
                  <li>SettingsModal - Configuration UI</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 