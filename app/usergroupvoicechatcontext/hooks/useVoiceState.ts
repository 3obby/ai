import { useState, useEffect, useCallback } from 'react';
import { useGroupChat } from './useGroupChat';
import voiceStateManager from '../services/voice/VoiceStateManager';
import { VoiceModeState } from '../services/voice/VoiceModeManager';
import { useBotRegistry } from '../context/BotRegistryProvider';

/**
 * Custom hook that provides access to the centralized voice state management
 * This hook connects the VoiceStateManager with React components, ensuring
 * consistent state and behavior across the application.
 * 
 * It adds React-specific features like:
 * - State synchronization with React state for render triggering
 * - Integration with other hooks like useGroupChat and useBotRegistry
 * - Automatic cleanup of event listeners
 */
export function useVoiceState() {
  // Get access to other context/state
  const { state } = useGroupChat();
  const { state: botState } = useBotRegistry();
  
  // Local state that mirrors the VoiceStateManager state
  // This ensures React components re-render when state changes
  const [isRecording, setIsRecording] = useState(voiceStateManager.isRecording);
  const [isProcessing, setIsProcessing] = useState(voiceStateManager.isProcessing);
  const [currentState, setCurrentState] = useState(voiceStateManager.currentState);
  const [activeVoiceBotIds, setActiveVoiceBotIds] = useState(voiceStateManager.activeVoiceBotIds);
  const [lastError, setLastError] = useState<Error | null>(voiceStateManager.lastError);
  
  // Sync React state with VoiceStateManager changes
  useEffect(() => {
    const handleStateChange = (data: {
      prevState: VoiceModeState;
      nextState: VoiceModeState;
      isRecording: boolean;
      isProcessing: boolean;
    }) => {
      setCurrentState(data.nextState);
      setIsRecording(data.isRecording);
      setIsProcessing(data.isProcessing);
    };
    
    const handleVoiceBotsUpdate = (botIds: string[]) => {
      setActiveVoiceBotIds(botIds);
    };
    
    const handleError = (error: Error) => {
      setLastError(error);
    };
    
    // Subscribe to VoiceStateManager events
    voiceStateManager.on('state:changed', handleStateChange);
    voiceStateManager.on('voiceBots:updated', handleVoiceBotsUpdate);
    voiceStateManager.on('error', handleError);
    
    // Cleanup event listeners
    return () => {
      voiceStateManager.off('state:changed', handleStateChange);
      voiceStateManager.off('voiceBots:updated', handleVoiceBotsUpdate);
      voiceStateManager.off('error', handleError);
    };
  }, []);
  
  /**
   * Start voice mode with current conversation context
   */
  const startVoiceMode = useCallback(() => {
    const activeBotIds = state.settings.activeBotIds;
    const bots = botState.availableBots.filter(bot => 
      activeBotIds.includes(bot.id)
    );
    
    voiceStateManager.startVoiceMode(activeBotIds, bots, state.messages);
  }, [state.settings.activeBotIds, botState.availableBots, state.messages]);
  
  /**
   * Stop voice mode and return to text
   */
  const stopVoiceMode = useCallback(() => {
    voiceStateManager.stopVoiceMode();
  }, []);
  
  /**
   * Set voice processing state
   */
  const setProcessing = useCallback((processing: boolean) => {
    voiceStateManager.setProcessing(processing);
  }, []);
  
  /**
   * Reset voice mode after an error
   */
  const resetVoiceMode = useCallback(() => {
    voiceStateManager.resetVoiceMode();
    setLastError(null);
  }, []);
  
  /**
   * Toggle voice mode on/off
   */
  const toggleVoiceMode = useCallback(() => {
    if (isRecording) {
      stopVoiceMode();
    } else {
      startVoiceMode();
    }
  }, [isRecording, startVoiceMode, stopVoiceMode]);
  
  return {
    // State
    isRecording,
    isProcessing,
    currentState,
    activeVoiceBotIds,
    lastError,
    
    // Actions
    startVoiceMode,
    stopVoiceMode,
    setProcessing,
    resetVoiceMode,
    toggleVoiceMode
  };
} 