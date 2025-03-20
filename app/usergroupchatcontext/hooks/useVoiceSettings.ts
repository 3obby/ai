import { useState, useEffect, useCallback } from 'react';
import { useGroupChat } from './useGroupChat';
import { VoiceSettings, VadMode, VoiceOption, AudioQuality } from '../types/voice';
import voiceModeManager from '../services/voice/VoiceModeManager';

/**
 * Custom hook that provides a centralized way to access and update voice settings
 * Serves as the single source of truth for all voice-related settings
 * Automatically syncs settings with VoiceModeManager to prevent duplication
 */
export function useVoiceSettings() {
  const { state, updateSettings } = useGroupChat();
  
  // Get our voice settings from the global state or use defaults
  const defaultSettings: VoiceSettings = {
    vadMode: 'auto',
    vadThreshold: 0.5,
    prefixPaddingMs: 500,
    silenceDurationMs: 1000,
    defaultVoice: 'alloy',
    defaultVoiceModel: 'gpt-4o-realtime-preview',
    speed: 1.0,
    showTransitionFeedback: true,
    keepPreprocessingHooks: false,
    keepPostprocessingHooks: false,
    preserveVoiceHistory: true,
    automaticVoiceSelection: true,
    modality: 'both',
    quality: 'standard'
  };
  
  // Combine defaults with any settings from state
  const voiceSettings: VoiceSettings = {
    ...defaultSettings,
    ...(state.settings?.voiceSettings || {})
  };
  
  // Determine if voice is enabled from UI settings
  const isVoiceEnabled = state.settings?.ui?.enableVoice || false;
  
  // Sync settings to VoiceModeManager when they change
  useEffect(() => {
    // Only update the VoiceModeManager with settings that it needs
    voiceModeManager.updateConfig({
      // Voice processing settings
      keepPreprocessingHooks: voiceSettings.keepPreprocessingHooks,
      keepPostprocessingHooks: voiceSettings.keepPostprocessingHooks,
      preserveVoiceHistory: voiceSettings.preserveVoiceHistory,
      automaticVoiceSelection: voiceSettings.automaticVoiceSelection,
      
      // Voice activity detection
      vadMode: voiceSettings.vadMode,
      vadThreshold: voiceSettings.vadThreshold,
      prefixPaddingMs: voiceSettings.prefixPaddingMs,
      silenceDurationMs: voiceSettings.silenceDurationMs,
      
      // Voice options
      defaultVoice: voiceSettings.defaultVoice,
      defaultVoiceModel: voiceSettings.defaultVoiceModel,
      speed: voiceSettings.speed,
      quality: voiceSettings.quality
    });
  }, [
    // Voice processing settings
    voiceSettings.keepPreprocessingHooks,
    voiceSettings.keepPostprocessingHooks,
    voiceSettings.preserveVoiceHistory,
    voiceSettings.automaticVoiceSelection,
    
    // Voice activity detection
    voiceSettings.vadMode,
    voiceSettings.vadThreshold,
    voiceSettings.prefixPaddingMs,
    voiceSettings.silenceDurationMs,
    
    // Voice options
    voiceSettings.defaultVoice,
    voiceSettings.defaultVoiceModel,
    voiceSettings.speed,
    voiceSettings.quality
  ]);

  /**
   * Update voice settings in the global state and synchronize with VoiceModeManager
   * This ensures a single source of truth for all voice-related settings
   */
  const updateVoiceSettings = useCallback((updates: Partial<VoiceSettings>) => {
    // Update in the global state
    updateSettings({
      voiceSettings: {
        ...voiceSettings,
        ...updates
      }
    });
  }, [voiceSettings, updateSettings]);
  
  /**
   * Toggle voice mode enabled/disabled
   * This is separated from other settings for convenience
   */
  const toggleVoiceEnabled = useCallback(() => {
    updateSettings({
      ui: {
        ...state.settings.ui,
        enableVoice: !isVoiceEnabled
      }
    });
  }, [isVoiceEnabled, state.settings.ui, updateSettings]);
  
  /**
   * Direct access to VAD settings for convenience
   * These are frequently used values extracted to reduce props drilling
   */
  const vadSettings = {
    mode: voiceSettings.vadMode,
    threshold: voiceSettings.vadThreshold || 0.5,
    updateMode: (mode: VadMode) => {
      updateVoiceSettings({ vadMode: mode });
    },
    updateThreshold: (threshold: number) => {
      updateVoiceSettings({ vadThreshold: threshold });
    }
  };
  
  /**
   * Fetch the latest voice model from OpenAI
   * Will be removed when we implement the API endpoint
   */
  const fetchLatestVoiceModel = useCallback(async () => {
    try {
      // This would normally fetch from an API
      // For now we just simulate a delay and return a hardcoded value
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'gpt-4o-realtime-preview-2023-08-01';
    } catch (error) {
      console.error('Error fetching latest voice model:', error);
      return voiceSettings.defaultVoiceModel;
    }
  }, [voiceSettings.defaultVoiceModel]);
  
  return {
    voiceSettings,
    updateVoiceSettings,
    isVoiceEnabled,
    toggleVoiceEnabled,
    vadSettings,
    fetchLatestVoiceModel
  };
} 