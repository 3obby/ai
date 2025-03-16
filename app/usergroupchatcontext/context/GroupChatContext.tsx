'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  GroupChatState, 
  GroupChatAction, 
  GroupChatSettings,
  Message,
  Bot
} from '../types';
import { defaultGroupChatSettings } from '../data/defaultSettings';
import { getMockBotResponse } from '../services/mockBotService';

const initialState: GroupChatState = {
  settings: defaultGroupChatSettings,
  messages: [],
  isRecording: false,
  isProcessing: false,
  settingsOpen: false,
  activeSettingsTab: 'group',
  selectedBotId: null,
  typingBotIds: [],
  isLoading: false,
  error: undefined
};

function groupChatReducer(state: GroupChatState, action: GroupChatAction): GroupChatState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
      
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
      
    case 'ADD_MESSAGES':
      return {
        ...state,
        messages: [...state.messages, ...action.messages]
      };
      
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.messages
      };
      
    case 'TOGGLE_RECORDING':
      return {
        ...state,
        isRecording: !state.isRecording
      };
      
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload
      };
      
    case 'TOGGLE_SETTINGS':
      return {
        ...state,
        settingsOpen: !state.settingsOpen
      };
      
    case 'SET_ACTIVE_SETTINGS_TAB':
      return {
        ...state,
        activeSettingsTab: action.payload
      };
      
    case 'SET_SELECTED_BOT':
      return {
        ...state,
        selectedBotId: action.payload
      };
      
    case 'SET_TYPING_BOT_IDS':
      return {
        ...state,
        typingBotIds: action.payload
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error
      };
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: undefined
      };
      
    case 'RESET_CHAT':
      return {
        ...state,
        messages: []
      };
      
    default:
      return state;
  }
}

type GroupChatContextType = {
  state: GroupChatState;
  dispatch: React.Dispatch<GroupChatAction>;
  sendMessage: (content: string, role?: 'user' | 'system' | 'assistant', senderId?: string) => void;
};

const GroupChatContext = createContext<GroupChatContextType | undefined>(undefined);

// Keep a registry of bots for internal use
let botRegistry: Map<string, Bot> = new Map();

export function GroupChatProvider({ 
  children,
  initialSettings,
  availableBots = []
}: { 
  children: ReactNode;
  initialSettings?: Partial<GroupChatSettings>;
  availableBots?: Bot[];
}) {
  const [state, dispatch] = useReducer(
    groupChatReducer, 
    {
      ...initialState,
      settings: {
        ...initialState.settings,
        ...initialSettings
      }
    }
  );

  // Initialize the bot registry with available bots
  React.useEffect(() => {
    botRegistry = new Map(availableBots.map(bot => [bot.id, bot]));
  }, [availableBots]);

  // Helper function to get a bot by ID
  const getBot = (id: string): Bot | undefined => {
    return botRegistry.get(id);
  };
  
  const sendMessage = async (
    content: string, 
    role: 'user' | 'system' | 'assistant' = 'user',
    senderId: string = 'user'
  ) => {
    const message: Message = {
      id: uuidv4(),
      content,
      role,
      sender: senderId,
      senderName: senderId === 'user' ? 'You' : undefined,
      timestamp: Date.now()
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: message });
    
    // Process the message and get responses from bots
    if (role === 'user' && state.settings.activeBotIds.length > 0) {
      // Set processing state
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      try {
        // Get the active bots and show them as typing
        dispatch({ type: 'SET_TYPING_BOT_IDS', payload: [...state.settings.activeBotIds] });
        
        // If we're using sequential mode, process one bot at a time
        if (state.settings.responseMode === 'sequential') {
          for (const botId of state.settings.activeBotIds) {
            await getBotResponse(botId, content, state.messages);
          }
        } else {
          // For parallel mode, process all bots simultaneously
          await Promise.all(
            state.settings.activeBotIds.map(botId => 
              getBotResponse(botId, content, state.messages)
            )
          );
        }
      } catch (error) {
        console.error('Error getting bot responses:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          error: error instanceof Error ? error.message : 'Failed to get bot responses' 
        });
      } finally {
        // Clear typing indicators and processing state
        dispatch({ type: 'SET_TYPING_BOT_IDS', payload: [] });
        dispatch({ type: 'SET_PROCESSING', payload: false });
      }
    }
  };

  // Helper function to get a response from a specific bot
  const getBotResponse = async (botId: string, userMessage: string, chatHistory: Message[]) => {
    try {
      // Get the bot information from the registry
      const bot = getBot(botId);
      
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }
      
      // Format chat history for the API
      const formattedHistory = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      let botResponse = '';
      let usedMockService = false;
      
      try {
        // First, try to call the main API route
        const response = await fetch('/api/usergroupchatcontext/companion-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companion: {
              id: botId,
              name: bot.name,
              role: 'Assistant',
              description: bot.description,
              personality: {
                openness: 7,
                conscientiousness: 8,
                extraversion: 6,
                agreeableness: 7,
                neuroticism: 3
              },
              domainInterests: {
                technical: 8,
                creative: 6,
                management: 5
              },
              effort: 7
            },
            userMessage,
            chatHistory: formattedHistory
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        botResponse = data.response;
      } catch (apiError) {
        console.warn('Main API error, trying fallback API route:', apiError);
        
        try {
          // Try our local fallback API route
          const fallbackResponse = await fetch('/api/groupchatcontext/companion-response', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              companion: {
                id: botId,
                name: bot.name,
                description: bot.description
              },
              userMessage,
              chatHistory: formattedHistory
            }),
          });
          
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback API error: ${fallbackResponse.status}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          botResponse = fallbackData.response;
          usedMockService = fallbackData.mockService;
        } catch (fallbackError) {
          console.warn('Fallback API failed, using mock service:', fallbackError);
          // Use mock service as final fallback
          botResponse = await getMockBotResponse(bot, userMessage, chatHistory);
          usedMockService = true;
        }
      }
      
      // Add the bot response to the chat
      const botMessage: Message = {
        id: uuidv4(),
        content: botResponse,
        role: 'assistant',
        sender: botId,
        senderName: bot.name,
        timestamp: Date.now(),
        metadata: {
          toolResults: [],
          processing: {
            processingTime: 0,
            usedMockService
          }
        }
      };
      
      // Remove this bot from typing list before adding its message
      dispatch({ 
        type: 'SET_TYPING_BOT_IDS', 
        payload: state.typingBotIds.filter(id => id !== botId) 
      });
      
      // Add the bot message
      dispatch({ type: 'ADD_MESSAGE', payload: botMessage });
      
    } catch (error) {
      console.error(`Error getting response from bot ${botId}:`, error);
      
      // Add an error message from the bot to the chat
      const errorMessage: Message = {
        id: uuidv4(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'assistant',
        sender: botId,
        senderName: getBot(botId)?.name || 'Bot',
        timestamp: Date.now()
      };
      
      // Remove this bot from typing list
      dispatch({ 
        type: 'SET_TYPING_BOT_IDS', 
        payload: state.typingBotIds.filter(id => id !== botId) 
      });
      
      // Add the error message
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
      
      throw error;
    }
  };

  return (
    <GroupChatContext.Provider value={{ state, dispatch, sendMessage }}>
      {children}
    </GroupChatContext.Provider>
  );
}

export function useGroupChat() {
  const context = useContext(GroupChatContext);
  
  if (!context) {
    throw new Error('useGroupChat must be used within a GroupChatProvider');
  }
  
  return context;
} 