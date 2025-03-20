'use client';

import React, { useEffect, useState } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { cn } from '@/lib/utils';
import voiceModeManager from '../../services/voice/VoiceModeManager';

interface VoiceTransitionSettingsProps {
  className?: string;
}

/**
 * VoiceTransitionSettings Component
 * 
 * A UI component for configuring how the system behaves when transitioning
 * between voice and text modes. Settings include:
 * 
 * 1. Whether to keep pre-processing hooks in voice mode
 * 2. Whether to keep post-processing hooks in voice mode
 * 3. Voice ghost cleanup behavior
 * 4. Context preservation settings
 */
export function VoiceTransitionSettings({ className }: VoiceTransitionSettingsProps) {
  const { state, dispatch } = useGroupChatContext();
  const { voiceSettings, updateVoiceSettings } = useVoiceSettings();
  
  // Local state for the form
  const [keepPreProcessingHooks, setKeepPreProcessingHooks] = useState(false);
  const [keepPostProcessingHooks, setKeepPostProcessingHooks] = useState(false);
  const [preserveVoiceHistory, setPreserveVoiceHistory] = useState(true);
  const [automaticVoiceSelection, setAutomaticVoiceSelection] = useState(true);
  
  // Initialize from the voice mode manager
  useEffect(() => {
    const config = voiceModeManager.getConfig();
    setKeepPreProcessingHooks(config.keepPreprocessingHooks || false);
    setKeepPostProcessingHooks(config.keepPostprocessingHooks || false);
    setPreserveVoiceHistory(config.preserveVoiceHistory !== false);
    setAutomaticVoiceSelection(config.automaticVoiceSelection !== false);
  }, []);
  
  // Handle changes to the configuration
  const updateConfig = (updates: {
    keepPreProcessingHooks?: boolean;
    keepPostProcessingHooks?: boolean;
    preserveVoiceHistory?: boolean;
    automaticVoiceSelection?: boolean;
  }) => {
    // Update local state
    if (updates.keepPreProcessingHooks !== undefined) {
      setKeepPreProcessingHooks(updates.keepPreProcessingHooks);
    }
    if (updates.keepPostProcessingHooks !== undefined) {
      setKeepPostProcessingHooks(updates.keepPostProcessingHooks);
    }
    if (updates.preserveVoiceHistory !== undefined) {
      setPreserveVoiceHistory(updates.preserveVoiceHistory);
    }
    if (updates.automaticVoiceSelection !== undefined) {
      setAutomaticVoiceSelection(updates.automaticVoiceSelection);
    }
    
    // Update the voice mode manager configuration
    voiceModeManager.updateConfig({
      keepPreprocessingHooks: updates.keepPreProcessingHooks !== undefined 
        ? updates.keepPreProcessingHooks 
        : keepPreProcessingHooks,
      keepPostprocessingHooks: updates.keepPostProcessingHooks !== undefined 
        ? updates.keepPostProcessingHooks 
        : keepPostProcessingHooks,
      preserveVoiceHistory: updates.preserveVoiceHistory !== undefined 
        ? updates.preserveVoiceHistory 
        : preserveVoiceHistory,
      automaticVoiceSelection: updates.automaticVoiceSelection !== undefined 
        ? updates.automaticVoiceSelection 
        : automaticVoiceSelection,
    });
    
    // Also update the global voice settings if needed
    const newVoiceSettings = {
      ...voiceSettings,
      preserveVoiceHistory: updates.preserveVoiceHistory !== undefined 
        ? updates.preserveVoiceHistory 
        : preserveVoiceHistory,
      automaticVoiceSelection: updates.automaticVoiceSelection !== undefined 
        ? updates.automaticVoiceSelection 
        : automaticVoiceSelection,
    };
    
    updateVoiceSettings(newVoiceSettings);
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-medium">Voice-to-Text Transition Settings</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Configure how the system behaves when switching between voice and text modes.
      </p>
      
      {/* Processing Hook Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-medium">Processing Hooks</h4>
        
        {/* Pre-processing hooks */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="keepPreProcessingHooks" className="text-sm font-medium">
              Keep Pre-processing Hooks in Voice Mode
            </label>
            <p className="text-xs text-muted-foreground">
              If enabled, pre-processing will be applied to messages in voice mode.
            </p>
          </div>
          <button
            type="button"
            id="keepPreProcessingHooks"
            onClick={() => updateConfig({ keepPreProcessingHooks: !keepPreProcessingHooks })}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              keepPreProcessingHooks ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
            )}
            aria-pressed={keepPreProcessingHooks}
          >
            <span className="sr-only">
              {keepPreProcessingHooks ? "Enabled" : "Disabled"}
            </span>
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                keepPreProcessingHooks ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
        
        {/* Post-processing hooks */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="keepPostProcessingHooks" className="text-sm font-medium">
              Keep Post-processing Hooks in Voice Mode
            </label>
            <p className="text-xs text-muted-foreground">
              If enabled, post-processing will be applied to bot responses in voice mode.
            </p>
          </div>
          <button
            type="button"
            id="keepPostProcessingHooks"
            onClick={() => updateConfig({ keepPostProcessingHooks: !keepPostProcessingHooks })}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              keepPostProcessingHooks ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
            )}
            aria-pressed={keepPostProcessingHooks}
          >
            <span className="sr-only">
              {keepPostProcessingHooks ? "Enabled" : "Disabled"}
            </span>
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                keepPostProcessingHooks ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>
      
      {/* Context Settings */}
      <div className="space-y-4 pt-2">
        <h4 className="text-md font-medium">Context & History</h4>
        
        {/* Preserve voice history */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="preserveVoiceHistory" className="text-sm font-medium">
              Preserve Voice Conversation History
            </label>
            <p className="text-xs text-muted-foreground">
              Keep voice interactions in the chat history when switching to text mode.
            </p>
          </div>
          <button
            type="button"
            id="preserveVoiceHistory"
            onClick={() => updateConfig({ preserveVoiceHistory: !preserveVoiceHistory })}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              preserveVoiceHistory ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
            )}
            aria-pressed={preserveVoiceHistory}
          >
            <span className="sr-only">
              {preserveVoiceHistory ? "Enabled" : "Disabled"}
            </span>
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                preserveVoiceHistory ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
        
        {/* Automatic voice selection */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="automaticVoiceSelection" className="text-sm font-medium">
              Automatic Voice Selection
            </label>
            <p className="text-xs text-muted-foreground">
              Automatically select the best voice based on the bot's personality.
            </p>
          </div>
          <button
            type="button"
            id="automaticVoiceSelection"
            onClick={() => updateConfig({ automaticVoiceSelection: !automaticVoiceSelection })}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              automaticVoiceSelection ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
            )}
            aria-pressed={automaticVoiceSelection}
          >
            <span className="sr-only">
              {automaticVoiceSelection ? "Enabled" : "Disabled"}
            </span>
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                automaticVoiceSelection ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground mt-6 pt-4 border-t">
        <p>
          <strong>Note:</strong> These settings control how the system transitions between voice and text modes. 
          For optimal voice experiences, pre/post-processing hooks are typically disabled in voice mode to reduce latency.
        </p>
      </div>
    </div>
  );
} 