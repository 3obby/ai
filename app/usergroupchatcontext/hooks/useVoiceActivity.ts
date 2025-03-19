import { useEffect, useState, useCallback } from 'react';
import { useLiveKit } from '../context/LiveKitProvider';
import { useGroupChatContext } from '../context/GroupChatContext';
import voiceActivityService from '../services/livekit/voice-activity-service';
import { VoiceActivityState } from '../services/livekit/voice-activity-service';

/**
 * Hook for accessing voice activity detection state and controls
 * Provides information about current voice activity status and methods 
 * to control sensitivity and modes
 */
export const useVoiceActivity = () => {
  const [isActive, setIsActive] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [mode, setMode] = useState<'auto' | 'sensitive' | 'manual'>('auto');
  const liveKit = useLiveKit();
  const { state } = useGroupChatContext();
  const settings = state.settings;

  // Initialize sensitivity and mode from settings
  useEffect(() => {
    if (settings?.ui?.enableVoice) {
      // Default to auto mode if voice is enabled
      setMode('auto');
    }
  }, [settings]);

  // Subscribe to voice activity events
  useEffect(() => {
    // Handler for voice activity state updates
    const handleVoiceActivity = (state: VoiceActivityState) => {
      setIsActive(state.isSpeaking);
    };
    
    // Register for voice activity events
    voiceActivityService.onVoiceActivity(handleVoiceActivity);
    
    // Initialize with current state
    const currentState = voiceActivityService.getState();
    setIsActive(currentState.isSpeaking);
    
    // Cleanup on unmount
    return () => {
      voiceActivityService.offVoiceActivity(handleVoiceActivity);
    };
  }, []);

  // Configure sensitivity
  const updateSensitivity = useCallback((newSensitivity: number) => {
    setSensitivity(newSensitivity);
    voiceActivityService.updateOptions({
      threshold: newSensitivity,
    });
  }, []);

  // Configure VAD mode
  const updateMode = useCallback((newMode: 'auto' | 'sensitive' | 'manual') => {
    setMode(newMode);
    voiceActivityService.updateOptions({
      mode: newMode,
      threshold: newMode === 'sensitive' ? 0.2 : 0.3,
    });
  }, []);

  // Manual trigger for voice activity (useful for button press mode)
  const triggerManualActivity = useCallback((active: boolean) => {
    voiceActivityService.setSpeaking(active);
  }, []);

  return {
    isActive,
    sensitivity,
    mode,
    updateSensitivity,
    updateMode,
    triggerManualActivity,
    isVoiceServiceReady: !!liveKit.isConnected
  };
};

export default useVoiceActivity; 