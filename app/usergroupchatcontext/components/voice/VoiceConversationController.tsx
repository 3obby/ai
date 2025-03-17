import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { useTurnTaking } from '../../hooks/useTurnTaking';
import { Bot, BotId, Message } from '../../types';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';
import roomSessionManager from '../../services/livekit/room-session-manager';
import voiceActivityService from '../../services/livekit/voice-activity-service';
import livekitService from '../../services/livekit/livekit-service';
import { v4 as uuidv4 } from 'uuid';

interface VoiceConversationControllerProps {
  voiceEnabled: boolean;
  onVoiceToggle?: (enabled: boolean) => void;
}

// Extend the Bot interface to include voice properties
interface VoiceEnabledBot extends Bot {
  voiceConfig?: {
    voice?: string;
    speed?: number;
    enabled?: boolean;
  };
}

export function VoiceConversationController({
  voiceEnabled,
  onVoiceToggle
}: VoiceConversationControllerProps) {
  const { state, dispatch } = useGroupChatContext();
  const { state: botState } = useBotRegistry();
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isInterimTranscript, setIsInterimTranscript] = useState(false);
  const [activeRoomName, setActiveRoomName] = useState<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  
  // Set up turn taking with active bots
  const activeBots = state.settings.activeBotIds || [];
  
  const {
    currentSpeaker,
    queue,
    isTransitioning,
    requestTurn,
    userRequestsTurn,
    endCurrentTurn
  } = useTurnTaking({
    priorityBots: activeBots,
    enableInterruptions: true,
    onTurnStarted: (speaker) => {
      console.log(`Turn started: ${speaker}`);
    },
    onTurnEnded: (speaker) => {
      console.log(`Turn ended: ${speaker}`);
    },
    onUserSpeaking: () => {
      // When user starts speaking, make sure we're listening
      if (!isListening) {
        startListening();
      }
    },
    onBotSpeaking: (botId) => {
      // When a bot starts speaking, generate speech for it
      const bot = botState.availableBots.find(b => b.id === botId);
      if (bot) {
        speakForBot(bot as VoiceEnabledBot);
      }
    }
  });

  // Initialize LiveKit connection when voice is enabled
  useEffect(() => {
    if (!voiceEnabled) {
      disconnectFromLiveKit();
      return;
    }
    
    connectToLiveKit();
    
    return () => {
      disconnectFromLiveKit();
    };
  }, [voiceEnabled]);
  
  // Handle transcription results from the multimodal agent
  useEffect(() => {
    if (!voiceEnabled) return;
    
    const handleTranscription = (text: string, isFinal: boolean) => {
      setCurrentTranscript(text);
      setIsInterimTranscript(!isFinal);
      
      if (isFinal && text.trim()) {
        // Add the transcribed message to the chat
        const messageId = uuidv4();
        
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: messageId,
            content: text.trim(),
            role: 'user',
            sender: 'user',
            timestamp: Date.now(),
            type: 'voice',
            metadata: {
              processing: {
                preProcessed: false,
                postProcessed: false
              }
            }
          }
        });
        
        // Clear the current transcript
        setCurrentTranscript('');
        
        // End the user's turn
        endCurrentTurn();
      }
    };
    
    multimodalAgentService.onTranscription(handleTranscription);
    
    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, [voiceEnabled, dispatch, endCurrentTurn]);

  // Monitor messages to trigger voice synthesis for new bot messages
  useEffect(() => {
    if (!voiceEnabled || !isConnected) return;

    // Process new bot messages that haven't been spoken yet
    const newBotMessages = state.messages.filter(message => 
      message.role === 'assistant' && 
      !processedMessageIds.current.has(message.id)
    );

    if (newBotMessages.length > 0) {
      newBotMessages.forEach(message => {
        // Mark this message as processed
        processedMessageIds.current.add(message.id);
        
        // Find the bot who sent this message
        const botId = message.sender;
        if (botId && botId !== 'user' && botId !== 'system') {
          const bot = botState.availableBots.find(b => b.id === botId);
          if (bot) {
            // Request turn for this bot
            requestTurn(botId);
          }
        }
      });
    }
  }, [state.messages, voiceEnabled, isConnected, botState.availableBots, requestTurn]);
  
  // Connect to LiveKit and set up the room session
  const connectToLiveKit = useCallback(async () => {
    try {
      // In a real implementation, you would get the token from your server
      // For demo purposes, we're using a placeholder
      const roomName = `group-chat-${uuidv4()}`;
      const token = 'DEMO_TOKEN'; // This would come from your server in real app
      const livekitUrl = 'wss://your-livekit-server.example.com';
      
      // Initialize room session
      const session = await roomSessionManager.createSession(roomName, token, livekitUrl);
      setActiveRoomName(roomName);
      
      // Initialize multimodal agent
      multimodalAgentService.initialize({
        model: 'gpt-4o',
        voice: 'nova',
        voiceSpeed: 1.0,
        vadOptions: {
          mode: 'auto',
          threshold: 0.3,
          silenceDuration: 1000
        }
      });
      
      setIsConnected(true);
      console.log('Connected to LiveKit room:', roomName);

      // Set up synthesis event handlers
      multimodalAgentService.onSynthesisEvent('synthesis:start', (text) => {
        console.log(`Started speaking: ${text.substring(0, 30)}...`);
      });

      multimodalAgentService.onSynthesisEvent('synthesis:complete', () => {
        console.log('Finished speaking');
      });
    } catch (error) {
      console.error('Error connecting to LiveKit:', error);
      setIsConnected(false);
      
      // Disable voice if connection fails
      if (onVoiceToggle) {
        onVoiceToggle(false);
      }
    }
  }, [onVoiceToggle]);
  
  // Disconnect from LiveKit
  const disconnectFromLiveKit = useCallback(() => {
    stopListening();
    
    // Disconnect by closing the active session
    if (activeRoomName) {
      roomSessionManager.closeSession(activeRoomName);
      setActiveRoomName(null);
    }
    
    setIsConnected(false);
    console.log('Disconnected from LiveKit');
  }, [activeRoomName]);
  
  // Start listening for user voice input
  const startListening = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const success = await multimodalAgentService.startListening();
      setIsListening(success);
      
      // Request a turn for the user
      userRequestsTurn(true);
    } catch (error) {
      console.error('Error starting listening:', error);
      setIsListening(false);
    }
  }, [isConnected, userRequestsTurn]);
  
  // Stop listening for user voice input
  const stopListening = useCallback(() => {
    if (!isListening) return;
    
    multimodalAgentService.stopListening();
    setIsListening(false);
    
    // If the user has the turn, end it
    if (currentSpeaker === 'user') {
      endCurrentTurn();
    }
  }, [isListening, currentSpeaker, endCurrentTurn]);
  
  // Generate speech for a bot
  const speakForBot = useCallback(async (bot: VoiceEnabledBot) => {
    if (!isConnected) return;
    
    // Get the last message from this bot
    const botMessages = state.messages.filter(m => m.sender === bot.id);
    if (botMessages.length === 0) return;
    
    const lastMessage = botMessages[botMessages.length - 1];
    
    // Only synthesize speech if this is a valid message with content
    if (!lastMessage.content?.trim()) {
      endCurrentTurn();
      return;
    }
    
    // Synthesize speech for the message
    await multimodalAgentService.synthesizeSpeech(lastMessage.content, {
      voice: bot.voiceConfig?.voice || 'nova',
      speed: bot.voiceConfig?.speed || 1.0
    });
    
    // After the bot finishes speaking, end their turn
    endCurrentTurn();
  }, [isConnected, state.messages, endCurrentTurn]);
  
  // Return null as this is a controller component with no UI
  return null;
} 