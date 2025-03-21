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
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  isBotSpeaking: boolean;
  isInVoiceMode: boolean;
  currentSpeakingBotId: BotId | null;
  playBotResponse: (botId: BotId, text: string, messageId?: string) => Promise<void>;
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
  const { room, isConnected: liveKitIsConnected, ensureConnection } = useLiveKit();
  const { state: botRegistryState } = useBotRegistry();
  const { executeToolCalls } = useToolCall();
  
  const [isListening, setIsListening] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isInVoiceMode, setIsInVoiceMode] = useState(false);
  const [currentSpeakingBotId, setCurrentSpeakingBotId] = useState<BotId | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Add a reference to track recently played message IDs
  const recentlyPlayedMessageIds = React.useRef<Set<string>>(new Set());
  
  // Add tracking for in-progress transcriptions to avoid duplicate processing
  const processedTranscriptions = React.useRef<Set<string>>(new Set());
  const inProgressTranscription = React.useRef<{ text: string, timestamp: number } | null>(null);
  const responseInProgress = React.useRef<boolean>(false);

  // Track messages being processed to avoid duplicate responses
  const messagesBeingProcessed = React.useRef<Set<string>>(new Set());
  const userMessageToResponseMap = React.useRef<Map<string, Set<string>>>(new Map());

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
      console.log('[DEBUG TRANSCRIPT] LiveKitIntegrationProvider received transcription:', text, 'isFinal:', isFinal);
      
      // Check if we're still connected and in voice mode
      if (!isInVoiceMode || !isConnected) {
        console.log('[DEBUG TRANSCRIPT] Skipping transcription processing - voice mode:', isInVoiceMode, 'connected:', isConnected);
        return;
      }
      
      // Normalize text to help with better matching
      const normalizedText = text.trim().toLowerCase();
      
      // ENHANCED DEDUPLICATION: Check if we're already processing this transcription
      if (inProgressTranscription.current && (
        // Exact match 
        inProgressTranscription.current.text === normalizedText ||
        // Or very similar content
        (normalizedText.length > 5 && (
          inProgressTranscription.current.text.includes(normalizedText) ||
          normalizedText.includes(inProgressTranscription.current.text)
        )) ||
        // Or very recent (within 2 seconds)
        (Date.now() - inProgressTranscription.current.timestamp < 2000)
      )) {
        console.log('[DEBUG TRANSCRIPT] Already processing similar transcription:', inProgressTranscription.current.text);
        return;
      }
      
      // IMPROVED: Check if we've recently processed this exact transcription
      if (processedTranscriptions.current.has(normalizedText)) {
        console.log('[DEBUG TRANSCRIPT] Already processed this exact transcription recently:', normalizedText);
        return;
      }
      
      // Add a deduplication check to prevent duplicate messages
      const recentMessages = state.messages.slice(-10); // Check more recent messages
      console.log('[DEBUG TRANSCRIPT] Checking duplication against recent messages:', recentMessages.length);
      
      const isDuplicate = recentMessages.some(msg => 
        msg.role === 'user' && 
        (msg.type === 'voice' || msg.type === 'text') && 
        (
          // Exact match
          msg.content.trim().toLowerCase() === normalizedText ||
          // Or very similar (to catch minor transcription differences)
          (
            msg.content.length > 5 && normalizedText.length > 5 && 
            (
              msg.content.toLowerCase().includes(normalizedText) || 
              normalizedText.includes(msg.content.toLowerCase())
            )
          )
        ) &&
        // Reduced time window for more aggressive deduplication
        Date.now() - msg.timestamp < 5000
      );
      
      if (isDuplicate) {
        console.log('[DEBUG TRANSCRIPT] Skipping duplicate transcription message:', text);
        return;
      }
      
      // Set this as the current in-progress transcription
      inProgressTranscription.current = {
        text: normalizedText,
        timestamp: Date.now()
      };
      
      // Track that we're processing a response to avoid overlapping responses
      if (responseInProgress.current) {
        console.log('[DEBUG TRANSCRIPT] Response already in progress, skipping:', text);
        return;
      }
      
      responseInProgress.current = true;
      
      try {
        console.log('[DEBUG TRANSCRIPT] Not a duplicate, proceeding with message');
        
        // Check if it contains a tool call
        const isToolCall = await detectToolsInTranscription(text);
        
        // If it was a tool call, skip normal message processing
        if (isToolCall) {
          console.log('[DEBUG TRANSCRIPT] Skipping normal processing - detected tool call');
          // Add to processed transcriptions to prevent reprocessing
          processedTranscriptions.current.add(normalizedText);
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
        console.log('[DEBUG TRANSCRIPT] Dispatching transcription to chat:', message);
        dispatch({
          type: 'ADD_MESSAGE',
          payload: message
        });
        
        // Process message through bot response system
        console.log('[DEBUG TRANSCRIPT] Processing message through bot response system');
        await processUserMessage(message);
        
        // Add to processed transcriptions after successful processing
        processedTranscriptions.current.add(normalizedText);
        
        // Clear in-progress after 5 seconds to allow new similar transcriptions
        setTimeout(() => {
          if (inProgressTranscription.current?.text === normalizedText) {
            inProgressTranscription.current = null;
          }
        }, 5000);
        
        // Clean up old transcriptions (keep only last 20)
        if (processedTranscriptions.current.size > 20) {
          const values = Array.from(processedTranscriptions.current);
          for (let i = 0; i < values.length - 20; i++) {
            processedTranscriptions.current.delete(values[i]);
          }
        }
      } finally {
        // Release the in-progress lock
        responseInProgress.current = false;
      }
    };
    
    // Set up listener directly on the multimodalAgentService
    console.log('[DEBUG TRANSCRIPT] Setting up transcription handler on multimodalAgentService');
    multimodalAgentService.onTranscription(handleTranscription);
    
    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, [room, isConnected, dispatch, isInVoiceMode, state.messages]);
  
  // Process user message through bot response system
  const processUserMessage = async (message: Message) => {
    try {
      // Check if we're already processing this exact message
      if (messagesBeingProcessed.current.has(message.id)) {
        console.log('[DEBUG] Already processing this message, skipping duplicate:', message.id);
        return;
      }
      
      // Track that we're processing this message
      messagesBeingProcessed.current.add(message.id);
      
      // Set processing state
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      // Don't add the message again since it's already added by the caller
      
      // Check if we should respond at all
      if (state.settings.activeBotIds.length === 0) {
        console.log('[DEBUG] No active bots to respond, skipping message processing');
        return;
      }
      
      // Determine which bots should respond
      const activeBotIds = state.settings.activeBotIds;
      const activeBots = botRegistryState.availableBots.filter(bot => activeBotIds.includes(bot.id));
      
      // Verify we have active bots to respond
      if (activeBots.length === 0) {
        console.log('[DEBUG] No active bots found in registry, skipping message processing');
        return;
      }
      
      // Check if this message is from voice mode
      const isVoiceMessage = message.type === 'voice';
      
      console.log(`[DEBUG] Processing ${isVoiceMessage ? 'voice' : 'text'} message with ${activeBots.length} active bots`);
    
      // Add typing indicators for all active bots
      dispatch({ 
        type: 'SET_TYPING_BOT_IDS', 
        payload: activeBotIds 
      });
      
      try {
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
          botResponses.push(...responses.map((response, index) => {
            const botMessage: Message = {
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
                  userMessageId: message.id, // Track which user message this responds to
                } as ProcessingMetadata
              }
            };
            
            // Track the relationship between user message and bot response
            if (!userMessageToResponseMap.current.has(message.id)) {
              userMessageToResponseMap.current.set(message.id, new Set());
            }
            userMessageToResponseMap.current.get(message.id)?.add(botMessage.id);
            
            return botMessage;
          }));
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
                  userMessageId: message.id, // Track which user message this responds to
                } as ProcessingMetadata
              }
            };
            
            // Track the relationship between user message and bot response
            if (!userMessageToResponseMap.current.has(message.id)) {
              userMessageToResponseMap.current.set(message.id, new Set());
            }
            userMessageToResponseMap.current.get(message.id)?.add(botMessage.id);
            
            botResponses.push(botMessage);
            
            // Short pause between sequential responses
            if (activeBots.length > 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }
        
        // Ensure we're not adding duplicate responses
        const existingMessageIds = new Set(state.messages.map(m => m.id));
        
        // Add all bot responses to chat
        for (const botResponse of botResponses) {
          // Skip if this response was somehow already added
          if (existingMessageIds.has(botResponse.id)) {
            console.log('[DEBUG] Skipping already added bot response:', botResponse.id);
            continue;
          }
          
          dispatch({
            type: 'ADD_MESSAGE',
            payload: botResponse
          });
          
          // Find the bot
          const bot = activeBots.find(b => b.id === botResponse.sender);
          
          // Only speak the response if we're actually in voice mode, not just when voice is enabled
          if (bot && state.settings.ui.enableVoice && isInVoiceMode && isVoiceMessage) {
            await playBotResponse(bot.id, botResponse.content, botResponse.id);
          }
          
          // Add to existing IDs to prevent adding the same response twice
          existingMessageIds.add(botResponse.id);
        }
      } finally {
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
      
      // Remove this message from the tracking set
      messagesBeingProcessed.current.delete(message.id);
      
      // Cleanup old entries from the user-response map
      // Keep most recent 20 entries
      const entries = Array.from(userMessageToResponseMap.current.entries());
      if (entries.length > 20) {
        for (let i = 0; i < entries.length - 20; i++) {
          userMessageToResponseMap.current.delete(entries[i][0]);
        }
      }
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
      console.log(`Generating response for bot ${botId} ${options.isVoiceMode ? 'in voice mode' : ''}`);
      
      // Get the bot details
      const bot = botRegistryState.availableBots.find(b => b.id === botId);
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }
      
      // Get conversation history
      const history = state.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        name: msg.sender !== 'user' ? msg.sender : undefined
      }));
      
      // If in voice mode, add a system message to prevent echoing transcriptions
      let systemPrompt = bot.systemPrompt || state.settings.systemPrompt || '';
      if (options.isVoiceMode) {
        systemPrompt += '\nThis conversation includes voice transcriptions. Respond to the user naturally without echoing or repeating their transcribed words. Focus on addressing their questions or requests directly.';
      }
      
      // If options.disableToolCalling is true, force useTools to be false regardless of bot settings
      const useTools = options.disableToolCalling ? false : bot.useTools;
      
      // Set the bot as typing
      dispatch({ 
        type: 'SET_TYPING_BOT_IDS', 
        payload: [...state.typingBotIds, botId] 
      });

      // Generate response
      let content = '';
      let toolResults: ToolResult[] = [];
      
      try {
        // Use mock service for development/testing
        if (process.env.NEXT_PUBLIC_USE_FALLBACK_SERVICE === 'true') {
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
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...history, 
                    { role: 'user', content: userMessage }
                  ],
                  model: 'gpt-4o',
                  temperature: bot.temperature || 0.7,
                  max_tokens: bot.maxTokens || 2048,
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
                    messages: [...history, { role: 'user', content: userMessage }],
                    model: bot.model || 'gpt-4o',
                    temperature: bot.temperature || 0.7,
                    max_tokens: bot.maxTokens || 1024,
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
            if (useTools) {
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
                  messages: [...history, { role: 'user', content: userMessage }],
                  model: bot.model || 'gpt-4o',
                  temperature: bot.temperature || 0.7,
                  max_tokens: bot.maxTokens || 1024,
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
                      ...history, 
                      { role: 'user', content: userMessage },
                      ...toolResponseMessages
                    ],
                    model: bot.model || 'gpt-4o',
                    temperature: bot.temperature || 0.7,
                    max_tokens: bot.maxTokens || 1024,
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
                  messages: [...history, { role: 'user', content: userMessage }],
                  model: bot.model || 'gpt-4o',
                  temperature: bot.temperature || 0.7,
                  max_tokens: bot.maxTokens || 1024,
                }),
              }).then(res => res.json());
              
              // Log response structure to debug
              console.log('Standard OpenAI response:', response);
              
              content = response.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
            }
          }
        }
      } catch (error) {
        console.error("Error generating bot response:", error);
        content = `I'm sorry, I encountered an error while processing your request. ${error instanceof Error ? error.message : ''}`;
        toolResults = [];
      } finally {
        // Remove this bot from typing indicators
        dispatch({ 
          type: 'SET_TYPING_BOT_IDS', 
          payload: state.typingBotIds.filter(id => id !== botId) 
        });
      }
      
      return { content, toolResults };
    } catch (error) {
      console.error("Error generating bot response:", error);
      return { 
        content: `I'm sorry, I encountered an error while processing your request. ${error instanceof Error ? error.message : ''}`,
        toolResults: []
      };
    }
  };
  
  // Add this simple debug function at the beginning of the component
  const debugVoiceMode = () => {
    console.log('---- VOICE MODE DEBUG ----');
    console.log('- Connected to LiveKit:', isConnected);
    console.log('- Voice mode active:', isInVoiceMode);
    console.log('- Listening state:', isListening);
    console.log('- Bot speaking:', isBotSpeaking);
    console.log('- Current speaking bot:', currentSpeakingBotId);
    console.log('- Available bots:', botRegistryState.availableBots);
    console.log('- Voice multimodal agent config:', multimodalAgentService.getConfig());
    console.log('- Room connection:', room ? room.state : 'No room');
    console.log('-------------------------');
  };

  // Add debug logging to startListening to track voice mode startup issues
  const startListening = async (): Promise<boolean> => {
    try {
      console.log('[DEBUG] Starting voice listening mode...');
      
      // Debug info
      console.log('---- VOICE MODE DEBUG ----');
      console.log('- Connected to LiveKit:', isConnected);
      console.log('- Voice mode active:', isInVoiceMode);
      console.log('- Listening state:', isListening);
      console.log('- Bot speaking:', isBotSpeaking);
      console.log('- Current speaking bot:', currentSpeakingBotId);
      console.log('- Available bots:', state.bots);
      console.log('- Voice multimodal agent config:', multimodalAgentService.getConfig());
      console.log('- Room connection:', room ? room.name : 'No room');
      console.log('-------------------------');
      
      // Ensure we have a LiveKit connection
      if (!isConnected) {
        await ensureConnection();
      }
      
      // Force UI transition to voice mode even if connections fail
      // This ensures the UI shows voice mode controls
      setIsInVoiceMode(true);
      
      try {
        // Start listening with the multimodal agent
        await multimodalAgentService.startListening();
        
        // Update state
        setIsListening(true);
        setIsInVoiceMode(true);
        
        return true;
      } catch (error) {
        console.error('[DEBUG] Failed to start voice listening:', error);
        
        // Keep UI in voice mode even if connection fails
        // setIsInVoiceMode(false);
        
        return false;
      }
    } catch (error) {
      console.error('Error starting listening:', error);
      return false;
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
  const playBotResponse = async (botId: BotId, text: string, messageId?: string) => {
    if (!text || !botId) {
      console.error('[DEBUG] Cannot play bot response - missing text or botId:', { botId, textLength: text?.length });
      return;
    }

    // Prevent duplicate playback by tracking message IDs
    if (messageId) {
      // If this message was already played recently, skip it
      if (recentlyPlayedMessageIds.current.has(messageId)) {
        console.log('[DEBUG] Skipping duplicate playback for message:', messageId);
        return;
      }
      
      // Add this message ID to the recently played set
      recentlyPlayedMessageIds.current.add(messageId);
      
      // Remove it after 5 seconds to allow future playback if needed
      setTimeout(() => {
        recentlyPlayedMessageIds.current.delete(messageId);
      }, 5000);
    }

    console.log('[DEBUG] Starting to play bot response:', { botId, textLength: text.length, messageId });
    
    try {
      // Set UI state for speech
      setIsBotSpeaking(true);
      setCurrentSpeakingBotId(botId);
      
      // First stop any currently playing audio using the available method
      try {
        if (typeof voiceSynthesisService.stop === 'function') {
          voiceSynthesisService.stop();
        }
      } catch (stopError) {
        console.warn('[DEBUG] Error stopping previous voice synthesis:', stopError);
      }
      
      // Get bot configuration for voice settings
      const bot = botRegistryState.availableBots.find(b => b.id === botId);
      if (!bot) {
        console.error('[DEBUG] Bot not found for voice playback:', botId);
        return;
      }
      
      // Determine voice settings 
      const voiceId = bot.voiceSettings?.voice || 'alloy';
      const speed = bot.voiceSettings?.speed || 1.0;
      const quality = bot.voiceSettings?.quality || 'high-quality';
      
      console.log('[DEBUG] Using voice settings:', { voiceId, speed, quality });
      
      // Use the VoiceSynthesisService with a fresh instance to avoid state issues
      const synthService = new VoiceSynthesisService({
        voice: voiceId,
        rate: speed,
        model: 'gpt-4o',
      });
      
      // Start synthesizing speech
      console.log('[DEBUG] Calling speak method on VoiceSynthesisService');
      await synthService.speak(text);
      
      console.log('[DEBUG] Bot response playback completed successfully');
    } catch (error) {
      console.error('[DEBUG] Error playing bot response:', error);
    } finally {
      // Reset UI state
      setIsBotSpeaking(false);
      setCurrentSpeakingBotId(null);
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