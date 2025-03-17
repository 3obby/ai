import { useState, useEffect, useCallback } from 'react';
import { useGroupChatContext } from '../context/GroupChatContext';
import voiceActivityService from '../services/livekit/voice-activity-service';
import { VoiceSettings } from '../types';

interface UseVoiceSettingsReturn {
  voiceSettings: VoiceSettings;
  isVoiceEnabled: boolean;
  isListening: boolean;
  isAutoAdjusting: boolean;
  currentVadThreshold: number;
  toggleVoice: () => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  autoAdjustVadSensitivity: () => Promise<number>;
}

export function useVoiceSettings(): UseVoiceSettingsReturn {
  const { state, dispatch } = useGroupChatContext();
  const [isListening, setIsListening] = useState(false);
  const [isAutoAdjusting, setIsAutoAdjusting] = useState(false);
  const [currentVadThreshold, setCurrentVadThreshold] = useState(
    state.settings?.voiceSettings?.vadThreshold || 0.3
  );

  // Get current voice settings from global context
  const voiceSettings = state.settings?.voiceSettings || {
    vadMode: 'auto',
    vadThreshold: 0.3,
    prefixPaddingMs: 500,
    silenceDurationMs: 1000,
    modality: 'both'
  };

  const isVoiceEnabled = voiceSettings.modality !== 'text';

  // Toggle voice on/off
  const toggleVoice = useCallback(() => {
    const newModality = isVoiceEnabled ? 'text' : 'both';
    
    dispatch({
      type: 'UPDATE_VOICE_SETTINGS',
      payload: {
        ...voiceSettings,
        modality: newModality
      }
    });
    
    // If turning off voice, make sure we stop listening
    if (newModality === 'text' && isListening) {
      stopListening();
    }
  }, [isVoiceEnabled, isListening, voiceSettings, dispatch]);

  // Update voice settings
  const updateVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    dispatch({
      type: 'UPDATE_VOICE_SETTINGS',
      payload: {
        ...settings
      }
    });
    
    // Update VAD options if relevant settings changed
    if (
      settings.vadMode !== undefined ||
      settings.vadThreshold !== undefined ||
      settings.silenceDurationMs !== undefined
    ) {
      voiceActivityService.updateOptions({
        mode: settings.vadMode || voiceSettings.vadMode,
        threshold: settings.vadThreshold || voiceSettings.vadThreshold,
        silenceDurationMs: settings.silenceDurationMs || voiceSettings.silenceDurationMs,
        prefixPaddingMs: settings.prefixPaddingMs || voiceSettings.prefixPaddingMs
      });
      
      if (settings.vadThreshold !== undefined) {
        setCurrentVadThreshold(settings.vadThreshold);
      }
    }
  }, [voiceSettings, dispatch]);

  // Start listening (handled by parent components that use this hook)
  const startListening = useCallback(async () => {
    // This is a placeholder - actual implementation would connect to
    // multimodalAgentService or turnTakingService
    setIsListening(true);
    return true;
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    // This is a placeholder - actual implementation would connect to
    // multimodalAgentService or turnTakingService
    setIsListening(false);
  }, []);

  // Auto-adjust VAD sensitivity
  const autoAdjustVadSensitivity = useCallback(async () => {
    try {
      setIsAutoAdjusting(true);
      const newThreshold = await voiceActivityService.autoAdjustVadSensitivity(3000);
      setCurrentVadThreshold(newThreshold);
      
      // Update settings with new threshold
      updateVoiceSettings({
        vadThreshold: newThreshold
      });
      
      return newThreshold;
    } catch (error) {
      console.error('Error auto-adjusting VAD sensitivity:', error);
      return currentVadThreshold;
    } finally {
      setIsAutoAdjusting(false);
    }
  }, [updateVoiceSettings, currentVadThreshold]);

  return {
    voiceSettings,
    isVoiceEnabled,
    isListening,
    isAutoAdjusting,
    currentVadThreshold,
    toggleVoice,
    updateVoiceSettings,
    startListening,
    stopListening,
    autoAdjustVadSensitivity
  };
} 