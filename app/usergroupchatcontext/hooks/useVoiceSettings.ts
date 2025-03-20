import { useState, useEffect, useCallback } from 'react';
import { useGroupChat } from './useGroupChat';
import { VoiceSettings } from '../types';
import voiceModeManager from '../services/voice/VoiceModeManager';

/**
 * Custom hook that provides a centralized way to access and update voice settings
 * Serves as the single source of truth for all voice-related settings
 * Automatically syncs settings with VoiceModeManager to prevent duplication
 */
export function useVoiceSettings() {
  const { state, updateSettings } = useGroupChat();
  
  // Get our voice settings from the global state or use defaults
  const voiceSettings = state.settings?.voiceSettings || {
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
    modality: 'both'
  };
  
  // Determine if voice is enabled from UI settings
  const isVoiceEnabled = state.settings?.ui?.enableVoice || false;
  
  // Sync settings to VoiceModeManager when they change
  useEffect(() => {
    // Only update the VoiceModeManager with settings that it needs
    voiceModeManager.updateConfig({
      keepPreprocessingHooks: voiceSettings.keepPreprocessingHooks,
      keepPostprocessingHooks: voiceSettings.keepPostprocessingHooks,
      preserveVoiceHistory: voiceSettings.preserveVoiceHistory,
      automaticVoiceSelection: voiceSettings.automaticVoiceSelection,
      defaultVoice: (voiceSettings.defaultVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | undefined)
    });
  }, [
    voiceSettings.keepPreprocessingHooks,
    voiceSettings.keepPostprocessingHooks,
    voiceSettings.preserveVoiceHistory,
    voiceSettings.automaticVoiceSelection,
    voiceSettings.defaultVoice
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
    updateMode: (mode: 'auto' | 'sensitive' | 'manual') => {
      updateVoiceSettings({ vadMode: mode });
    },
    updateThreshold: (threshold: number) => {
      updateVoiceSettings({ vadThreshold: threshold });
    }
  };
  
  return {
    voiceSettings,
    updateVoiceSettings,
    isVoiceEnabled,
    toggleVoiceEnabled,
    vadSettings
  };
} 