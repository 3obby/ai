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
import { VoiceTransitionFeedback } from './components/voice/VoiceTransitionFeedback';
import { MobileFriendlyVoiceControl } from './components/voice/MobileFriendlyVoiceControl';
import { AccessibleVoiceControls } from './components/voice/AccessibleVoiceControls';
import VoiceInputButton from './components/voice/VoiceInputButton';
import './mobile.css';

// Component to initialize bots after mounting
function BotsInitializer() {
  const { state, dispatch } = useGroupChatContext();
  const botRegistry = useBotRegistry();
  const stableId = useId(); // Use a stable ID instead of Date.now()
  
  const [latestModels, setLatestModels] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const testModelsEndpoint = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/latest-openai-models');
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
      
      console.log("Bot initialized:", availableBots.find(bot => bot.id === botId));
    } else if (availableBots.length === 0) {
      console.warn("No bots available for initialization");
    }
  }, [botRegistry.state.availableBots, dispatch, state.messages.length]);
  
  return (
    <div className="fixed bottom-20 right-4 z-10 flex flex-col gap-2">
      {/* Test buttons removed */}
    </div>
  );
}

export default function GroupChatContextPage() {
  const [infoOpen, setInfoOpen] = useState(false);
  const [showAccessibilityControls, setShowAccessibilityControls] = useState(false);
  
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

  // Detect if using a mobile device
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
                    <VoiceTransitionFeedback />
                    {/* Fixed position for voice controls */}
                    <div className="fixed bottom-20 right-4 z-10">
                      {showAccessibilityControls ? (
                        <AccessibleVoiceControls />
                      ) : isMobile ? (
                        <MobileFriendlyVoiceControl />
                      ) : (
                        <div className="flex flex-col items-center">
                          <VoiceInputButton size="lg" showVisualizer />
                          <button 
                            onClick={() => setShowAccessibilityControls(true)}
                            className="mt-2 text-xs text-primary hover:underline"
                            aria-label="Show accessibility controls"
                          >
                            Accessibility Options
                          </button>
                        </div>
                      )}
                    </div>
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
                <li>Accessibility features for all users</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 