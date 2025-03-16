'use client';

import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { Bot, BotId } from '../types';

// Define the state shape
interface BotRegistryState {
  availableBots: Bot[];
  isLoading: boolean;
  error: string | null;
}

// Define the actions
type BotRegistryAction =
  | { type: 'SET_AVAILABLE_BOTS'; payload: Bot[] }
  | { type: 'ADD_BOT'; payload: Bot }
  | { type: 'REMOVE_BOT'; payload: BotId }
  | { type: 'UPDATE_BOT'; payload: { id: BotId; updates: Partial<Bot> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Create initial state
const initialState: BotRegistryState = {
  availableBots: [],
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
        availableBots: state.availableBots.filter(bot => bot.id !== action.payload)
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
}

const BotRegistryContext = createContext<BotRegistryContextType | undefined>(undefined);

// Create the provider component
interface BotRegistryProviderProps {
  children: React.ReactNode;
  initialBots?: Bot[];
  initialSelectedBots?: BotId[];
}

export function BotRegistryProvider({
  children,
  initialBots = []
}: BotRegistryProviderProps) {
  // Initialize state with any initial bots
  const initializedState = useMemo(() => {
    return {
      ...initialState,
      availableBots: initialBots
    };
  }, [initialBots]);

  const [state, dispatch] = useReducer(botRegistryReducer, initializedState);

  // Helper function to get a bot by ID
  const getBot = (id: BotId) => {
    return state.availableBots.find(bot => bot.id === id);
  };

  // Create the context value
  const contextValue = useMemo(() => {
    return { 
      state, 
      dispatch,
      getBot
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