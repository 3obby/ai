'use client';

import React, { useState, useMemo, useEffect, useId } from 'react';
import { GroupChatProvider, useGroupChatContext } from './context/GroupChatContext';
import { BotRegistryProvider, useBotRegistry } from './context/BotRegistryProvider';
import { ToolCallProvider } from './context/ToolCallProvider';
import { ToolIntegrationProvider } from './components/tools/ToolIntegrationProvider';
import { sampleBots } from './data/sampleBots';
import { defaultGroupChatSettings } from './data/defaultSettings';
import { ChatInterface } from './components/chat/ChatInterface';
import { Info, X, Wrench } from 'lucide-react';
import { ToolPanel } from './components/tools/ToolPanel';

// Component to initialize bots after mounting
function BotsInitializer() {
  const { state, dispatch } = useGroupChatContext();
  const botRegistry = useBotRegistry();
  const stableId = useId(); // Use a stable ID instead of Date.now()
  
  useEffect(() => {
    // Get the three diverse bots
    const botIds = ['researcher', 'creative', 'critic'];
    const availableBots = botRegistry.state.availableBots;
    
    // Only initialize if not already initialized
    if (availableBots.length > 0 && state.messages.length === 0) {
      // Update group chat settings to include active bots
      dispatch({
        type: 'SET_SETTINGS',
        payload: {
          activeBotIds: botIds,
          name: 'AI Team Chat'
        }
      });
      
      // Add initial system message with a stable ID instead of using Date.now()
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: `welcome-message-${stableId}`,
          content: "Welcome! You're now chatting with a team of three AI assistants - a Research Assistant, a Creative Ideator, and a Critical Thinker. Each has different strengths to help with your questions.",
          role: 'system',
          sender: 'system',
          timestamp: Date.now(), // Use current timestamp instead of 0
          type: 'text'
        }
      });
      
      console.log("Bots initialized:", availableBots);
    } else if (availableBots.length === 0) {
      console.warn("No bots available for initialization");
    }
  }, [botRegistry.state.availableBots, dispatch, state.messages.length, stableId]);
  
  return null;
}

export default function GroupChatContextPage() {
  const [infoOpen, setInfoOpen] = useState(false);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  
  // Select three diverse bots from the sample bots
  const activeBots = useMemo(() => {
    // Using the researcher, creative, and critic for diversity
    return sampleBots.filter(bot => 
      ['researcher', 'creative', 'critic'].includes(bot.id)
    ).map(bot => ({
      ...bot,
      enabled: true
    }));
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        <BotRegistryProvider initialBots={activeBots}>
          <ToolCallProvider>
            <GroupChatProvider>
              <ToolIntegrationProvider>
                <BotsInitializer />
                <div className="flex h-full">
                  <ChatInterface className="flex-1 h-full" />
                  
                  {toolPanelOpen && (
                    <div className="w-80 border-l h-full overflow-auto">
                      <ToolPanel className="h-full" />
                    </div>
                  )}
                </div>
              </ToolIntegrationProvider>
            </GroupChatProvider>
          </ToolCallProvider>
        </BotRegistryProvider>
        
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