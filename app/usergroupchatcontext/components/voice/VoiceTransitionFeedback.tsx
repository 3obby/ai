'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Mic, MessageSquare, Loader, AlertCircle, Check } from 'lucide-react';
import { VoiceModeState } from '../../services/voice/VoiceModeManager';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useVoiceState } from '../../hooks/useVoiceState';

interface VoiceTransitionFeedbackProps {
  className?: string;
}

/**
 * VoiceTransitionFeedback Component
 * 
 * Provides visual feedback when transitioning between voice and text modes.
 * Shows animated indicators for each state of the transition process.
 */
export function VoiceTransitionFeedback({ className }: VoiceTransitionFeedbackProps) {
  const { voiceSettings } = useVoiceSettings();
  const { currentState } = useVoiceState();
  
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Monitor state changes from useVoiceState to show appropriate feedback
  useEffect(() => {
    // Skip if transition feedback is disabled
    if (voiceSettings.showTransitionFeedback === false) {
      return;
    }
    
    // Show/hide feedback based on state
    if (
      currentState === VoiceModeState.INITIALIZING ||
      currentState === VoiceModeState.TRANSITIONING_TO_VOICE ||
      currentState === VoiceModeState.TRANSITIONING_TO_TEXT
    ) {
      setVisible(true);
      setIsError(false);
      setIsSuccess(false);
      
      // Set appropriate message based on state
      if (currentState === VoiceModeState.INITIALIZING) {
        setMessage('Initializing voice mode...');
      } else if (currentState === VoiceModeState.TRANSITIONING_TO_VOICE) {
        setMessage('Switching to voice mode...');
      } else if (currentState === VoiceModeState.TRANSITIONING_TO_TEXT) {
        setMessage('Returning to text mode...');
      }
      
      // Hide after a delay for UX
      const timer = setTimeout(() => {
        setVisible(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else if (currentState === VoiceModeState.ERROR) {
      setVisible(true);
      setIsError(true);
      setIsSuccess(false);
      setMessage('Error in voice transition');
      
      // Hide after a timeout
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else if (
      currentState === VoiceModeState.ACTIVE || 
      currentState === VoiceModeState.IDLE
    ) {
      // Show a brief success message for completed transitions
      setVisible(true);
      setIsError(false);
      setIsSuccess(true);
      
      if (currentState === VoiceModeState.ACTIVE) {
        setMessage('Voice mode active');
      } else if (currentState === VoiceModeState.IDLE) {
        setMessage('Text mode active');
      }
      
      // Hide after a short delay
      const timer = setTimeout(() => {
        setVisible(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [currentState, voiceSettings.showTransitionFeedback]);
  
  // If not visible, don't render anything
  if (!visible) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50",
        "rounded-full px-4 py-2 shadow-lg",
        "flex items-center space-x-2 transition-all duration-300",
        "animate-fadeIn",
        isError 
          ? "bg-destructive/90 text-destructive-foreground" 
          : isSuccess 
            ? "bg-green-600/90 text-white" 
            : "bg-primary/90 text-primary-foreground",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95",
        className
      )}
    >
      {/* Icon based on current state */}
      {currentState === VoiceModeState.TRANSITIONING_TO_VOICE || 
       currentState === VoiceModeState.INITIALIZING ? (
        <Mic className="h-5 w-5 animate-pulse" />
      ) : currentState === VoiceModeState.TRANSITIONING_TO_TEXT ? (
        <MessageSquare className="h-5 w-5 animate-pulse" />
      ) : currentState === VoiceModeState.ERROR ? (
        <AlertCircle className="h-5 w-5" />
      ) : isSuccess ? (
        <Check className="h-5 w-5" />
      ) : (
        <Loader className="h-5 w-5 animate-spin" />
      )}
      
      {/* Message */}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
} 