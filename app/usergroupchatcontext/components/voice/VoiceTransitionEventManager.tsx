'use client';

import React, { useEffect, useRef } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { useVoiceState } from '../../hooks/useVoiceState';
import voiceModeManager, { VoiceModeState, VoiceModeTransition } from '../../services/voice/VoiceModeManager';
import eventBus from '../../services/events/EventBus';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';

interface VoiceTransitionEventManagerProps {
  children?: React.ReactNode;
}

/**
 * VoiceTransitionEventManager Component
 * 
 * A component that manages voice mode transition events to ensure seamless
 * transitions between voice and text modes. It listens to state changes from
 * VoiceModeManager and handles various transition events to provide a smooth user experience.
 * 
 * Key features:
 * 1. Listens for voice mode transitions and state changes
 * 2. Handles cleanup tasks when transitioning back to text mode
 * 3. Logs important transition events and metrics
 * 4. Manages edge cases during transitions
 * 5. Coordinates between VoiceModeManager and voice ghost lifecycle
 */
const VoiceTransitionEventManager: React.FC<VoiceTransitionEventManagerProps> = ({ children }) => {
  const { state, dispatch } = useGroupChatContext();
  const { state: botState, cleanupVoiceGhosts } = useBotRegistry();
  const { currentState, isRecording } = useVoiceState();
  const { voiceSettings } = useVoiceSettings();
  
  // Track previous state to detect transitions
  const prevStateRef = useRef<VoiceModeState>(VoiceModeState.IDLE);
  
  // Track transition metrics for performance monitoring
  const transitionStartTimeRef = useRef<number>(0);
  
  // Advanced event listeners for voice mode transitions
  useEffect(() => {
    // Track voice mode state changes
    const handleVoiceModeStateChange = ({ prevState, nextState, data }: { 
      prevState: VoiceModeState, 
      nextState: VoiceModeState, 
      data?: any 
    }) => {
      console.log(`Voice mode state changed: ${prevState} -> ${nextState}`);
      
      // Text-to-Voice transition started
      if (nextState === VoiceModeState.TRANSITIONING_TO_VOICE && prevState === VoiceModeState.IDLE) {
        transitionStartTimeRef.current = Date.now();
        eventBus.emit('voicemode:changed', { 
          active: true, 
          timestamp: Date.now(),
          previousState: prevState,
          currentState: nextState
        });
      }
      
      // Voice-to-Text transition started
      if (nextState === VoiceModeState.TRANSITIONING_TO_TEXT) {
        transitionStartTimeRef.current = Date.now();
        eventBus.emit('voicemode:changed', { 
          active: false, 
          timestamp: Date.now(),
          previousState: prevState,
          currentState: nextState
        });
      }
      
      // Voice-to-Text transition completed
      if (nextState === VoiceModeState.IDLE && prevState === VoiceModeState.TRANSITIONING_TO_TEXT) {
        const duration = Date.now() - transitionStartTimeRef.current;
        
        // Log the transition completion
        console.log(`Voice-to-text transition completed in ${duration}ms`);
        
        // Cleanup any remaining voice ghosts
        cleanupVoiceGhosts();
        
        // Ensure processing UI state is reset
        dispatch({ type: 'SET_PROCESSING', payload: false });
      }
      
      // Text-to-Voice transition completed
      if (nextState === VoiceModeState.ACTIVE && prevState === VoiceModeState.TRANSITIONING_TO_VOICE) {
        const duration = Date.now() - transitionStartTimeRef.current;
        
        // Log the transition completion
        console.log(`Text-to-voice transition completed in ${duration}ms`);
      }
      
      // Error handling
      if (nextState === VoiceModeState.ERROR) {
        const error = data?.error || new Error('Unknown voice transition error');
        eventBus.emit('voicemode:error', { 
          error: error,
          context: `Transition from ${prevState}`
        });
        
        // Ensure we clean up properly on error
        cleanupVoiceGhosts();
        dispatch({ type: 'SET_PROCESSING', payload: false });
      }
      
      // Update previous state ref
      prevStateRef.current = nextState;
    };
    
    // Listen for voice ghost creation events
    const handleVoiceGhostsCreated = (ghosts: any[]) => {
      console.log(`Voice ghosts created: ${ghosts.length} ghosts`);
      
      // Notify about each ghost being created
      ghosts.forEach(ghost => {
        eventBus.emit('bot:created', { 
          id: ghost.id, 
          isGhost: true 
        });
      });
    };
    
    // Listen for voice ghost cleanup events
    const handleVoiceGhostsCleared = () => {
      console.log('Voice ghosts cleared');
      
      // We don't have the IDs here, but we could log this if needed
    };
    
    // Listen for context inheritance events
    const handleContextInherited = (ghosts: any[]) => {
      console.log(`Context inherited for ${ghosts.length} voice ghosts`);
      
      // Update bot states with context information
      ghosts.forEach(ghost => {
        eventBus.emit('bot:updated', { 
          id: ghost.id, 
          changes: { 
            hasContext: true,
            contextLength: ghost.conversationContext?.length || 0
          }
        });
      });
    };
    
    // Register all event listeners
    voiceModeManager.on('state:changed', handleVoiceModeStateChange);
    voiceModeManager.on('ghosts:created', handleVoiceGhostsCreated);
    voiceModeManager.on('ghosts:cleared', handleVoiceGhostsCleared);
    voiceModeManager.on('context:inherited', handleContextInherited);
    
    // Clean up event listeners on unmount
    return () => {
      voiceModeManager.off('state:changed', handleVoiceModeStateChange);
      voiceModeManager.off('ghosts:created', handleVoiceGhostsCreated);
      voiceModeManager.off('ghosts:cleared', handleVoiceGhostsCleared);
      voiceModeManager.off('context:inherited', handleContextInherited);
    };
  }, [dispatch, cleanupVoiceGhosts]);
  
  // Handle edge cases during state changes
  useEffect(() => {
    if (currentState === VoiceModeState.TRANSITIONING_TO_TEXT) {
      // Ensure transitions don't get stuck
      const timeoutId = setTimeout(() => {
        if (voiceModeManager.getState() === VoiceModeState.TRANSITIONING_TO_TEXT) {
          console.warn('Voice-to-text transition timed out, forcing cleanup');
          cleanupVoiceGhosts();
          voiceModeManager.transition(VoiceModeTransition.RESET);
          dispatch({ type: 'SET_PROCESSING', payload: false });
        }
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentState, dispatch, cleanupVoiceGhosts]);
  
  // This component doesn't render anything directly - it just manages events
  return <>{children}</>;
};

export default VoiceTransitionEventManager; 