'use client';

import React, { useState, useMemo, useEffect, useId } from 'react';
import { GroupChatProvider, useGroupChatContext } from './context/GroupChatContext';
import { BotRegistryProvider, useBotRegistry } from './context/BotRegistryProvider';
import { ToolCallProvider } from './context/ToolCallProvider';
import { ToolIntegrationProvider } from './components/tools/ToolIntegrationProvider';
import { LiveKitProvider } from './context/LiveKitProvider';
import { LiveKitIntegrationProvider } from './context/LiveKitIntegrationProvider';
import { PromptsProvider, usePromptsContext } from './context/PromptsContext';
import { VoiceStateProvider } from './context/VoiceStateProvider';
import { sampleBots } from './data/sampleBots';
import { defaultGroupChatSettings } from './data/defaultSettings';
import { ChatInterface } from './components/chat/ChatInterface';
import { Info, X } from 'lucide-react';
import VoiceIntegration from './components/voice/VoiceIntegration';
import VoiceResponseManager from './components/voice/VoiceResponseManager';
import VoiceCommandController from './components/voice/VoiceCommandController';
import EventLoggerButton from './components/debug/EventLoggerButton';
import './mobile.css';

// Component to initialize bots after mounting
function BotsInitializer() {
  const { state, dispatch } = useGroupChatContext();
  const botRegistry = useBotRegistry();
  const { state: promptsState } = usePromptsContext();
  const stableId = useId(); // Use a stable ID instead of Date.now()
  
  const [latestModels, setLatestModels] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const testModelsEndpoint = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/usergroupchatcontext/api/latest-openai-models');
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setLatestModels(data);
      console.log('Latest models fetched:', data);
      
      // Add message to chat about the models
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: `model-test-${Date.now()}`,
          content: `Latest OpenAI models fetched:\n\nStandard: ${data.latestModel}\nRealtime: ${data.latestRealtimeModel}`,
          role: 'system',
          sender: 'system',
          timestamp: Date.now(),
          type: 'text'
        }
      });
    } catch (err) {
      console.error('Error fetching latest models:', err);
      setError(err instanceof Error ? err.message : String(err));
      
      // Add error message to chat
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: `model-test-error-${Date.now()}`,
          content: `Error fetching latest models: ${err instanceof Error ? err.message : String(err)}`,
          role: 'system',
          sender: 'system',
          timestamp: Date.now(),
          type: 'text'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const testSpeechSynthesis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First get the latest models
      const modelResponse = await fetch('/usergroupchatcontext/api/latest-openai-models');
      if (!modelResponse.ok) {
        throw new Error(`Models API returned ${modelResponse.status}: ${modelResponse.statusText}`);
      }
      const modelData = await modelResponse.json();
      
      // Try synthesizing speech with the latest realtime model
      const response = await fetch('/usergroupchatcontext/api/synthesize-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: "Hello! I'm using the latest realtime model for voice synthesis. Can you hear me clearly?",
          options: {
            model: modelData.latestRealtimeModel,
            voice: 'alloy',
            speed: 1.0
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Speech API returned ${response.status}: ${response.statusText}`);
      }
      
      // Play the audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      
      // Add message to chat
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: `speech-test-${Date.now()}`,
          content: `Testing speech synthesis with model: ${modelData.latestRealtimeModel}`,
          role: 'system',
          sender: 'system',
          timestamp: Date.now(),
          type: 'text'
        }
      });
    } catch (err) {
      console.error('Error testing speech synthesis:', err);
      setError(err instanceof Error ? err.message : String(err));
      
      // Add error message to chat
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: `speech-test-error-${Date.now()}`,
          content: `Error testing speech synthesis: ${err instanceof Error ? err.message : String(err)}`,
          role: 'system',
          sender: 'system',
          timestamp: Date.now(),
          type: 'text'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if there are any enabled prompts in the PromptsContext
  const hasEnabledPrompts = useMemo(() => {
    const containerPrompts = promptsState.containers
      .filter(container => container.enabled)
      .some(container => container.prompts.some(prompt => prompt.enabled));
    
    const standalonePrompts = promptsState.standalonePrompts.some(prompt => prompt.enabled);
    
    return containerPrompts || standalonePrompts;
  }, [promptsState]);
  
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
      
      // Only add welcome message if no enabled prompts are configured
      // and no welcome message exists already
      if (!hasEnabledPrompts) {
        // Check if a welcome message already exists before adding a new one
        const hasWelcomeMessage = state.messages.some(msg => 
          msg.role === 'system' && msg.sender === 'system' && msg.content.includes("I'm your AI assistant")
        );
        
        if (!hasWelcomeMessage) {
          // Add initial system message with a unique ID including timestamp
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: `welcome-message-${Date.now()}`,
              content: "Hello! I'm your AI assistant powered by the latest GPT model. I can help with a wide range of questions and tasks. You can type your messages and I'll respond with text. If you'd like to use voice input and hear my responses, click the microphone button in the message box to activate voice mode.",
              role: 'system',
              sender: 'system',
              timestamp: Date.now(),
              type: 'text'
            }
          });
        }
      }
      
      console.log("Bot initialized:", availableBots.find(bot => bot.id === botId));
    } else if (availableBots.length === 0) {
      console.warn("No bots available for initialization");
    }
  }, [botRegistry.state.availableBots, dispatch, state.messages.length, state.messages, hasEnabledPrompts]);
  
  return (
    <div className="hidden">
      {/* Test buttons removed */}
    </div>
  );
}

export default function GroupChatContextPage() {
  
  // Get environment to conditionally show debug tools
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 relative">
      {/* Providers */}
      <LiveKitProvider>
        <GroupChatProvider>
          <BotRegistryProvider initialBots={sampleBots}>
            <ToolCallProvider>
              <ToolIntegrationProvider>
                <PromptsProvider>
                  <VoiceStateProvider>
                    <LiveKitIntegrationProvider>
                      {/* Event Debug Tools - only in development */}
                      {isDevelopment && <EventLoggerButton />}
                      
                   
                      
                      {/* Main content */}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <ChatInterface />
                      </div>
                      
                      {/* Add voice-related components */}
                      <VoiceIntegration />
                      <VoiceResponseManager />
                      <VoiceCommandController />
                      
                      {/* Initialize bots */}
                      <BotsInitializer />
                    </LiveKitIntegrationProvider>
                  </VoiceStateProvider>
                </PromptsProvider>
              </ToolIntegrationProvider>
            </ToolCallProvider>
          </BotRegistryProvider>
        </GroupChatProvider>
      </LiveKitProvider>
    </div>
  );
} 