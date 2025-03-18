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
import roomSessionManager from '../services/livekit/room-session-manager';

// Create instances of required services
const voiceSynthesisService = new VoiceSynthesisService();
const toolCallService = new ToolCallService();

// Define high-quality voice settings
const VOICE_SETTINGS = {
  model: 'gpt-4o-realtime-preview',
  voice: 'alloy', // High-quality OpenAI voice
  speed: 1.0,
  audioFormat: 'mp3',
  sampleRate: 44100
};

interface LiveKitIntegrationContextType {
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  isBotSpeaking: boolean;
  isInVoiceMode: boolean;
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
  const { room, isConnected: liveKitIsConnected } = useLiveKit();
  const { state: botRegistryState } = useBotRegistry();
  const { executeToolCalls } = useToolCall();
  
  const [isListening, setIsListening] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isInVoiceMode, setIsInVoiceMode] = useState(false);
  const [currentSpeakingBotId, setCurrentSpeakingBotId] = useState<BotId | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Sync connection state from LiveKit hook
  useEffect(() => {
    setIsConnected(liveKitIsConnected);
    console.log('LiveKit connection state changed in provider:', liveKitIsConnected);
  }, [liveKitIsConnected]);

  // Handle room state changes directly
  useEffect(() => {
    if (room) {
      const handleStateChange = (state: any) => {
        console.log('Room connection state changed:', state);
        setIsConnected(state === 'connected');
      };
      
      room.on('stateChanged', handleStateChange);
      
      // Initialize state immediately
      setIsConnected(room.state === 'connected');
      
      return () => {
        room.off('stateChanged', handleStateChange);
      };
    }
  }, [room]);

  // Handle transcription results from LiveKit
  useEffect(() => {
    if (!room || !isConnected) return;

    const handleTranscription = async (text: string, isFinal: boolean) => {
      if (!isFinal || !text.trim()) return; // Only process final, non-empty transcriptions
      console.log('LiveKitIntegrationProvider received transcription:', text, 'isFinal:', isFinal);
      
      // Check if we're still connected and in voice mode
      if (!isInVoiceMode || !isConnected) {
        console.log('Skipping transcription processing - no longer in voice mode or not connected');
        return;
      }
      
      // Check if it contains a tool call
      const isToolCall = await detectToolsInTranscription(text);
      
      // If it was a tool call, skip normal message processing
      if (isToolCall) {
        return;
      }
      
      // Create a new user message from transcription
      const message: Message = {
        id: uuidv4(),
        content: text,
        role: 'user',
        sender: 'user',
        timestamp: Date.now(),
        type: 'voice',
        metadata: {
          processing: {
            originalContent: text,
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
    
    // Set up listener directly on the multimodalAgentService
    multimodalAgentService.onTranscription(handleTranscription);
    
    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, [room, isConnected, dispatch, isInVoiceMode]);
  
  // Process user message through bot response system
  const processUserMessage = async (message: Message) => {
    try {
      // Set processing state
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      // Don't add the message again since it's already added by the caller
      // dispatch({
      //   type: 'ADD_MESSAGE',
      //   payload: message
      // });
      
      // Check if we should respond at all
      if (state.settings.activeBotIds.length === 0) {
        return;
      }
      
      // Determine which bots should respond
      const activeBotIds = state.settings.activeBotIds;
      const activeBots = botRegistryState.availableBots.filter(bot => activeBotIds.includes(bot.id));
      
      // Handle bot responses according to the response mode (sequential or parallel)
      if (activeBots.length > 0) {
        // Check if this message is from voice mode
        const isVoiceMessage = message.type === 'voice';
      
        // Add typing indicators for all active bots
        dispatch({ 
          type: 'SET_TYPING_BOT_IDS', 
          payload: activeBotIds 
        });
        
        // Get bot responses in parallel or sequentially based on settings
        const botResponses: Message[] = [];
        
        if (state.settings.responseMode === 'parallel') {
          // Get all bot responses in parallel
          const promises = activeBots.map(bot => 
            generateBotResponse(
              bot.id, 
              message.content,
              {
                isVoiceMode: isVoiceMessage,
                skipPrePostProcessing: isVoiceMessage, // Skip pre/post processing for voice messages
                disableToolCalling: isVoiceMessage // Disable tool calling for voice messages
              }
            )
          );
          
          const responses = await Promise.all(promises);
          
          // Create bot messages
          botResponses.push(...responses.map((response, index) => ({
            id: uuidv4(),
            content: response.content,
            role: 'assistant' as const,
            sender: activeBots[index].id,
            senderName: activeBots[index].name,
            timestamp: Date.now(),
            type: 'text' as const,
            metadata: {
              toolResults: response.toolResults,
              processing: {
                originalContent: response.content,
              } as ProcessingMetadata
            }
          })));
        } else {
          // Sequential mode - get responses one by one
          for (const bot of activeBots) {
            const response = await generateBotResponse(
              bot.id, 
              message.content,
              {
                isVoiceMode: isVoiceMessage,
                skipPrePostProcessing: isVoiceMessage, // Skip pre/post processing for voice messages
                disableToolCalling: isVoiceMessage // Disable tool calling for voice messages
              }
            );
            
            const botMessage: Message = {
              id: uuidv4(),
              content: response.content,
              role: 'assistant' as const,
              sender: bot.id,
              senderName: bot.name,
              timestamp: Date.now(),
              type: 'text' as const,
              metadata: {
                toolResults: response.toolResults,
                processing: {
                  originalContent: response.content,
                } as ProcessingMetadata
              }
            };
            
            botResponses.push(botMessage);
          }
        }
        
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
  const generateBotResponse = async (
    botId: BotId, 
    userMessage: string, 
    options: { 
      isVoiceMode?: boolean, 
      skipPrePostProcessing?: boolean, 
      disableToolCalling?: boolean 
    } = {}
  ): Promise<{content: string, toolResults?: ToolResult[]}> => {
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
        // If options.disableToolCalling is true, force useTools to be false regardless of bot settings
        tools: [] as ToolDefinition[],
        useTools: options.disableToolCalling ? false : (botFromRegistry.useTools || false)
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
        // If this is a voice mode response and we need to bypass pre/post processing,
        // generate the response directly from OpenAI without using the prompt processor
        if (options.isVoiceMode && options.skipPrePostProcessing) {
          try {
            console.log('Generating voice response using multimodal agent service');
            
            // Ensure we're using a realtime model for voice mode
            const realtimeModel = bot.model?.includes('realtime') 
              ? bot.model 
              : 'gpt-4o-realtime-preview';
            
            // Configure multimodal agent with realtime model if not already configured
            if (multimodalAgentService.getConfig().model !== realtimeModel) {
              multimodalAgentService.updateConfig({
                model: realtimeModel,
                voice: bot.voiceSettings?.voice || 'alloy',
                voiceSpeed: bot.voiceSettings?.speed || 1.0,
                voiceQuality: 'high-quality'
              });
              
              console.log('Updated multimodal agent config:', multimodalAgentService.getConfig());
            }
            
            // Use standard API first to generate text response without audio,
            // which helps ensure we have a text response even if voice synthesis fails
            const textResponse = await fetch('/usergroupchatcontext/api/openai/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [...messageHistory, { role: 'user', content: userMessage }],
                model: 'gpt-4o', // Use standard model for text response
                temperature: bot.parameters.temperature || 0.7,
                max_tokens: bot.parameters.maxTokens || 1024,
              }),
            }).then(res => res.json());
            
            // Extract content from the OpenAI response structure
            content = textResponse.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
            console.log('Generated text response first:', content);
            
            // Now synthesize speech for this content
            try {
              // Configure voice settings
              const voiceSettings = {
                voice: bot.voiceSettings?.voice || 'alloy',
                speed: bot.voiceSettings?.speed || 1.0,
                quality: 'high-quality' as const
              };
              
              // Use VoiceSynthesisService directly instead of multimodalAgentService
              // This provides better reliability for voice output
              const speechService = new VoiceSynthesisService(voiceSettings);
              
              // Start voice synthesis asynchronously - don't wait for it to complete
              // This ensures we don't block the UI while synthesis is in progress
              speechService.speak(content, voiceSettings)
                .then(() => {
                  console.log('Voice synthesis completed successfully');
                })
                .catch(synthError => {
                  console.error('Voice synthesis error (non-blocking):', synthError);
                });
                
              console.log('Initiated voice synthesis for response');
            } catch (synthError) {
              console.error('Failed to initiate voice synthesis:', synthError);
              // Continue with text-only response if voice synthesis fails
            }
          } catch (error) {
            console.error('Error generating voice response:', error);
            content = `I'm sorry, I encountered an error while processing your voice request. ${error instanceof Error ? error.message : ''}`;
            
            // Fall back to standard API if multimodal agent fails
            try {
              // Direct API call to OpenAI for voice mode responses as fallback
              const response = await fetch('/usergroupchatcontext/api/openai/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messages: [...messageHistory, { role: 'user', content: userMessage }],
                  model: bot.model || 'gpt-4o',
                  temperature: bot.parameters.temperature || 0.7,
                  max_tokens: bot.parameters.maxTokens || 1024,
                  // No tools in voice mode
                  tools: []
                }),
              }).then(res => res.json());
              
              // Log the response structure to debug
              console.log('Fallback voice mode OpenAI response:', response);
              
              // Extract content from the OpenAI response structure
              content = response.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
            } catch (fallbackError) {
              console.error('Fallback API also failed:', fallbackError);
            }
          }
        } else {
          // Normal text message processing flow remains unchanged
          // Generate response with appropriate tools if bot has tools enabled
          if (bot.useTools) {
            // Get the bot's enabled tools
            // Since we're dealing with type inconsistencies, just use an empty array for now
            // In a real implementation, this would filter the tools based on enabled tools
            const enabledTools: ToolDefinition[] = [];
            
            // Get tool definitions for enabled tools
            const toolDefinitions = enabledTools;
            
            // Call API with tool definitions
            const response = await fetch('/usergroupchatcontext/api/openai/chat', {
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
            
            // Log response structure to debug
            console.log('Tool-enabled OpenAI response:', response);
            
            // Check if response includes tool calls
            if (response.choices?.[0]?.message?.tool_calls && 
                response.choices[0].message.tool_calls.length > 0 && 
                executeToolCalls) {
              // Format tool calls for our tool execution service
              const formattedToolCalls = response.choices[0].message.tool_calls.map((call: any) => ({
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
              const finalResponse = await fetch('/usergroupchatcontext/api/openai/chat', {
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
              
              content = finalResponse.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
            } else {
              // No tool calls or tool execution not enabled
              content = response.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
            }
          } else {
            // Standard chat completion without tools
            const response = await fetch('/usergroupchatcontext/api/openai/chat', {
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
            
            // Log response structure to debug
            console.log('Standard OpenAI response:', response);
            
            content = response.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
          }
        }
      }
      
      return { content, toolResults };
    } catch (error) {
      console.error("Error generating bot response:", error);
      return { 
        content: `I'm sorry, I encountered an error while processing your request. ${error instanceof Error ? error.message : ''}`,
        toolResults: []
      };
    } finally {
      // Remove this bot from typing indicators
      dispatch({ 
        type: 'SET_TYPING_BOT_IDS', 
        payload: state.typingBotIds.filter(id => id !== botId) 
      });
    }
  };
  
  // Start listening for voice input
  const startListening = async () => {
    // First check if we're already connected through the room object directly
    if (room && room.state === 'connected') {
      setIsConnected(true);
    }
    
    // Now verify connection state, using both our local state and direct room check
    if (!isConnected && (!room || room.state !== 'connected')) {
      console.error('Cannot start listening - not connected to LiveKit');
      
      // Add a helpful message to chat
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: uuidv4(),
          content: "Voice mode failed to initialize. Please try again or check your connection.",
          role: 'system',
          sender: 'system',
          timestamp: Date.now(),
          type: 'text'
        }
      });
      
      return;
    }
    
    try {
      console.log('Starting voice listening mode...');
      await multimodalAgentService.resumeAudioContext();
      await multimodalAgentService.startListening();
      roomSessionManager.setVoiceModeActive(true);
      setIsListening(true);
      setIsInVoiceMode(true);
    } catch (error) {
      console.error('Failed to start voice listening:', error);
      
      // Add error message to chat
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: uuidv4(),
          content: `Voice mode error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'system',
          sender: 'system',
          timestamp: Date.now(),
          type: 'text'
        }
      });
      
      throw error;
    }
  };
  
  // Stop listening for voice input
  const stopListening = () => {
    if (!isListening) return;
    
    console.log('Stopping voice listening mode...');
    multimodalAgentService.stopListening();
    roomSessionManager.setVoiceModeActive(false);
    setIsListening(false);
    setIsInVoiceMode(false);
    
    // Stop any ongoing speech
    stopBotSpeech();
  };
  
  // Play bot response using text-to-speech
  const playBotResponse = async (botId: BotId, text: string) => {
    if (!text.trim()) return;
    
    try {
      // Find the bot
      const bot = botRegistryState.availableBots.find(b => b.id === botId);
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }
      
      // First generate the text response, as a fallback if voice fails
      const responseTextId = uuidv4();
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: responseTextId,
          content: text,
          role: 'assistant',
          sender: botId,
          timestamp: Date.now(),
          type: 'text'
        }
      });
      
      // Set the current speaking bot
      setIsBotSpeaking(true);
      setCurrentSpeakingBotId(botId);
      
      // Configure voice options for the bot
      const voiceOptions = {
        // Start with default settings
        voice: 'alloy',
        speed: 1.0,
        model: 'gpt-4o-realtime-preview', // Default to latest realtime model
        quality: 'high-quality' as const,
        // Override with any settings the bot has defined
        ...(bot.voiceSettings || {})
      };
      
      console.log(`Using voice settings for bot ${bot.name}:`, voiceOptions);
      
      // Use the standard voice synthesis service directly instead of going through multimodal service
      // This provides more reliability and better error handling
      let synthesisSuccess = false;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (!synthesisSuccess && retryCount <= maxRetries) {
        try {
          // Create a new service instance for each attempt to avoid stale state
          const responseSynthesisService = new VoiceSynthesisService(voiceOptions);
          
          // Add event listeners for progress
          const startTime = Date.now();
          responseSynthesisService.onStart(() => {
            console.log(`Speech synthesis started for bot ${bot.name}`);
          });
          
          // Begin voice synthesis asynchronously
          const speakPromise = responseSynthesisService.speak(text, voiceOptions);
          
          // Wait for completion or timeout
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Speech synthesis timed out')), 15000));
          
          await Promise.race([speakPromise, timeout]);
          synthesisSuccess = true;
          
          // Log success
          const duration = Date.now() - startTime;
          console.log(`Speech synthesis completed in ${duration}ms`);
          
        } catch (synthError) {
          retryCount++;
          console.error(`Speech synthesis attempt ${retryCount} failed:`, synthError);
          
          if (retryCount >= maxRetries) {
            console.error(`Failed to synthesize speech after ${maxRetries} attempts`);
            break;
          }
          
          // Wait before retrying with different settings
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try with different voice on retry
          if (retryCount === 1) {
            voiceOptions.voice = 'echo'; // Try a different voice for retry
          }
        }
      }
      
      // Always resolve regardless of synthesis success, since we already added the text message
      setIsBotSpeaking(false);
      setCurrentSpeakingBotId(null);
      return Promise.resolve();
      
    } catch (error) {
      console.error('Error playing bot response:', error);
      setIsBotSpeaking(false);
      setCurrentSpeakingBotId(null);
      return Promise.resolve(); // Resolve anyway to avoid hanging the UI
    }
  };
  
  // Stop bot speech
  const stopBotSpeech = () => {
    if (!isBotSpeaking) return;
    
    // Stop the global voice synthesis service
    voiceSynthesisService.stop();
    
    // If we're using browser's SpeechSynthesis API, make sure it's also canceled
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Reset state
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

  // Add this function to completely exit voice mode
  const exitVoiceMode = () => {
    multimodalAgentService.stopListening();
    setIsListening(false);
    setIsInVoiceMode(false);
    if (isBotSpeaking) {
      stopBotSpeech();
    }
    dispatch({ type: 'TOGGLE_RECORDING' });
  };

  // Add an effect to detect when user disconnects from LiveKit completely
  useEffect(() => {
    if (!isConnected && isInVoiceMode) {
      setIsInVoiceMode(false);
    }
  }, [isConnected, isInVoiceMode]);

  const contextValue: LiveKitIntegrationContextType = {
    isListening,
    startListening,
    stopListening,
    isBotSpeaking,
    isInVoiceMode,
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