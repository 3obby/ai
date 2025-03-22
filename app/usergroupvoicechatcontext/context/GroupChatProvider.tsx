'use client';

import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { Bot, BotId } from '../types/bots';
import { Message, createSystemMessage } from '../types/messages';
import { GroupChatSettings, DEFAULT_SETTINGS } from '../types/settings';
import VoiceTransitionEventManager from '../components/voice/VoiceTransitionEventManager';

// Define the state shape
interface GroupChatState {
  settings: GroupChatSettings;
  messages: Message[];
  bots: Bot[];
  isLoading: boolean;
  typingBots: BotId[];
  error: string | null;
  interimTranscript: string | null;
  isRecording: boolean;
  contextHistory: {
    messages: Message[];
    timestamp: Date;
  }[];
}

// Define the actions
type GroupChatAction =
  | { type: 'SET_SETTINGS'; payload: Partial<GroupChatSettings> }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_MESSAGES'; payload: Message[] }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_BOTS'; payload: Bot[] }
  | { type: 'ADD_BOT'; payload: Bot }
  | { type: 'REMOVE_BOT'; payload: BotId }
  | { type: 'UPDATE_BOT'; payload: { id: BotId; updates: Partial<Bot> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TYPING_BOTS'; payload: BotId[] }
  | { type: 'ADD_TYPING_BOT'; payload: BotId }
  | { type: 'REMOVE_TYPING_BOT'; payload: BotId }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INTERIM_TRANSCRIPT'; payload: string | null }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SAVE_CONTEXT_SNAPSHOT' }
  | { type: 'RESET_CHAT' };

// Create initial state
const initialState: GroupChatState = {
  settings: DEFAULT_SETTINGS,
  messages: [],
  bots: [],
  isLoading: false,
  typingBots: [],
  error: null,
  interimTranscript: null,
  isRecording: false,
  contextHistory: []
};

// Create the reducer
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
        messages: [...state.messages, ...action.payload]
      };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload
      };
    case 'SET_BOTS':
      return {
        ...state,
        bots: action.payload
      };
    case 'ADD_BOT':
      if (state.bots.some(bot => bot.id === action.payload.id)) {
        return state; // Bot already exists
      }
      return {
        ...state,
        bots: [...state.bots, action.payload]
      };
    case 'REMOVE_BOT':
      return {
        ...state,
        bots: state.bots.filter(bot => bot.id !== action.payload)
      };
    case 'UPDATE_BOT':
      return {
        ...state,
        bots: state.bots.map(bot => 
          bot.id === action.payload.id 
            ? { ...bot, ...action.payload.updates } 
            : bot
        )
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_TYPING_BOTS':
      return {
        ...state,
        typingBots: action.payload
      };
    case 'ADD_TYPING_BOT':
      if (state.typingBots.includes(action.payload)) {
        return state; // Bot already typing
      }
      return {
        ...state,
        typingBots: [...state.typingBots, action.payload]
      };
    case 'REMOVE_TYPING_BOT':
      return {
        ...state,
        typingBots: state.typingBots.filter(id => id !== action.payload)
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    case 'SET_INTERIM_TRANSCRIPT':
      return {
        ...state,
        interimTranscript: action.payload
      };
    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.payload
      };
    case 'SAVE_CONTEXT_SNAPSHOT':
      return {
        ...state,
        contextHistory: [
          ...state.contextHistory,
          {
            messages: [...state.messages],
            timestamp: new Date()
          }
        ]
      };
    case 'RESET_CHAT':
      return {
        ...state,
        messages: [{
          id: 'new-chat-message',
          content: "New chat started. How can I help you today?",
          sender: 'system',
          senderName: 'System',
          timestamp: new Date(),
          type: 'text'
        }],
        typingBots: [],
        error: null,
        interimTranscript: null,
        isRecording: false
      };
    default:
      return state;
  }
}

// Create the context
interface GroupChatContextType {
  state: GroupChatState;
  dispatch: React.Dispatch<GroupChatAction>;
}

const GroupChatContext = createContext<GroupChatContextType | undefined>(undefined);

// Create the provider component
interface GroupChatProviderProps {
  children: React.ReactNode;
  initialBots?: Bot[];
  initialSettings?: Partial<GroupChatSettings>;
}

export function GroupChatProvider({
  children,
  initialBots = [],
  initialSettings = {}
}: GroupChatProviderProps) {
  // Initialize state with any initial bots but NO welcome message
  const initializedState = useMemo(() => {
    return {
      ...initialState,
      settings: {
        ...initialState.settings,
        ...initialSettings
      },
      bots: initialBots,
      messages: [] // Remove the welcome message here
    };
  }, [initialBots, initialSettings]);

  const [state, dispatch] = useReducer(groupChatReducer, initializedState);

  // Set active bots based on provided bots
  useEffect(() => {
    if (initialBots.length > 0 && state.settings.chat.activeBots.length === 0) {
      dispatch({
        type: 'SET_SETTINGS',
        payload: {
          chat: {
            ...state.settings.chat,
            activeBots: initialBots.map(bot => bot.id),
            botOrder: initialBots.map(bot => bot.id)
          }
        }
      });
    }
  }, [initialBots, state.settings.chat.activeBots.length]);

  // Create the context value
  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state]);

  return (
    <GroupChatContext.Provider value={contextValue}>
      <VoiceTransitionEventManager>
        {children}
      </VoiceTransitionEventManager>
    </GroupChatContext.Provider>
  );
}

// Create the hook for using this context
export function useGroupChatContext() {
  const context = useContext(GroupChatContext);
  if (context === undefined) {
    throw new Error('useGroupChatContext must be used within a GroupChatProvider');
  }
  return context;
}

// Export the context in case someone needs to use it with useContext directly
export { GroupChatContext }; 