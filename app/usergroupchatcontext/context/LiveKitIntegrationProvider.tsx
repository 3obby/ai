'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGroupChatContext } from './GroupChatContext';
import { useLiveKit } from './LiveKitProvider';
import { useBotRegistry } from './BotRegistryProvider';
import { useToolCall } from './ToolCallProvider';
import { v4 as uuidv4 } from 'uuid';
import { Message, BotId, ProcessingMetadata, ToolResult } from '../types';
import { Bot, ToolDefinition } from '../types/bots';
import { createUserMessage, createBotMessage } from '../types/messages';
import multimodalAgentService from '../services/livekit/multimodal-agent-service';
import { VoiceSynthesisService } from '../services/voiceSynthesisService';
import { ToolCallService } from '../services/toolCallService';
import voiceToolCallingService from '../services/voiceToolCallingService';
import turnTakingService from '../services/livekit/turn-taking-service';

// Create instances of required services
const voiceSynthesisService = new VoiceSynthesisService();
const toolCallService = new ToolCallService();

interface LiveKitIntegrationContextType {
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  isBotSpeaking: boolean;
  currentSpeakingBotId: BotId | null;
  playBotResponse: (botId: BotId, text: string) => Promise<void>;
  stopBotSpeech: () => void;
  resumeAudioContext: () => Promise<boolean>;
}

const LiveKitIntegrationContext = createContext<LiveKitIntegrationContextType | undefined>(undefined);

export const useLiveKitIntegration = () => {
  const context = useContext(LiveKitIntegrationContext);
  if (!context) {
    throw new Error('useLiveKitIntegration must be used within a LiveKitIntegrationProvider');
  }
  return context;
};

interface LiveKitIntegrationProviderProps {
  children: ReactNode;
}

export function LiveKitIntegrationProvider({ children }: LiveKitIntegrationProviderProps) {
  const { state, dispatch } = useGroupChatContext();
  const { room, isConnected } = useLiveKit();
  const { state: botRegistryState } = useBotRegistry();
  const { executeToolCalls } = useToolCall();
  
  const [isListening, setIsListening] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [currentSpeakingBotId, setCurrentSpeakingBotId] = useState<BotId | null>(null);

  // Handle transcription results from LiveKit
  useEffect(() => {
    if (!room || !isConnected) return;

    const handleTranscription = async (transcription: { text: string, interim: boolean }) => {
      if (transcription.interim) return; // Only process final transcriptions
      
      // If the transcription is final, check if it contains a tool call
      if (!transcription.interim && transcription.text.trim()) {
        const isToolCall = await detectToolsInTranscription(transcription.text);
        
        // If it was a tool call, we might want to skip normal message processing
        if (isToolCall) {
          return;
        }
      }
      
      // Create a new user message from transcription
      const message: Message = {
        id: uuidv4(),
        content: transcription.text,
        role: 'user',
        sender: 'user',
        timestamp: Date.now(),
        type: 'voice',
        metadata: {
          processing: {
            originalContent: transcription.text,
          } as ProcessingMetadata,
          toolResults: [] as ToolResult[]
        }
      };
      
      // Add message to chat
      dispatch({
        type: 'ADD_MESSAGE',
        payload: message
      });
      
      // Process message through bot response system
      await processUserMessage(message);
    };
    
    // Set up custom event listener for transcription events
    // Since the native LiveKit events don't include transcription
    const customTranscriptionHandler = (event: any) => {
      if (event && event.detail) {
        handleTranscription(event.detail);
      }
    };
    
    document.addEventListener('livekit-transcription', customTranscriptionHandler);
    
    return () => {
      document.removeEventListener('livekit-transcription', customTranscriptionHandler);
    };
  }, [room, isConnected, dispatch]);
  
  // Process user message through bot response system
  const processUserMessage = async (message: Message) => {
    // Set processing state
    dispatch({ type: 'SET_PROCESSING', payload: true });
    
    try {
      // Get active bots
      const activeBotIds = state.settings.activeBotIds || [];
      const activeBots = botRegistryState.availableBots.filter(bot => 
        activeBotIds.includes(bot.id)
      );
      
      // Process message through each bot based on response mode
      if (state.settings.responseMode === 'sequential') {
        // Process bots in sequence
        for (const bot of activeBots) {
          // Set the current bot as typing
          dispatch({ 
            type: 'SET_TYPING_BOT_IDS', 
            payload: [bot.id] 
          });
          
          // Generate bot response
          const botResponse = await generateBotResponse(bot.id, message.content);
          
          // Add bot response to chat
          const botMessage: Message = {
            id: uuidv4(),
            content: botResponse.content,
            role: 'assistant',
            sender: bot.id,
            timestamp: Date.now(),
            type: 'text',
            metadata: {
              toolResults: botResponse.toolResults || [],
              processing: {
                originalContent: botResponse.content,
              } as ProcessingMetadata
            }
          };
          
          dispatch({
            type: 'ADD_MESSAGE',
            payload: botMessage
          });
          
          // If voice is enabled for this bot, speak the response
          const botConfig = botRegistryState.availableBots.find(b => b.id === bot.id);
          if (botConfig && state.settings.ui.enableVoice) {
            await playBotResponse(bot.id, botResponse.content);
          }
          
          // Clear typing indicator
          dispatch({ 
            type: 'SET_TYPING_BOT_IDS', 
            payload: [] 
          });
        }
      } else {
        // Process bots in parallel
        dispatch({ 
          type: 'SET_TYPING_BOT_IDS', 
          payload: activeBotIds 
        });
        
        const botResponses = await Promise.all(activeBots.map(async (bot) => {
          const response = await generateBotResponse(bot.id, message.content);
          return {
            id: uuidv4(),
            content: response.content,
            role: 'assistant' as const,
            sender: bot.id,
            timestamp: Date.now(),
            type: 'text' as const,
            metadata: {
              toolResults: response.toolResults || [],
              processing: {
                originalContent: response.content,
              } as ProcessingMetadata
            }
          };
        }));
        
        // Add all bot responses to chat
        for (const botResponse of botResponses) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: botResponse
          });
          
          // Find the bot
          const bot = activeBots.find(b => b.id === botResponse.sender);
          
          // If voice is enabled, speak the response
          if (bot && state.settings.ui.enableVoice) {
            await playBotResponse(bot.id, botResponse.content);
          }
        }
        
        // Clear typing indicators
        dispatch({ 
          type: 'SET_TYPING_BOT_IDS', 
          payload: [] 
        });
      }
    } catch (error) {
      console.error("Error processing user message:", error);
    } finally {
      // Clear processing state
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };
  
  // Generate bot response using the actual bot services
  const generateBotResponse = async (botId: BotId, userMessage: string): Promise<{content: string, toolResults?: ToolResult[]}> => {
    try {
      // Find the bot in registry
      const botFromRegistry = botRegistryState.availableBots.find(b => b.id === botId);
      if (!botFromRegistry) {
        throw new Error(`Bot with ID ${botId} not found`);
      }
      
      // Cast the bot to the correct type or use appropriate properties
      // This is a workaround for type mismatches between the two Bot interfaces in the codebase
      // Proper fix would be to consolidate the interfaces
      const bot = {
        ...botFromRegistry,
        parameters: {
          temperature: botFromRegistry.temperature || 0.7,
          maxTokens: botFromRegistry.maxTokens || 1024,
          enabledTools: [] as string[]
        },
        tools: [] as ToolDefinition[],
        useTools: botFromRegistry.useTools || false
      };

      // Set the bot as typing
      dispatch({ 
        type: 'SET_TYPING_BOT_IDS', 
        payload: [...state.typingBotIds, botId] 
      });

      // Get history/context from previous messages
      const messageHistory = state.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        sender: msg.sender
      }));

      // Generate response
      let content = '';
      let toolResults: ToolResult[] = [];
      
      // Use mock service for development/testing
      if (process.env.NEXT_PUBLIC_USE_MOCK_SERVICE === 'true') {
        // Wait a bit to simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        content = `Response from ${bot.name} to: ${userMessage}`;
      } else {
        // Generate response with appropriate tools if bot has tools enabled
        if (bot.useTools) {
          // Get the bot's enabled tools
          // Since we're dealing with type inconsistencies, just use an empty array for now
          // In a real implementation, this would filter the tools based on enabled tools
          const enabledTools: ToolDefinition[] = [];
          
          // Get tool definitions for enabled tools
          const toolDefinitions = enabledTools;
          
          // Call API with tool definitions
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [...messageHistory, { role: 'user', content: userMessage }],
              model: bot.model || 'gpt-4o',
              temperature: bot.parameters.temperature || 0.7,
              max_tokens: bot.parameters.maxTokens || 1024,
              tools: toolDefinitions
            }),
          }).then(res => res.json());
          
          // Check if response includes tool calls
          if (response.tool_calls && response.tool_calls.length > 0 && executeToolCalls) {
            // Format tool calls for our tool execution service
            const formattedToolCalls = response.tool_calls.map((call: any) => ({
              id: call.id,
              name: call.function.name,
              arguments: JSON.parse(call.function.arguments)
            }));
            
            // Execute tool calls
            toolResults = await executeToolCalls(formattedToolCalls);
            
            // Add tool results to the message history for a follow-up completion
            const toolResponseMessages = toolResults.map(result => {
              // Handle different ToolResult shapes in the codebase
              const resultObj = result as any;
              return {
                role: 'tool' as const,
                content: JSON.stringify(resultObj.output || resultObj.result),
                tool_call_id: resultObj.id || resultObj.toolName
              };
            });
            
            // Get final response that includes tool outputs
            const finalResponse = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [
                  ...messageHistory, 
                  { role: 'user', content: userMessage },
                  ...toolResponseMessages
                ],
                model: bot.model || 'gpt-4o',
                temperature: bot.parameters.temperature || 0.7,
                max_tokens: bot.parameters.maxTokens || 1024,
              }),
            }).then(res => res.json());
            
            content = finalResponse.content;
          } else {
            // No tool calls or tool execution not enabled
            content = response.content;
          }
        } else {
          // Standard chat completion without tools
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [...messageHistory, { role: 'user', content: userMessage }],
              model: bot.model || 'gpt-4o',
              temperature: bot.parameters.temperature || 0.7,
              max_tokens: bot.parameters.maxTokens || 1024,
            }),
          }).then(res => res.json());
          
          content = response.content;
        }
      }

      return { content, toolResults };
    } catch (error) {
      console.error(`Error generating response for bot ${botId}:`, error);
      return { 
        content: `I apologize, but I encountered an error while processing your request. ${error instanceof Error ? error.message : 'Please try again later.'}`,
        toolResults: []
      };
    }
  };
  
  // Start listening for voice input
  const startListening = async () => {
    if (!isConnected) return;
    
    try {
      const success = await multimodalAgentService.startListening();
      if (success) {
        setIsListening(true);
        dispatch({ type: 'TOGGLE_RECORDING' });
      }
    } catch (error) {
      console.error("Error starting audio capture:", error);
    }
  };
  
  // Stop listening for voice input
  const stopListening = () => {
    if (!isListening) return;
    
    multimodalAgentService.stopListening();
    setIsListening(false);
    dispatch({ type: 'TOGGLE_RECORDING' });
  };
  
  // Play bot response using text-to-speech
  const playBotResponse = async (botId: BotId, text: string) => {
    if (!isConnected) return;
    
    try {
      const bot = botRegistryState.availableBots.find(b => b.id === botId);
      if (!bot) return;
      
      setIsBotSpeaking(true);
      setCurrentSpeakingBotId(botId);
      
      // Use the voice synthesis service with speak method
      voiceSynthesisService.speak(text);
      
      // Since the speak method doesn't return a Promise, we need to set up event listeners
      return new Promise<void>((resolve) => {
        voiceSynthesisService.onEnd(() => {
          setIsBotSpeaking(false);
          setCurrentSpeakingBotId(null);
          resolve();
        });
        
        voiceSynthesisService.onError(() => {
          setIsBotSpeaking(false);
          setCurrentSpeakingBotId(null);
          resolve();
        });
      });
    } catch (error) {
      console.error("Error playing bot response:", error);
      setIsBotSpeaking(false);
      setCurrentSpeakingBotId(null);
    }
  };
  
  // Stop bot speech
  const stopBotSpeech = () => {
    if (!isBotSpeaking) return;
    
    voiceSynthesisService.stop();
    setIsBotSpeaking(false);
    setCurrentSpeakingBotId(null);
  };

  /**
   * Resume the AudioContext after user interaction
   * This helps resolve the browser requirement for user gesture
   * to start AudioContext
   */
  const resumeAudioContext = async (): Promise<boolean> => {
    try {
      return await multimodalAgentService.resumeAudioContext();
    } catch (error) {
      console.error('Error resuming AudioContext:', error);
      return false;
    }
  };

  // Add voice tool detection
  const detectToolsInTranscription = async (transcription: string) => {
    try {
      // Get available tools from all active bots
      const availableTools: ToolDefinition[] = [];
      
      for (const botId of state.settings.activeBotIds) {
        const bot = botRegistryState.availableBots.find(b => b.id === botId);
        if (bot) {
          // Cast bot to the correct type that includes tools
          const botWithTools = bot as unknown as { tools?: ToolDefinition[] };
          
          // Filter out duplicate tools if tools exist
          if (botWithTools.tools && Array.isArray(botWithTools.tools)) {
            botWithTools.tools.forEach((tool: ToolDefinition) => {
              if (!availableTools.some(t => t.id === tool.id)) {
                availableTools.push(tool);
              }
            });
          }
        }
      }
      
      // Detect if the transcription contains a tool call
      const detectionResult = await voiceToolCallingService.detectToolCall(
        transcription, 
        availableTools
      );
      
      // If the confidence is high and tools were detected
      if (detectionResult.isToolCall && detectionResult.detectedTools.length > 0) {
        // Get the highest confidence tool
        const bestToolMatch = detectionResult.detectedTools.reduce(
          (best, current) => current.confidence > best.confidence ? current : best,
          detectionResult.detectedTools[0]
        );
        
        if (bestToolMatch.confidence > 0.75) {
          console.log('Detected voice tool call:', bestToolMatch);
          
          // Execute the tool
          const result = await voiceToolCallingService.executeVoiceToolCall(
            bestToolMatch.name,
            bestToolMatch.arguments
          );
          
          // Add a message showing the tool call result
          const toolResultMessage: Message = {
            id: uuidv4(),
            content: `Tool ${bestToolMatch.name} executed with result: ${JSON.stringify(result.output)}`,
            role: 'assistant',
            sender: 'system',
            senderName: 'System',
            timestamp: Date.now(),
            type: 'tool_result',
            metadata: {
              toolResults: [result]
            }
          };
          
          dispatch({ type: 'ADD_MESSAGE', payload: toolResultMessage });
          
          // Return true to indicate a tool was executed
          return true;
        }
      }
      
      // No tool was executed
      return false;
    } catch (error) {
      console.error('Error detecting tools in transcription:', error);
      return false;
    }
  };
  
  // Enhance voice processing to maintain context
  useEffect(() => {
    // Listen for turn-taking events to maintain context
    const handleTurnEnded = (speaker: 'user' | BotId) => {
      // When a turn ends, update UI state
      if (speaker === 'user') {
        // User finished speaking, update UI state
        if (state.isRecording) {
          dispatch({ type: 'TOGGLE_RECORDING' });
        }
      } else {
        // Bot finished speaking, update UI state
        dispatch({
          type: 'SET_TYPING_BOT_IDS',
          payload: state.typingBotIds.filter(id => id !== speaker)
        });
      }
    };
    
    // Subscribe to turn-taking events
    turnTakingService.on('turn:ended', handleTurnEnded);
    
    return () => {
      turnTakingService.off('turn:ended', handleTurnEnded);
    };
  }, [state.isRecording, state.typingBotIds, dispatch]);

  const contextValue: LiveKitIntegrationContextType = {
    isListening,
    startListening,
    stopListening,
    isBotSpeaking,
    currentSpeakingBotId,
    playBotResponse,
    stopBotSpeech,
    resumeAudioContext
  };

  return (
    <LiveKitIntegrationContext.Provider value={contextValue}>
      {children}
    </LiveKitIntegrationContext.Provider>
  );
} 