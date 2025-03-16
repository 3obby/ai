'use client';

import React, { useState } from 'react';
import { GroupChatProvider } from './context/GroupChatProvider';
import { BotRegistryProvider } from './context/BotRegistryProvider';
import ChatInterface from './components/chat/ChatInterface';

// Sample bot definitions for demonstration
const SAMPLE_BOTS = [
  {
    id: 'helper',
    name: 'Helper',
    avatar: '/images/helper-bot.png',
    description: 'A helpful assistant that can answer general questions.',
    basePrompt: 'You are a helpful assistant that provides clear and concise answers.',
    parameters: {
      temperature: 0.7,
      maxTokens: 1000,
      enabledTools: []
    },
    tools: []
  },
  {
    id: 'coder',
    name: 'Coder',
    avatar: '/images/coder-bot.png',
    description: 'A coding expert that can help with programming tasks.',
    basePrompt: 'You are a coding expert that helps with programming problems.',
    parameters: {
      temperature: 0.3,
      maxTokens: 1500,
      enabledTools: []
    },
    tools: []
  }
];

export default function GroupChatPage() {
  const [showSettings, setShowSettings] = useState(false);
  
  const handleSettingsClick = () => {
    setShowSettings(true);
  };
  
  return (
    <div className="h-[100dvh] bg-background text-foreground">
      <GroupChatProvider initialBots={SAMPLE_BOTS}>
        <BotRegistryProvider initialBots={SAMPLE_BOTS}>
          <div className="h-full flex flex-col">
            <main className="flex-1 overflow-hidden">
              <ChatInterface onSettingsClick={handleSettingsClick} />
            </main>
            
            {/* Settings modal would go here */}
            {showSettings && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-background rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4">Settings</h2>
                  <p className="mb-4">
                    This is a placeholder for the settings panel. In a complete implementation, 
                    this would include bot configuration, chat settings, and more.
                  </p>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="w-full p-2 bg-primary text-primary-foreground rounded-md"
                  >
                    Close Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </BotRegistryProvider>
      </GroupChatProvider>
    </div>
  );
} 