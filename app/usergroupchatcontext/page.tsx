'use client';

import React, { useState, useMemo, useEffect, useId } from 'react';
import { GroupChatProvider, useGroupChatContext } from './context/GroupChatContext';
import { BotRegistryProvider, useBotRegistry } from './context/BotRegistryProvider';
import { ToolCallProvider } from './context/ToolCallProvider';
import { ToolIntegrationProvider } from './components/tools/ToolIntegrationProvider';
import { LiveKitProvider } from './context/LiveKitProvider';
import { LiveKitIntegrationProvider } from './context/LiveKitIntegrationProvider';
import { sampleBots } from './data/sampleBots';
import { defaultGroupChatSettings } from './data/defaultSettings';
import { ChatInterface } from './components/chat/ChatInterface';
import { Info, X } from 'lucide-react';
import VoiceIntegration from './components/voice/VoiceIntegration';
import VoiceResponseManager from './components/voice/VoiceResponseManager';
import VoiceCommandController from './components/voice/VoiceCommandController';
import './mobile.css';

// Component to initialize bots after mounting
function BotsInitializer() {
  const { state, dispatch } = useGroupChatContext();
  const botRegistry = useBotRegistry();
  const stableId = useId(); // Use a stable ID instead of Date.now()
  
  useEffect(() => {
    // Get the default bot
    const botId = 'default';
    const availableBots = botRegistry.state.availableBots;
    
    // Only initialize if not already initialized AND messages are empty
    if (availableBots.length > 0 && state.messages.length === 0) {
      // Update group chat settings to include the default bot
      dispatch({
        type: 'SET_SETTINGS',
        payload: {
          activeBotIds: [botId],
          name: 'AI Assistant Chat'
        }
      });
      
      // Add initial system message with a fixed ID
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: 'welcome-message',
          content: "Hello! I'm your AI assistant powered by the latest GPT model. I can help with a wide range of questions and tasks. You can type your messages and I'll respond with text. If you'd like to use voice input and hear my responses, click the microphone button in the message box to activate voice mode.",
          role: 'system',
          sender: 'system',
          timestamp: Date.now(),
          type: 'text'
        }
      });
      
      console.log("Bot initialized:", availableBots.find(bot => bot.id === botId));
    } else if (availableBots.length === 0) {
      console.warn("No bots available for initialization");
    }
  }, [botRegistry.state.availableBots, dispatch, state.messages.length]);
  
  return null;
}

export default function GroupChatContextPage() {
  const [infoOpen, setInfoOpen] = useState(false);
  
  // Select just the default bot
  const activeBot = useMemo(() => {
    // Using only the default bot
    return sampleBots.filter(bot => 
      bot.id === 'default'
    ).map(bot => ({
      ...bot,
      enabled: true
    }));
  }, []);

  return (
    <div className="h-full w-full">
      <BotRegistryProvider initialBots={activeBot}>
        <ToolCallProvider>
          <GroupChatProvider>
            <LiveKitProvider>
              <LiveKitIntegrationProvider>
                <ToolIntegrationProvider>
                  <BotsInitializer />
                  <div className="flex h-full">
                    <ChatInterface className="flex-1 h-full" />
                    <VoiceIntegration />
                    <VoiceResponseManager />
                    {/* Commenting out to prevent unwanted transcriptions */}
                    {/* <VoiceCommandController commandPrefix="system" /> */}
                  </div>
                </ToolIntegrationProvider>
              </LiveKitIntegrationProvider>
            </LiveKitProvider>
          </GroupChatProvider>
        </ToolCallProvider>
      </BotRegistryProvider>
      
      {/* Mobile-optimized info panel */}
      {infoOpen && (
        <div className="absolute inset-0 bg-background z-20 overflow-auto">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">About AI Assistant Chat</h2>
              <button 
                onClick={() => setInfoOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close info panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              This chat interface allows you to interact with an AI assistant powered by the latest GPT model.
              You can communicate through text or voice, with transcripts seamlessly integrated into the conversation.
            </p>
            
            <div>
              <h3 className="font-medium mb-2">Key Features</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Text and voice interactions with the same AI assistant</li>
                <li>Unified conversation history across modalities</li>
                <li>Powered by the latest GPT model (GPT-4o)</li>
                <li>Mobile-optimized interface</li>
                <li>Voice commands support</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 