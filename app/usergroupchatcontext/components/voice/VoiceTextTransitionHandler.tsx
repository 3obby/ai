'use client';

import React, { useEffect, useState } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import voiceModeManager from '../../services/voice/VoiceModeManager';
import eventBus from '../../services/events/EventBus';

interface VoiceTextTransitionHandlerProps {
  onTransitionComplete?: () => void;
}

/**
 * VoiceTextTransitionHandler Component
 * 
 * This component handles the transition from voice mode back to text mode,
 * ensuring that:
 * 1. Conversation history is preserved across transitions
 * 2. Processing hooks are properly re-enabled for text mode
 * 3. Voice ghost instances are properly cleaned up
 * 4. Error recovery is handled for failed transitions
 * 
 * The component listens for voice mode deactivation events and manages
 * the transition process to ensure a seamless user experience.
 */
const VoiceTextTransitionHandler: React.FC<VoiceTextTransitionHandlerProps> = ({
  onTransitionComplete
}) => {
  const { state, dispatch } = useGroupChatContext();
  const { state: botState, cleanupVoiceGhosts } = useBotRegistry();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle voice-to-text transition events
  useEffect(() => {
    const handleVoiceToTextTransition = (data: {
      timestamp: number;
      voiceGhostIds: string[];
    }) => {
      setIsTransitioning(true);
      setError(null);
      
      // Process the transition
      handleTransition(data.voiceGhostIds);
    };
    
    // Listen for voice-to-text transition events from VoiceModeManager
    voiceModeManager.on('transition:voice-to-text', handleVoiceToTextTransition);
    
    // Listen for interrupted sessions
    const handleInterruptedSession = (data: {
      reason: string;
      timestamp: number;
      error?: string;
    }) => {
      console.warn(`Voice session interrupted: ${data.reason}`);
      setError(`Voice session interrupted: ${data.reason}`);
      
      // Handle recovery from interrupted session
      handleInterruptedSessionRecovery();
    };
    
    voiceModeManager.on('session:interrupted', handleInterruptedSession);
    
    // Clean up event listeners
    return () => {
      voiceModeManager.off('transition:voice-to-text', handleVoiceToTextTransition);
      voiceModeManager.off('session:interrupted', handleInterruptedSession);
    };
  }, []);

  /**
   * Main transition handler to ensure a smooth voice-to-text transition
   */
  const handleTransition = async (voiceGhostIds: string[]) => {
    try {
      // 1. Map voice ghost IDs back to their original bot IDs
      const activeBotIds = state.settings.activeBotIds;
      
      // 2. Re-enable processing hooks for all active bots
      voiceModeManager.reEnableProcessingHooks(activeBotIds);
      
      // 3. If any voice ghosts were registered in the bot registry, clean them up
      // using the new cleanupVoiceGhosts method for consistent cleanup
      cleanupVoiceGhosts();
      
      // 4. Update UI to reflect transition completion
      dispatch({ 
        type: 'SET_PROCESSING', 
        payload: false
      });
      
      // 5. Transition complete
      setIsTransitioning(false);
      
      // 6. Notify parent component
      if (onTransitionComplete) {
        onTransitionComplete();
      }
      
      console.log('Voice-to-text transition completed successfully');
    } catch (error) {
      console.error('Error during voice-to-text transition:', error);
      setError('Failed to transition from voice to text mode');
      setIsTransitioning(false);
    }
  };
  
  /**
   * Handle recovery from interrupted voice sessions
   */
  const handleInterruptedSessionRecovery = () => {
    try {
      // Reset UI state
      dispatch({ 
        type: 'SET_PROCESSING', 
        payload: false
      });
      
      // Re-enable processing hooks
      const activeBotIds = state.settings.activeBotIds;
      voiceModeManager.reEnableProcessingHooks(activeBotIds);
      
      // Clean up any voice ghosts that may have been created
      cleanupVoiceGhosts();
      
      // Reset transition state
      setIsTransitioning(false);
      
      console.log('Recovered from interrupted voice session');
    } catch (recoveryError) {
      console.error('Error during interrupted session recovery:', recoveryError);
    }
  };
  
  // This component is mostly logic-focused and renders minimally
  // Only show an error message if something went wrong
  return error ? <div className="voice-error-message">{error}</div> : null;
};

export default VoiceTextTransitionHandler; 