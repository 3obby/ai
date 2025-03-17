'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GroupChatAction, GroupChatState } from '../types';
import { defaultGroupChatSettings } from '../data/defaultSettings';
import { BotId } from '../types/bots';

// Context setup
interface GroupChatContextType {
  state: GroupChatState;
  dispatch: React.Dispatch<GroupChatAction>;
}

const GroupChatContext = createContext<GroupChatContextType | undefined>(undefined);

// Initial state
const initialState: GroupChatState = {
  settings: defaultGroupChatSettings,
  messages: [],
  isRecording: false,
  isProcessing: false,
  settingsOpen: false,
  activeSettingsTab: 'general',
  selectedBotId: null,
  typingBotIds: [],
  isLoading: false
};

// Reducer function
function groupChatReducer(state: GroupChatState, action: GroupChatAction): GroupChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'ADD_MESSAGES':
      return {
        ...state,
        messages: [...state.messages, ...action.messages],
      };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.messages,
      };
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
    case 'UPDATE_VOICE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          voiceSettings: {
            ...state.settings.voiceSettings,
            ...action.payload
          }
        }
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      };
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload,
      };
    case 'TOGGLE_SETTINGS':
      return {
        ...state,
        settingsOpen: !state.settingsOpen,
      };
    case 'SET_ACTIVE_SETTINGS_TAB':
      return {
        ...state,
        activeSettingsTab: action.payload,
      };
    case 'SET_SELECTED_BOT':
      return {
        ...state,
        selectedBotId: action.payload,
      };
    case 'SET_TYPING_BOT_IDS':
      return {
        ...state,
        typingBotIds: action.payload,
      };
    case 'RESET_CHAT':
      return {
        ...state,
        messages: [],
      };
    default:
      return state;
  }
}

// Provider component
interface GroupChatProviderProps {
  children: ReactNode;
}

export function GroupChatProvider({ children }: GroupChatProviderProps) {
  const [state, dispatch] = useReducer(groupChatReducer, initialState);

  return (
    <GroupChatContext.Provider value={{ state, dispatch }}>
      {children}
    </GroupChatContext.Provider>
  );
}

// Hook for consuming the context
export function useGroupChatContext() {
  const context = useContext(GroupChatContext);
  if (context === undefined) {
    throw new Error('useGroupChatContext must be used within a GroupChatProvider');
  }
  return context;
} 