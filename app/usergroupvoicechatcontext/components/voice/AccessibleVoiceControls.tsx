'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { Mic, MicOff, Volume2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import voiceModeManager, { VoiceModeState } from '../../services/voice/VoiceModeManager';
import eventBus from '../../services/events/EventBus';

interface AccessibleVoiceControlsProps {
  className?: string;
  announcementsEnabled?: boolean;
}

/**
 * AccessibleVoiceControls Component
 * 
 * Enhances voice controls with accessibility features:
 * - Screen reader announcements for voice state changes
 * - Keyboard navigation and shortcuts for voice controls
 * - High contrast visual indicators
 * - Status messages with ARIA live regions
 * - Focus management for improved screen reader experience
 */
export function AccessibleVoiceControls({
  className,
  announcementsEnabled = true
}: AccessibleVoiceControlsProps) {
  const {
    isVoiceEnabled,
    isListening,
    startListening,
    stopListening
  } = useVoiceSettings();
  
  const [voiceState, setVoiceState] = useState<VoiceModeState>(voiceModeManager.getState());
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Voice mode inactive');
  const [showHelp, setShowHelp] = useState(false);
  
  const controlRef = useRef<HTMLButtonElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  
  // Screen reader announcements
  const announce = (message: string, assertive = false) => {
    if (!announcementsEnabled) return;
    
    if (announceRef.current) {
      announceRef.current.textContent = message;
      
      // Clear the announcement after it's been read to ensure future identical
      // announcements will still be spoken
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  };
  
  // Update voice state and announce changes
  useEffect(() => {
    const handleVoiceStateChange = ({ prevState, nextState }: {
      prevState: VoiceModeState,
      nextState: VoiceModeState
    }) => {
      setVoiceState(nextState);
      
      // Generate appropriate status messages
      let message = '';
      let isAssertive = false;
      
      switch (nextState) {
        case VoiceModeState.INITIALIZING:
          message = 'Initializing voice mode, please wait...';
          break;
        case VoiceModeState.ACTIVE:
          message = 'Voice mode active. You can speak now.';
          isAssertive = true;
          break;
        case VoiceModeState.PROCESSING:
          message = 'Processing your voice input...';
          break;
        case VoiceModeState.ERROR:
          const error = voiceModeManager.getError();
          message = `Voice mode error: ${error?.message || 'Unknown error'}`;
          isAssertive = true;
          setErrorMessage(error?.message || 'An error occurred with voice mode');
          break;
        case VoiceModeState.TRANSITIONING_TO_TEXT:
          message = 'Returning to text mode...';
          break;
        case VoiceModeState.IDLE:
          if (prevState !== VoiceModeState.IDLE) {
            message = 'Voice mode deactivated. Returned to text mode.';
            isAssertive = true;
          } else {
            message = 'Voice mode inactive';
          }
          break;
      }
      
      if (message) {
        setStatusMessage(message);
        announce(message, isAssertive);
      }
    };
    
    // Handle voice activity detection
    const handleVoiceActivity = (data: { isSpeaking: boolean; level: number; timestamp: number; duration?: number }) => {
      if (data.isSpeaking && voiceState === VoiceModeState.ACTIVE) {
        announce('Speech detected', false);
      }
    };
    
    // Subscribe to voice state changes
    voiceModeManager.on('state:changed', handleVoiceStateChange);
    
    // Set initial state
    setVoiceState(voiceModeManager.getState());
    
    // Listen for voice activity events
    eventBus.on('voice:activity', handleVoiceActivity);
    
    // Clean up
    return () => {
      voiceModeManager.off('state:changed', handleVoiceStateChange);
      eventBus.off('voice:activity', handleVoiceActivity);
    };
  }, [announcementsEnabled, voiceState]);
  
  // Track audio levels
  useEffect(() => {
    if (!isListening) return;
    
    const handleAudioLevel = (data: { level: number }) => {
      setAudioLevel(data.level);
    };
    
    const unsubscribe = eventBus.on('audio:level', handleAudioLevel);
    
    return () => {
      unsubscribe();
    };
  }, [isListening]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if focused on our control or using Alt+key shortcuts
      const isOurElementFocused = 
        document.activeElement === controlRef.current ||
        e.altKey;
      
      if (!isOurElementFocused) return;
      
      // Alt+m to toggle voice mode
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleVoiceMode();
        announce(isListening ? 'Voice mode deactivated' : 'Voice mode activated', true);
      }
      
      // Alt+h to toggle help
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHelp(!showHelp);
        announce(showHelp ? 'Help panel closed' : 'Help panel opened', true);
      }
      
      // Escape to stop voice mode
      if (e.key === 'Escape' && isListening) {
        e.preventDefault();
        stopVoiceMode();
        announce('Voice mode deactivated', true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isListening, showHelp]);
  
  // Toggle voice mode
  const toggleVoiceMode = async () => {
    try {
      if (isListening) {
        await stopVoiceMode();
      } else {
        await startVoiceMode();
      }
    } catch (error) {
      console.error('Error toggling voice mode:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error toggling voice mode');
      announce(`Voice mode error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  };
  
  // Start voice mode
  const startVoiceMode = async () => {
    setErrorMessage(null);
    announce('Starting voice mode...', true);
    try {
      await startListening();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error starting voice mode');
      throw error;
    }
  };
  
  // Stop voice mode
  const stopVoiceMode = async () => {
    announce('Stopping voice mode...', true);
    await stopListening();
  };
  
  // Dismiss error
  const dismissError = () => {
    setErrorMessage(null);
  };
  
  // Toggle help panel
  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };
  
  // Calculate audio level indicator width
  const audioLevelWidth = `${Math.min(audioLevel * 100, 100)}%`;
  
  return (
    <div 
      className={cn(
        "relative flex flex-col items-center",
        className
      )}
      aria-live="polite"
    >
      {/* Screen reader announcements (visually hidden) */}
      <div 
        ref={announceRef}
        className="sr-only"
        aria-live="assertive"
        role="status"
      ></div>
      
      {/* Voice mode status for screen readers */}
      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>
      
      {/* Visual status indicator */}
      <div 
        className={cn(
          "text-sm mb-2 px-3 py-1 rounded-full",
          isListening 
            ? "bg-primary/20 text-primary" 
            : "bg-muted text-muted-foreground",
          errorMessage && "bg-destructive/20 text-destructive"
        )}
        aria-hidden="true"
      >
        {errorMessage || statusMessage}
      </div>
      
      {/* Main voice control */}
      <div className="flex items-center gap-2">
        <button
          ref={controlRef}
          type="button"
          onClick={toggleVoiceMode}
          disabled={!isVoiceEnabled || voiceState === VoiceModeState.INITIALIZING}
          className={cn(
            "relative w-12 h-12 rounded-full flex items-center justify-center",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
            "transition-colors duration-200",
            isListening
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted hover:bg-muted/80",
            voiceState === VoiceModeState.INITIALIZING && "animate-pulse",
            errorMessage && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          )}
          aria-label={isListening ? "Stop voice input (Alt+M)" : "Start voice input (Alt+M)"}
          aria-pressed={isListening}
          aria-disabled={!isVoiceEnabled}
          data-state={isListening ? 'active' : 'inactive'}
        >
          {voiceState === VoiceModeState.INITIALIZING ? (
            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
          ) : isListening ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
          
          {/* Audio level indicator (only visible when listening) */}
          {isListening && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-2 bg-primary/20 overflow-hidden rounded-b-full"
              aria-hidden="true"
            >
              <div 
                className="h-full bg-primary/60 transition-all duration-100"
                style={{ width: audioLevelWidth }}
              ></div>
            </div>
          )}
        </button>
        
        {/* Help button */}
        <button
          type="button"
          onClick={toggleHelp}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          aria-label="Voice mode help (Alt+H)"
          aria-pressed={showHelp}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
      
      {/* Error message with dismiss button */}
      {errorMessage && (
        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{errorMessage}</div>
          <button
            onClick={dismissError}
            className="text-destructive/80 hover:text-destructive"
            aria-label="Dismiss error message"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Help panel */}
      {showHelp && (
        <div className="mt-3 p-3 bg-muted rounded border text-sm w-full max-w-xs">
          <h3 className="font-medium mb-2 flex items-center gap-1">
            <Volume2 className="h-4 w-4" />
            Voice Mode Help
          </h3>
          
          <div className="space-y-2">
            <p>Use voice mode to speak to the AI assistant directly.</p>
            
            <div>
              <h4 className="font-medium text-xs uppercase text-muted-foreground mt-2 mb-1">Keyboard Shortcuts</h4>
              <ul className="space-y-1 text-xs">
                <li><kbd className="px-1.5 py-0.5 bg-muted-foreground/20 rounded text-xs">Alt+M</kbd> Toggle voice mode</li>
                <li><kbd className="px-1.5 py-0.5 bg-muted-foreground/20 rounded text-xs">Alt+H</kbd> Toggle help panel</li>
                <li><kbd className="px-1.5 py-0.5 bg-muted-foreground/20 rounded text-xs">Esc</kbd> Stop voice mode</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-xs uppercase text-muted-foreground mt-2 mb-1">Status Indicators</h4>
              <ul className="space-y-1 text-xs">
                <li><span className="inline-block w-3 h-3 rounded-full bg-primary align-middle mr-1"></span> Listening to your voice</li>
                <li><span className="inline-block w-3 h-3 rounded-full bg-muted-foreground align-middle mr-1"></span> Voice mode inactive</li>
                <li><span className="inline-block w-3 h-3 rounded-full bg-destructive align-middle mr-1"></span> Error with voice input</li>
              </ul>
            </div>
          </div>
          
          <button
            onClick={toggleHelp}
            className="mt-2 text-xs text-primary hover:underline w-full text-center"
          >
            Close Help
          </button>
        </div>
      )}
    </div>
  );
} 