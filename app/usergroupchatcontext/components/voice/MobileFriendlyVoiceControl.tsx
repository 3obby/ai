'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useVoiceState } from '../../hooks/useVoiceState';
import { Mic, MicOff, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';
import AudioVisualizer from './AudioVisualizer';
import { VoiceModeState } from '../../services/voice/VoiceModeManager';
import eventBus from '../../services/events/EventBus';

interface MobileFriendlyVoiceControlProps {
  className?: string;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

/**
 * MobileFriendlyVoiceControl Component
 * 
 * An optimized voice control component specifically designed for mobile devices:
 * - Larger touch targets for better accessibility
 * - Visual feedback with ripple effect
 * - Optimized rendering with useCallback for better performance
 * - Haptic feedback (vibration) for user interactions
 * - Responsive animation based on voice state
 */
export function MobileFriendlyVoiceControl({
  className,
  onTouchStart,
  onTouchEnd
}: MobileFriendlyVoiceControlProps) {
  const { isVoiceEnabled, toggleVoiceEnabled } = useVoiceSettings();
  const { 
    isRecording, 
    isProcessing, 
    currentState, 
    startVoiceMode, 
    stopVoiceMode, 
    lastError 
  } = useVoiceState();
  
  const [audioLevel, setAudioLevel] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [ripple, setRipple] = useState({ x: 0, y: 0, visible: false });
  
  // Update initialization state based on current voice state
  useEffect(() => {
    setIsInitializing(currentState === VoiceModeState.INITIALIZING);
  }, [currentState]);
  
  // Track audio level for visualizer
  useEffect(() => {
    if (!isRecording) return;
    
    const handleAudioLevel = (data: { level: number }) => {
      setAudioLevel(data.level);
    };
    
    eventBus.on('audio:level', handleAudioLevel);
    
    return () => {
      eventBus.off('audio:level', handleAudioLevel);
    };
  }, [isRecording]);
  
  // Handle touch start - begin recording
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isVoiceEnabled || isInitializing) return;
    
    // Calculate ripple position from touch
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    
    // Show ripple effect
    setRipple({ x, y, visible: true });
    
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(40); // Short pulse for tap feedback
    }
    
    // Start voice mode if not already recording
    if (!isRecording) {
      startVoiceMode();
    }
    
    // Call external handler if provided
    if (onTouchStart) {
      onTouchStart();
    }
  }, [isVoiceEnabled, isInitializing, isRecording, startVoiceMode, onTouchStart]);
  
  // Handle touch end - stop recording
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setRipple(prev => ({ ...prev, visible: false }));
    
    // Only stop if we're recording and not processing
    if (isRecording && !isProcessing) {
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate([25, 10, 25]); // Double-pulse for release
      }
      
      stopVoiceMode();
    }
    
    // Call external handler if provided
    if (onTouchEnd) {
      onTouchEnd();
    }
  }, [isRecording, isProcessing, stopVoiceMode, onTouchEnd]);
  
  // Helper function to determine which icon to show
  const getIcon = () => {
    if (isInitializing) {
      return <Loader className="h-6 w-6 md:h-8 md:w-8 animate-spin" />;
    }
    
    if (isRecording) {
      return <MicOff className="h-6 w-6 md:h-8 md:w-8" />;
    }
    
    return <Mic className="h-6 w-6 md:h-8 md:w-8" />;
  };
  
  return (
    <div className={cn("relative touch-manipulation", className)}>
      <button
        type="button"
        onClick={() => {
          if (!isVoiceEnabled || isInitializing) return;
          if (isRecording) {
            stopVoiceMode();
          } else {
            startVoiceMode();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={!isVoiceEnabled || isInitializing}
        className={cn(
          "touch-target voice-mode-btn rounded-full w-14 h-14",
          "flex items-center justify-center focus:outline-none",
          isRecording ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground",
          ripple.visible && "after:animate-ripple",
          "relative overflow-hidden",
          "transition-transform transform-gpu", // Use GPU for smoother animation
          isInitializing && "animate-pulse"
        )}
        style={{
          transform: `scale(${isRecording ? 1 + (audioLevel * 0.2) : 1})`,
          transition: 'transform 100ms ease-out' // Smooth transition for scale
        }}
        aria-label={isRecording ? "Stop voice input" : "Start voice input"}
      >
        {getIcon()}
        
        {/* Ripple effect overlay */}
        <span 
          className={cn(
            "absolute inset-0 bg-white/20 rounded-full",
            "transition-opacity duration-300",
            ripple.visible ? "opacity-100" : "opacity-0"
          )}
        />
      </button>
      
      {/* Audio visualizer */}
      {isRecording && (
        <div className="absolute -inset-4 pointer-events-none">
          <AudioVisualizer
            audioLevel={audioLevel}
            className="w-full h-full"
            barCount={24}
            color="hsl(var(--primary) / 0.4)"
          />
        </div>
      )}
    </div>
  );
} 