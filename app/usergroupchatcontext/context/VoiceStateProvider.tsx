'use client';

import React, { useReducer, useEffect, useMemo } from 'react';
import { 
  VoiceStateContext, 
  VoiceState, 
  VoiceStateAction, 
  initialVoiceState,
  VoiceStateActionType
} from './VoiceStateContext';
import voiceStateManager from '../services/voice/VoiceStateManager';
import voiceModeManager, { VoiceModeState } from '../services/voice/VoiceModeManager';
import { VoiceGhost } from '../types/voice';

// Voice State Reducer
function voiceStateReducer(state: VoiceState, action: VoiceStateAction): VoiceState {
  switch (action.type) {
    case VoiceStateActionType.SET_RECORDING:
      return {
        ...state,
        isRecording: action.payload,
        lastTransitionTime: Date.now()
      };
    
    case VoiceStateActionType.SET_PROCESSING:
      return {
        ...state,
        isProcessing: action.payload,
        lastTransitionTime: Date.now()
      };
    
    case VoiceStateActionType.SET_VOICE_MODE_STATE:
      return {
        ...state,
        currentVoiceModeState: action.payload,
        // Update related states based on voice mode state
        isRecording: 
          action.payload === VoiceModeState.ACTIVE || 
          action.payload === VoiceModeState.PROCESSING,
        isProcessing: 
          action.payload === VoiceModeState.PROCESSING,
        lastTransitionTime: Date.now()
      };
    
    case VoiceStateActionType.SET_ACTIVE_VOICE_BOT_IDS:
      return {
        ...state,
        activeVoiceBotIds: action.payload
      };
    
    case VoiceStateActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
    
    case VoiceStateActionType.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case VoiceStateActionType.SET_VOICE_SETTINGS:
      return {
        ...state,
        voiceSettings: action.payload
      };
    
    case VoiceStateActionType.UPDATE_VOICE_SETTINGS:
      return {
        ...state,
        voiceSettings: {
          ...state.voiceSettings,
          ...action.payload
        }
      };
    
    case VoiceStateActionType.SET_VOICE_GHOSTS:
      return {
        ...state,
        voiceGhosts: action.payload
      };
    
    case VoiceStateActionType.ADD_VOICE_GHOST:
      // Skip if ghost already exists
      if (state.voiceGhosts.some(ghost => ghost.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        voiceGhosts: [...state.voiceGhosts, action.payload]
      };
    
    case VoiceStateActionType.REMOVE_VOICE_GHOST:
      return {
        ...state,
        voiceGhosts: state.voiceGhosts.filter(ghost => ghost.id !== action.payload)
      };
    
    case VoiceStateActionType.CLEAR_VOICE_GHOSTS:
      return {
        ...state,
        voiceGhosts: []
      };
    
    case VoiceStateActionType.SET_INTERIM_TRANSCRIPT:
      return {
        ...state,
        interimTranscript: action.payload
      };
    
    case VoiceStateActionType.SET_VOICE_LEVEL:
      return {
        ...state,
        voiceLevel: action.payload
      };

    case VoiceStateActionType.SET_BOT_SPEAKING:
      return {
        ...state,
        isBotSpeaking: action.payload.isSpeaking,
        speakingBotId: action.payload.botId
      };

    case VoiceStateActionType.SET_TRANSCRIPTION_IN_PROGRESS:
      return {
        ...state,
        isTranscribing: action.payload
      };
    
    default:
      return state;
  }
}

interface VoiceStateProviderProps {
  children: React.ReactNode;
}

export function VoiceStateProvider({ children }: VoiceStateProviderProps) {
  const [state, dispatch] = useReducer(voiceStateReducer, initialVoiceState);

  // Sync with VoiceStateManager & VoiceModeManager events
  useEffect(() => {
    // Handle state changes from VoiceStateManager
    const handleStateChange = (data: {
      prevState: VoiceModeState;
      nextState: VoiceModeState;
      isRecording: boolean;
      isProcessing: boolean;
    }) => {
      dispatch({
        type: VoiceStateActionType.SET_VOICE_MODE_STATE,
        payload: data.nextState
      });
    };
    
    // Handle voice ghosts updates
    const handleVoiceBotsUpdate = (botIds: string[]) => {
      dispatch({
        type: VoiceStateActionType.SET_ACTIVE_VOICE_BOT_IDS,
        payload: botIds
      });
    };
    
    // Handle errors
    const handleError = (error: Error) => {
      dispatch({
        type: VoiceStateActionType.SET_ERROR,
        payload: error
      });
    };

    // Handle ghost creation from VoiceModeManager
    const handleGhostsCreated = (ghosts: VoiceGhost[]) => {
      dispatch({
        type: VoiceStateActionType.SET_VOICE_GHOSTS,
        payload: ghosts
      });
    };

    // Handle ghost cleanup from VoiceModeManager
    const handleGhostsCleared = () => {
      dispatch({
        type: VoiceStateActionType.CLEAR_VOICE_GHOSTS
      });
    };
    
    // Subscribe to VoiceStateManager events
    voiceStateManager.on('state:changed', handleStateChange);
    voiceStateManager.on('voiceBots:updated', handleVoiceBotsUpdate);
    voiceStateManager.on('error', handleError);
    
    // Subscribe to VoiceModeManager events
    voiceModeManager.on('ghosts:created', handleGhostsCreated);
    voiceModeManager.on('ghosts:cleared', handleGhostsCleared);
    
    // Initialize with current state if it exists
    if (voiceModeManager.getState() !== VoiceModeState.IDLE) {
      dispatch({
        type: VoiceStateActionType.SET_VOICE_MODE_STATE,
        payload: voiceModeManager.getState()
      });
    }
    
    // Cleanup event listeners
    return () => {
      voiceStateManager.off('state:changed', handleStateChange);
      voiceStateManager.off('voiceBots:updated', handleVoiceBotsUpdate);
      voiceStateManager.off('error', handleError);
      voiceModeManager.off('ghosts:created', handleGhostsCreated);
      voiceModeManager.off('ghosts:cleared', handleGhostsCleared);
    };
  }, []);
  
  // Sync voice settings with VoiceModeManager config
  useEffect(() => {
    const syncVoiceSettings = () => {
      const config = voiceModeManager.getConfig();
      dispatch({
        type: VoiceStateActionType.UPDATE_VOICE_SETTINGS,
        payload: {
          keepPreprocessingHooks: config.keepPreprocessingHooks,
          keepPostprocessingHooks: config.keepPostprocessingHooks,
          preserveVoiceHistory: config.preserveVoiceHistory,
          automaticVoiceSelection: config.automaticVoiceSelection,
          defaultVoice: config.defaultVoice
        }
      });
    };
    
    // Initial sync
    syncVoiceSettings();
    
    // Subscribe to config updates
    voiceModeManager.on('config:updated', syncVoiceSettings);
    
    return () => {
      voiceModeManager.off('config:updated', syncVoiceSettings);
    };
  }, []);
  
  // Forward voice settings changes to VoiceModeManager
  useEffect(() => {
    voiceModeManager.updateConfig({
      keepPreprocessingHooks: state.voiceSettings.keepPreprocessingHooks,
      keepPostprocessingHooks: state.voiceSettings.keepPostprocessingHooks,
      preserveVoiceHistory: state.voiceSettings.preserveVoiceHistory,
      automaticVoiceSelection: state.voiceSettings.automaticVoiceSelection,
      defaultVoice: state.voiceSettings.defaultVoice
    });
  }, [
    state.voiceSettings.keepPreprocessingHooks,
    state.voiceSettings.keepPostprocessingHooks,
    state.voiceSettings.preserveVoiceHistory,
    state.voiceSettings.automaticVoiceSelection,
    state.voiceSettings.defaultVoice
  ]);

  // Create the context value
  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state]);

  return (
    <VoiceStateContext.Provider value={contextValue}>
      {children}
    </VoiceStateContext.Provider>
  );
} 