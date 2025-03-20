'use client';

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { Bot, BotId, BotVoiceSettings } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { VoiceModeManager } from '../services/voice/VoiceModeManager';

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
  cloneBotInstanceForVoice: (botId: BotId, options?: { realtimeModel?: string; messages?: any[] }) => Promise<Bot | null>;
  cleanupVoiceGhosts: () => void;
  fetchLatestVoiceModel: () => Promise<string>;
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

  // Create a VoiceModeManager instance
  const voiceModeManager = useMemo(() => new VoiceModeManager({
    keepPreprocessingHooks: false,
    keepPostprocessingHooks: false,
    preserveVoiceHistory: true
  }), []);

  /**
   * Creates a clone of a bot optimized for voice interactions
   * 
   * This method is a key part of the text-to-voice transition system, providing:
   * 1. Creation of voice-optimized bot clones with the latest realtime models
   * 2. Inheritance of conversation context from text to voice mode
   * 3. Selective preservation of settings with voice-specific overrides
   * 
   * The optional messages array enables context inheritance, ensuring
   * seamless transitions between text and voice modes.
   * 
   * @param botId - The ID of the original bot to clone
   * @param options - Optional configuration including realtime model and messages for context
   * @returns Promise resolving to the cloned voice bot, or null if cloning fails
   */
  const cloneBotInstanceForVoice = async (
    botId: BotId, 
    options?: { realtimeModel?: string; messages?: any[] }
  ): Promise<Bot | null> => {
    // Find the original bot
    const originalBot = getBot(botId);
    if (!originalBot) {
      console.error(`Cannot clone bot with ID ${botId}: Bot not found`);
      return null;
    }

    try {
      // Fetch the latest realtime model if not provided
      let modelToUse = options?.realtimeModel || 'gpt-4o-realtime-preview-2024-12-17';
      if (!options?.realtimeModel) {
        try {
          // Try to fetch the latest OpenAI realtime model
          const response = await fetch('/api/latest-openai-models');
          if (response.ok) {
            const data = await response.json();
            modelToUse = data.realtimeModel || 'gpt-4o-realtime-preview-2024-12-17';
          }
        } catch (error) {
          console.warn('Failed to fetch latest model versions, using default:', error);
          // Default fallback already set above
        }
      }

      // Create a new bot instance with a unique ID but preserve conversation context
      // Voice bots have specialized settings focused on real-time voice interactions
      const voiceBot: Bot = {
        ...originalBot,
        id: `voice-${originalBot.id}-${uuidv4().substring(0, 8)}`,
        name: `${originalBot.name} (Voice)`,
        model: modelToUse,
        // Preserve essential bot properties
        description: originalBot.description,
        avatar: originalBot.avatar,
        systemPrompt: originalBot.systemPrompt,
        temperature: originalBot.temperature,
        maxTokens: originalBot.maxTokens,
        enabled: true,
        useTools: originalBot.useTools,
        enableReprocessing: false, // Disable reprocessing for voice mode
        // Add voice-specific properties using the first VoiceSettings interface from types.ts
        voiceSettings: {
          voice: originalBot.voiceSettings?.voice || 'alloy',
          speed: originalBot.voiceSettings?.speed || 1.0,
          quality: 'high-quality' as const,
          model: modelToUse
        }
      };

      // Add the cloned bot to the registry
      dispatch({
        type: 'ADD_BOT',
        payload: voiceBot
      });

      // Context inheritance - this is the key part that enables seamless transitions
      // If messages were provided, use VoiceModeManager to create a ghost with conversation context
      if (options?.messages && options.messages.length > 0) {
        // Create a ghost for the bot
        const ghosts = voiceModeManager.createVoiceGhosts([originalBot.id], [originalBot]);
        
        // Inherit conversation context by filtering relevant messages
        voiceModeManager.inheritConversationContext(options.messages);
        
        // Retrieve the ghost's conversation context
        const ghostContext = voiceModeManager.getVoiceGhostConversationContext(originalBot.id);
        
        if (ghostContext) {
          console.log(`Successfully inherited ${ghostContext.length} messages for voice bot ${voiceBot.id}`);
        }

        // Clear the ghosts as we only needed the context inheritance logic
        // The actual voice bot instance is managed separately in the registry
        voiceModeManager.clearVoiceGhosts();
      }

      console.log(`Created voice bot clone from ${originalBot.name} with model ${modelToUse} and voice config:`, voiceBot.voiceSettings);
      return voiceBot;
    } catch (error) {
      console.error('Error cloning bot for voice mode:', error);
      return null;
    }
  };

  /**
   * Cleanly deactivate and remove voice ghosts when transitioning back to text mode
   * This ensures that no orphaned ghost instances remain in the registry
   */
  const cleanupVoiceGhosts = useCallback(() => {
    const ghostBots = state.availableBots.filter(bot => 
      bot.id.startsWith('voice-') || bot.id.startsWith('ghost-')
    );
    
    if (ghostBots.length > 0) {
      console.log(`Cleaning up ${ghostBots.length} voice ghost bots`);
      
      // Mark all ghosts as disabled first
      ghostBots.forEach(ghost => {
        dispatch({
          type: 'UPDATE_BOT',
          payload: { 
            id: ghost.id, 
            updates: { enabled: false }
          }
        });
      });
      
      // After a short delay, remove them from the registry
      setTimeout(() => {
        ghostBots.forEach(ghost => {
          dispatch({
            type: 'REMOVE_BOT',
            payload: ghost.id
          });
        });
      }, 1000);
    }
  }, [state.availableBots, dispatch]);
  
  /**
   * Fetch the latest voice model from the API
   * Provides automatic selection of the best available model for voice interactions
   * 
   * @returns Promise resolving to the model ID string
   */
  const fetchLatestVoiceModel = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/latest-openai-models');
      if (response.ok) {
        const data = await response.json();
        return data.realtimeModel || 'gpt-4o-realtime-preview';
      }
    } catch (error) {
      console.error('Failed to fetch latest voice model:', error);
    }
    
    // Fallback to a default model
    return 'gpt-4o-realtime-preview';
  }, []);

  // Create the context value
  const contextValue = useMemo(() => {
    return { 
      state, 
      dispatch,
      getBot,
      cloneBotInstanceForVoice,
      cleanupVoiceGhosts,
      fetchLatestVoiceModel
    };
  }, [state, cleanupVoiceGhosts, fetchLatestVoiceModel]);

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