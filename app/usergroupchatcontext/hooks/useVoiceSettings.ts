import { useState, useEffect, useCallback } from 'react';
import { useGroupChatContext } from '../context/GroupChatContext';
import voiceActivityService from '../services/livekit/voice-activity-service';
import { VoiceSettings } from '../types';
import { useLiveKitIntegration } from '../context/LiveKitIntegrationProvider';

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
  const liveKitIntegration = useLiveKitIntegration();
  const [isListening, setIsListening] = useState(liveKitIntegration?.isListening || false);
  const [isAutoAdjusting, setIsAutoAdjusting] = useState(false);
  const [currentVadThreshold, setCurrentVadThreshold] = useState(
    state.settings?.voiceSettings?.vadThreshold || 0.3
  );

  // Update local state when LiveKit integration state changes
  useEffect(() => {
    if (liveKitIntegration) {
      setIsListening(liveKitIntegration.isListening);
    }
  }, [liveKitIntegration?.isListening]);

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

  // Start listening using LiveKit integration
  const startListening = useCallback(async () => {
    if (!liveKitIntegration) {
      console.error('LiveKit integration is not available');
      return false;
    }
    
    try {
      console.log('Starting voice listening via hooks...');
      
      // First, make sure we have a valid voice settings configuration
      const currentSettings = state.settings?.voiceSettings;
      if (!currentSettings) {
        console.warn('No voice settings found in state, using defaults');
      }
      
      // Ensure voice activity service is properly configured
      voiceActivityService.updateOptions({
        mode: currentSettings?.vadMode || 'auto',
        threshold: currentSettings?.vadThreshold || 0.3,
        silenceDurationMs: currentSettings?.silenceDurationMs || 1000,
        prefixPaddingMs: currentSettings?.prefixPaddingMs || 500
      });
      
      // Start the multimodal agent's listening service first
      await liveKitIntegration.resumeAudioContext();
      
      // This will call into LiveKitIntegrationProvider's startListening
      await liveKitIntegration.startListening();
      setIsListening(true);
      
      return true;
    } catch (error) {
      console.error('Failed to start listening in useVoiceSettings:', error);
      setIsListening(false);
      return false;
    }
  }, [liveKitIntegration, state.settings?.voiceSettings]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!liveKitIntegration) {
      console.error('LiveKit integration is not available');
      return;
    }
    
    try {
      console.log('Stopping voice listening via hooks...');
      liveKitIntegration.stopListening();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice listening:', error);
    }
  }, [liveKitIntegration]);

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