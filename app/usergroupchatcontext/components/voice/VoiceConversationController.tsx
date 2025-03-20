'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import VoiceInputButton from './VoiceInputButton';
import AudioVisualizer from './AudioVisualizer';
import { VoiceActivityIndicator } from './VoiceActivityIndicator';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import { Message } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import useVoiceToolConfirmation from '../../hooks/useVoiceToolConfirmation';
import VoiceToolConfirmation from '../tools/VoiceToolConfirmation';
import voiceToolCallingService from '../../services/voiceToolCallingService';
import { ToolDefinition } from '../../types/bots';
import { formatToolResultForVoice } from '../../utils/toolResponseFormatter';
import voiceToolRegistry from '../../services/voiceToolRegistry';

interface VoiceConversationControllerProps {
  className?: string;
}

export default function VoiceConversationController({ className = '' }: VoiceConversationControllerProps) {
  const { 
    isListening, 
    startListening, 
    stopListening, 
    isBotSpeaking, 
    currentSpeakingBotId, 
    stopBotSpeech,
    playBotResponse
  } = useLiveKitIntegration();
  
  const { state, dispatch } = useGroupChatContext();
  const { bots } = useBotRegistry();
  const { settings } = state;
  const isVoiceEnabled = settings.ui?.enableVoice;
  
  const [audioLevel, setAudioLevel] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isTurnActive, setIsTurnActive] = useState(false);
  const [availableTools, setAvailableTools] = useState<ToolDefinition[]>([]);
  
  // Tool confirmation state management
  const {
    confirmationState,
    showToolConfirmation,
    hideToolConfirmation,
    confirmToolExecution,
    denyToolExecution
  } = useVoiceToolConfirmation();
  
  // Get available tools from active bots
  useEffect(() => {
    if (!isVoiceEnabled) return;
    
    const tools: ToolDefinition[] = [];
    
    // Extract tools from all active bots
    state.settings.activeBotIds.forEach(botId => {
      const bot = bots.find(b => b.id === botId);
      if (bot && 'tools' in bot) {
        const botTools = (bot as any).tools;
        if (Array.isArray(botTools)) {
          botTools.forEach((tool: ToolDefinition) => {
            // Avoid duplicate tools
            if (!tools.some(t => t.id === tool.id)) {
              tools.push(tool);
            }
          });
        }
      }
    });
    
    // Add voice-optimized tools from the registry
    const voiceTools = voiceToolRegistry.getToolDefinitions();
    voiceTools.forEach(voiceTool => {
      if (!tools.some(t => t.id === voiceTool.id)) {
        tools.push(voiceTool);
      }
    });
    
    setAvailableTools(tools);
  }, [isVoiceEnabled, state.settings.activeBotIds, bots]);
  
  // Update audio level for visualization
  useEffect(() => {
    if (!isListening) {
      setAudioLevel(0);
      return;
    }
    
    const updateAudioLevel = () => {
      // For now, just simulate some random activity when listening
      if (isListening) {
        setAudioLevel(Math.random() * 0.7);
      }
    };
    
    const interval = setInterval(updateAudioLevel, 100);
    return () => clearInterval(interval);
  }, [isListening]);
  
  // Handle automatic turn-taking
  useEffect(() => {
    if (!isVoiceEnabled) return;
    
    // When the bot stops speaking, it's the user's turn
    if (isTurnActive && !isBotSpeaking && !isListening) {
      startListening();
    }
    
    // When user stops talking and transcription is finished, it's the bot's turn
    if (isTurnActive && !isListening && !isBotSpeaking && state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage.sender === 'user' && !state.typingBotIds.length) {
        // The bots will automatically respond because of the message processing pipeline
        // We just need to make sure we're waiting for the bot to start speaking
        setIsTurnActive(true);
      }
    }
  }, [isVoiceEnabled, isTurnActive, isBotSpeaking, isListening, state.messages, state.typingBotIds, startListening]);
  
  // Handle potential tool calls in transcription
  const processTranscriptionForTools = useCallback(async (text: string, isFinal: boolean) => {
    if (!isFinal || !isVoiceEnabled || availableTools.length === 0) return false;
    
    try {
      // Detect if the transcription contains a tool call
      const detectionResult = await voiceToolCallingService.detectToolCall(text, availableTools);
      
      // If tool call detected with reasonable confidence
      if (detectionResult.isToolCall && detectionResult.detectedTools.length > 0) {
        // Get highest confidence tool match
        const bestToolMatch = detectionResult.detectedTools.reduce(
          (best, current) => current.confidence > best.confidence ? current : best, 
          detectionResult.detectedTools[0]
        );
        
        // If very high confidence (> 0.9), execute immediately
        if (bestToolMatch.confidence > 0.9) {
          const result = await voiceToolCallingService.executeVoiceToolCall(
            bestToolMatch.name,
            bestToolMatch.arguments
          );
          
          // Add tool result as message
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
          
          // Provide voice feedback about the tool execution
          const voiceResponse = formatToolResultForVoice(result);
          await playBotResponse('system', voiceResponse);
          
          return true;
        } 
        // If medium confidence (0.6-0.9), show confirmation dialog
        else if (bestToolMatch.confidence > 0.6) {
          showToolConfirmation(
            bestToolMatch.name,
            bestToolMatch.arguments,
            bestToolMatch.confidence
          );
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error processing transcription for tools:', error);
      return false;
    }
  }, [isVoiceEnabled, availableTools, dispatch, showToolConfirmation, playBotResponse]);
  
  // Handle tool confirmation result
  const handleToolConfirmResult = useCallback(async () => {
    try {
      const result = await confirmToolExecution();
      
      if (result) {
        // Add tool result as message
        const toolResultMessage: Message = {
          id: uuidv4(),
          content: `Tool ${result.toolName} executed with result: ${JSON.stringify(result.output)}`,
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
        
        // Provide voice feedback about the tool execution
        const voiceResponse = formatToolResultForVoice(result);
        await playBotResponse('system', voiceResponse);
      }
    } catch (error) {
      console.error('Error handling tool confirmation:', error);
      // Provide voice feedback about the error
      await playBotResponse('system', "I wasn't able to execute that tool. Let's try something else.");
    }
  }, [confirmToolExecution, dispatch, playBotResponse]);
  
  // Voice feedback for tool denial
  const handleToolDeny = useCallback(async () => {
    denyToolExecution();
    await playBotResponse('system', "Okay, I won't run that tool.");
  }, [denyToolExecution, playBotResponse]);
  
  // Handle transcription from VoiceInputButton
  const handleTranscription = useCallback(async (text: string, isFinal: boolean) => {
    // Try to process as tool call first
    const isToolCall = await processTranscriptionForTools(text, isFinal);
    
    // If it's a final transcription and not processed as a tool call
    if (isFinal && !isToolCall) {
      // Add the final transcription as a user message
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
          }
        }
      };
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: message
      });
    }
    
    // Update interim transcript for display
    if (!isFinal) {
      setInterimTranscript(text);
    } else {
      setInterimTranscript('');
    }
  }, [dispatch, processTranscriptionForTools]);
  
  // Register transcription handler with multimodal agent service on mount
  useEffect(() => {
    if (!isVoiceEnabled) return;
    
    // Register for transcription events from multimodal agent service
    multimodalAgentService.onTranscription(handleTranscription);
    
    return () => {
      // Clean up event listener
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, [isVoiceEnabled, handleTranscription]);
  
  // Handle starting a conversation turn
  const startConversationTurn = useCallback(async () => {
    if (!isVoiceEnabled) return;
    
    if (isBotSpeaking) {
      // If bot is speaking, stop it first
      stopBotSpeech();
    }
    
    // Start listening for user input
    await startListening();
    setIsTurnActive(true);
  }, [isVoiceEnabled, isBotSpeaking, stopBotSpeech, startListening]);
  
  // Handle ending a conversation turn
  const endConversationTurn = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    setIsTurnActive(false);
  }, [isListening, stopListening]);
  
  // Handle timer notifications 
  useEffect(() => {
    if (!isVoiceEnabled) return;
    
    const handleTimerComplete = (event: CustomEvent) => {
      const { timer, message } = event.detail;
      
      // Add message about timer completion
      const timerMessage: Message = {
        id: uuidv4(),
        content: message,
        role: 'assistant',
        sender: 'system',
        senderName: 'Timer',
        timestamp: Date.now(),
        type: 'text'
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: timerMessage });
      
      // Provide voice notification
      playBotResponse('system', message);
    };
    
    // Listen for timer complete events
    if (typeof window !== 'undefined') {
      window.addEventListener('voice:timer:complete', handleTimerComplete as EventListener);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('voice:timer:complete', handleTimerComplete as EventListener);
      }
    };
  }, [isVoiceEnabled, dispatch, playBotResponse]);
  
  const handleActivateVoiceMode = async () => {
    setInitializing(true);
    
    try {
      // Get current active bots and messages
      const activeBotIds = state.settings.activeBotIds;
      const currentMessages = state.messages;
      
      // Find or create voice bots for each active bot
      for (const botId of activeBotIds) {
        // Use the improved cloneBotInstanceForVoice method with messages for context inheritance
        const voiceBot = await botRegistry.cloneBotInstanceForVoice(botId, {
          messages: currentMessages,
        });
        
        if (voiceBot) {
          console.log(`Voice bot activated with conversation context: ${voiceBot.id}`);
          // Add the bot to active voice bots
          setActiveVoiceBots(prev => [...prev, voiceBot.id]);
        }
      }
      
      // Successfully initialized
      setVoiceModeActive(true);
    } catch (error) {
      console.error('Failed to activate voice mode:', error);
      // Show error to user
      setErrorMessage('Failed to activate voice mode. Please try again.');
    } finally {
      setInitializing(false);
    }
  };
  
  if (!isVoiceEnabled) return null;
  
  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {isListening && (
          <div className="flex flex-col items-center">
            <AudioVisualizer 
              level={audioLevel}
              className="h-8 w-20" 
            />
            {interimTranscript && (
              <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                {interimTranscript}
              </div>
            )}
          </div>
        )}
        
        {isBotSpeaking && (
          <div className="flex items-center gap-2">
            <VoiceActivityIndicator isActive={true} />
            <span className="text-xs text-muted-foreground">
              {currentSpeakingBotId ? `${currentSpeakingBotId} speaking...` : 'Bot speaking...'}
            </span>
            <button 
              onClick={stopBotSpeech}
              className="text-xs text-red-500 hover:text-red-700"
              aria-label="Stop bot speech"
            >
              Stop
            </button>
          </div>
        )}
        
        <VoiceInputButton 
          onTranscription={handleTranscription}
          className="ml-2"
        />
      </div>
      
      {/* Tool Confirmation Dialog */}
      <VoiceToolConfirmation
        isOpen={confirmationState.isOpen}
        toolName={confirmationState.toolName}
        confidence={confirmationState.confidence}
        arguments={confirmationState.arguments}
        onConfirm={handleToolConfirmResult}
        onDeny={handleToolDeny}
        onClose={hideToolConfirmation}
        timeout={8000} // 8 second timeout for voice interactions
      />
    </>
  );
}