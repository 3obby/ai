'use client';

import React, { useEffect, useState } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { useVoiceState } from '../../hooks/useVoiceState';
import { VoiceModeState } from '../../services/voice/VoiceModeManager';
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
 * The component uses the centralized useVoiceState hook to monitor state changes
 * and manage the transition process for a seamless user experience.
 */
const VoiceTextTransitionHandler: React.FC<VoiceTextTransitionHandlerProps> = ({
  onTransitionComplete
}) => {
  const { state, dispatch } = useGroupChatContext();
  const { state: botState, cleanupVoiceGhosts } = useBotRegistry();
  const { currentState, isRecording, lastError } = useVoiceState();
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monitor voice state changes to detect transitions
  useEffect(() => {
    // Detect transition to text mode
    if (currentState === VoiceModeState.TRANSITIONING_TO_TEXT && !isTransitioning) {
      setIsTransitioning(true);
      setError(null);
      
      // Process the transition
      handleTransition();
    }
    
    // Detect error state
    if (currentState === VoiceModeState.ERROR && lastError) {
      setError(lastError.message || 'Error during voice transition');
      
      // Handle recovery from interrupted session
      handleInterruptedSessionRecovery();
    }
    
    // Detect completion of transition
    if (currentState === VoiceModeState.IDLE && isTransitioning) {
      setIsTransitioning(false);
      
      // Notify parent component of completion
      if (onTransitionComplete) {
        onTransitionComplete();
      }
    }
  }, [currentState, isTransitioning, lastError, onTransitionComplete]);

  /**
   * Main transition handler to ensure a smooth voice-to-text transition
   */
  const handleTransition = async () => {
    try {
      // Clean up any voice ghosts
      cleanupVoiceGhosts();
      
      // Update UI to reflect transition completion
      dispatch({ 
        type: 'SET_PROCESSING', 
        payload: false
      });
      
      console.log('Voice-to-text transition completed successfully');
    } catch (error) {
      console.error('Error during voice-to-text transition:', error);
      setError('Failed to transition from voice to text mode');
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