'use client';

import { useContext, useCallback } from 'react';
import { VoiceStateContext, VoiceStateActionType } from '../context/VoiceStateContext';
import voiceStateManager from '../services/voice/VoiceStateManager';
import voiceModeManager, { VoiceModeState, VoiceModeTransition } from '../services/voice/VoiceModeManager';
import { Bot } from '../types';
import { VoiceSettings } from '../types/voice';

/**
 * Custom hook for accessing and manipulating the centralized voice state
 * 
 * This hook provides:
 * 1. Access to the central voice state
 * 2. Selector functions to get specific parts of the state
 * 3. Action dispatchers for common voice-related operations
 * 4. Integration with the VoiceModeManager for voice mode transitions
 */
export function useVoiceStateStore() {
  const context = useContext(VoiceStateContext);
  
  if (context === undefined) {
    throw new Error('useVoiceStateStore must be used within a VoiceStateProvider');
  }
  
  const { state, dispatch } = context;
  
  // State selectors (to avoid prop drilling)
  const isRecording = state.isRecording;
  const isProcessing = state.isProcessing;
  const isBotSpeaking = state.isBotSpeaking;
  const currentVoiceModeState = state.currentVoiceModeState;
  const activeVoiceBotIds = state.activeVoiceBotIds;
  const voiceGhosts = state.voiceGhosts;
  const interimTranscript = state.interimTranscript;
  const voiceLevel = state.voiceLevel;
  const isTranscribing = state.isTranscribing;
  const speakingBotId = state.speakingBotId;
  const lastTransitionTime = state.lastTransitionTime;
  const error = state.error;
  const voiceSettings = state.voiceSettings;
  
  // Action dispatchers
  
  /**
   * Start voice mode with current conversation context
   */
  const startVoiceMode = useCallback((activeBotIds: string[], bots: Bot[], messages: any[] = []) => {
    voiceStateManager.startVoiceMode(activeBotIds, bots, messages);
  }, []);
  
  /**
   * Stop voice mode and return to text
   */
  const stopVoiceMode = useCallback(() => {
    voiceStateManager.stopVoiceMode();
  }, []);
  
  /**
   * Toggle voice mode on/off
   */
  const toggleVoiceMode = useCallback((activeBotIds: string[], bots: Bot[], messages: any[] = []) => {
    if (isRecording) {
      stopVoiceMode();
    } else {
      startVoiceMode(activeBotIds, bots, messages);
    }
  }, [isRecording, startVoiceMode, stopVoiceMode]);
  
  /**
   * Set voice processing state
   */
  const setProcessing = useCallback((processing: boolean) => {
    dispatch({
      type: VoiceStateActionType.SET_PROCESSING,
      payload: processing
    });
    voiceStateManager.setProcessing(processing);
  }, [dispatch]);

  /**
   * Set the currently speaking bot
   */
  const setBotSpeaking = useCallback((isSpeaking: boolean, botId: string | null = null) => {
    dispatch({
      type: VoiceStateActionType.SET_BOT_SPEAKING,
      payload: { isSpeaking, botId }
    });
  }, [dispatch]);
  
  /**
   * Set interim transcript
   */
  const setInterimTranscript = useCallback((transcript: string | null) => {
    dispatch({
      type: VoiceStateActionType.SET_INTERIM_TRANSCRIPT,
      payload: transcript
    });
  }, [dispatch]);
  
  /**
   * Set voice level (for visualizations)
   */
  const setVoiceLevel = useCallback((level: number) => {
    dispatch({
      type: VoiceStateActionType.SET_VOICE_LEVEL,
      payload: level
    });
  }, [dispatch]);
  
  /**
   * Set transcription in progress status
   */
  const setTranscribing = useCallback((isTranscribing: boolean) => {
    dispatch({
      type: VoiceStateActionType.SET_TRANSCRIPTION_IN_PROGRESS,
      payload: isTranscribing
    });
  }, [dispatch]);
  
  /**
   * Reset voice mode after an error
   */
  const resetVoiceMode = useCallback(() => {
    voiceStateManager.resetVoiceMode();
    dispatch({
      type: VoiceStateActionType.CLEAR_ERROR
    });
  }, [dispatch]);
  
  /**
   * Update voice settings
   */
  const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    dispatch({
      type: VoiceStateActionType.UPDATE_VOICE_SETTINGS,
      payload: settings
    });
  }, [dispatch]);
  
  /**
   * Transition directly to a specific voice mode state
   * (use with caution, prefer startVoiceMode/stopVoiceMode for normal operations)
   */
  const transitionToState = useCallback((transition: VoiceModeTransition, data?: any) => {
    return voiceModeManager.transition(transition, data);
  }, []);
  
  /**
   * Check if voice mode is in one of the active states
   */
  const isVoiceModeActive = useCallback(() => {
    return [
      VoiceModeState.ACTIVE,
      VoiceModeState.PROCESSING,
      VoiceModeState.INITIALIZING
    ].includes(currentVoiceModeState);
  }, [currentVoiceModeState]);

  /**
   * Check if voice mode is in a transitioning state
   */
  const isVoiceModeTransitioning = useCallback(() => {
    return [
      VoiceModeState.TRANSITIONING_TO_TEXT,
      VoiceModeState.TRANSITIONING_TO_VOICE,
      VoiceModeState.INITIALIZING
    ].includes(currentVoiceModeState);
  }, [currentVoiceModeState]);

  /**
   * Get a voice ghost by its original bot ID
   */
  const getVoiceGhost = useCallback((originalBotId: string) => {
    return voiceGhosts.find(ghost => ghost.originalBotId === originalBotId);
  }, [voiceGhosts]);
  
  return {
    // State selectors
    isRecording,
    isProcessing,
    isBotSpeaking,
    currentVoiceModeState,
    activeVoiceBotIds,
    voiceGhosts,
    interimTranscript,
    voiceLevel,
    isTranscribing,
    speakingBotId,
    lastTransitionTime,
    error,
    voiceSettings,
    
    // Computed values
    isVoiceModeActive: isVoiceModeActive(),
    isVoiceModeTransitioning: isVoiceModeTransitioning(),
    
    // Action dispatchers
    startVoiceMode,
    stopVoiceMode,
    toggleVoiceMode,
    setProcessing,
    setBotSpeaking,
    setInterimTranscript,
    setVoiceLevel,
    setTranscribing,
    resetVoiceMode,
    updateVoiceSettings,
    transitionToState,
    getVoiceGhost
  };
} 