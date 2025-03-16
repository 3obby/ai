'use client';

import React, { createContext, useContext, useReducer, useMemo, useEffect } from 'react';
import { Bot, BotId, DEFAULT_BOT_PARAMETERS } from '../types/bots';
import { useGroupChatContext } from './GroupChatProvider';

// Define the state shape
interface BotRegistryState {
  availableBots: Bot[];
  selectedBots: BotId[];
  isLoading: boolean;
  error: string | null;
}

// Define the actions
type BotRegistryAction =
  | { type: 'SET_AVAILABLE_BOTS'; payload: Bot[] }
  | { type: 'ADD_BOT'; payload: Bot }
  | { type: 'REMOVE_BOT'; payload: BotId }
  | { type: 'UPDATE_BOT'; payload: { id: BotId; updates: Partial<Bot> } }
  | { type: 'SELECT_BOT'; payload: BotId }
  | { type: 'DESELECT_BOT'; payload: BotId }
  | { type: 'SET_SELECTED_BOTS'; payload: BotId[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Create initial state
const initialState: BotRegistryState = {
  availableBots: [],
  selectedBots: [],
  isLoading: false,
  error: null
};

// Create the reducer
function botRegistryReducer(state: BotRegistryState, action: BotRegistryAction): BotRegistryState {
  switch (action.type) {
    case 'SET_AVAILABLE_BOTS':
      return {
        ...state,
        availableBots: action.payload
      };
    case 'ADD_BOT':
      if (state.availableBots.some(bot => bot.id === action.payload.id)) {
        return state; // Bot already exists
      }
      return {
        ...state,
        availableBots: [...state.availableBots, action.payload]
      };
    case 'REMOVE_BOT':
      return {
        ...state,
        availableBots: state.availableBots.filter(bot => bot.id !== action.payload),
        selectedBots: state.selectedBots.filter(id => id !== action.payload)
      };
    case 'UPDATE_BOT':
      return {
        ...state,
        availableBots: state.availableBots.map(bot => 
          bot.id === action.payload.id 
            ? { ...bot, ...action.payload.updates } 
            : bot
        )
      };
    case 'SELECT_BOT':
      if (state.selectedBots.includes(action.payload)) {
        return state; // Bot already selected
      }
      return {
        ...state,
        selectedBots: [...state.selectedBots, action.payload]
      };
    case 'DESELECT_BOT':
      return {
        ...state,
        selectedBots: state.selectedBots.filter(id => id !== action.payload)
      };
    case 'SET_SELECTED_BOTS':
      return {
        ...state,
        selectedBots: action.payload
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    default:
      return state;
  }
}

// Create the context
interface BotRegistryContextType {
  state: BotRegistryState;
  dispatch: React.Dispatch<BotRegistryAction>;
  getBot: (id: BotId) => Bot | undefined;
  getSelectedBots: () => Bot[];
  registerBot: (bot: Bot) => void;
  unregisterBot: (id: BotId) => void;
  selectBot: (id: BotId) => void;
  deselectBot: (id: BotId) => void;
  updateBot: (id: BotId, updates: Partial<Bot>) => void;
}

const BotRegistryContext = createContext<BotRegistryContextType | undefined>(undefined);

// Create the provider component
interface BotRegistryProviderProps {
  children: React.ReactNode;
  initialBots?: Bot[];
}

export function BotRegistryProvider({
  children,
  initialBots = []
}: BotRegistryProviderProps) {
  const { state: groupChatState, dispatch: groupChatDispatch } = useGroupChatContext();
  
  // Initialize state with any initial bots
  const initializedState = useMemo(() => {
    return {
      ...initialState,
      availableBots: initialBots,
      selectedBots: groupChatState.settings.chat.activeBots
    };
  }, [initialBots, groupChatState.settings.chat.activeBots]);

  const [state, dispatch] = useReducer(botRegistryReducer, initializedState);

  // Sync selected bots with the GroupChatContext
  useEffect(() => {
    if (state.selectedBots.length > 0) {
      groupChatDispatch({
        type: 'SET_SETTINGS',
        payload: {
          chat: {
            ...groupChatState.settings.chat,
            activeBots: state.selectedBots
          }
        }
      });
    }
  }, [state.selectedBots, groupChatDispatch, groupChatState.settings.chat]);

  // Sync available bots with the GroupChatContext
  useEffect(() => {
    groupChatDispatch({
      type: 'SET_BOTS',
      payload: state.availableBots
    });
  }, [state.availableBots, groupChatDispatch]);

  // Helper functions
  const getBot = (id: BotId) => {
    return state.availableBots.find(bot => bot.id === id);
  };

  const getSelectedBots = () => {
    return state.availableBots.filter(bot => state.selectedBots.includes(bot.id));
  };

  const registerBot = (bot: Bot) => {
    // Ensure the bot has all required fields
    const completeBot: Bot = {
      ...bot,
      parameters: {
        ...DEFAULT_BOT_PARAMETERS,
        ...bot.parameters
      },
      tools: bot.tools || []
    };
    
    dispatch({ type: 'ADD_BOT', payload: completeBot });
    groupChatDispatch({ type: 'ADD_BOT', payload: completeBot });
  };

  const unregisterBot = (id: BotId) => {
    dispatch({ type: 'REMOVE_BOT', payload: id });
  };

  const selectBot = (id: BotId) => {
    dispatch({ type: 'SELECT_BOT', payload: id });
  };

  const deselectBot = (id: BotId) => {
    dispatch({ type: 'DESELECT_BOT', payload: id });
  };

  const updateBot = (id: BotId, updates: Partial<Bot>) => {
    dispatch({ type: 'UPDATE_BOT', payload: { id, updates } });
    groupChatDispatch({ 
      type: 'UPDATE_BOT', 
      payload: { id, updates } 
    });
  };

  // Create the context value
  const contextValue = useMemo(() => {
    return { 
      state, 
      dispatch,
      getBot,
      getSelectedBots,
      registerBot,
      unregisterBot,
      selectBot,
      deselectBot,
      updateBot
    };
  }, [state]);

  return (
    <BotRegistryContext.Provider value={contextValue}>
      {children}
    </BotRegistryContext.Provider>
  );
}

// Create the hook for using this context
export function useBotRegistry() {
  const context = useContext(BotRegistryContext);
  if (context === undefined) {
    throw new Error('useBotRegistry must be used within a BotRegistryProvider');
  }
  return context;
}

// Export the context in case someone needs to use it with useContext directly
export { BotRegistryContext }; 