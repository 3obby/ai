import React, { useEffect, useState } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';

interface VoiceContextInheritanceProps {
  onContextInherited?: (voiceBotIds: string[]) => void;
}

/**
 * VoiceContextInheritance Component
 * 
 * This component serves as the integration point for voice context inheritance in the UI.
 * It automatically monitors voice mode state changes and handles the context inheritance
 * process when transitioning between text and voice modes.
 * 
 * Key responsibilities:
 * 1. Detecting when voice mode is activated
 * 2. Collecting current conversation history
 * 3. Creating voice bot clones with inherited context
 * 4. Notifying parent components when context has been inherited
 * 5. Handling errors during the inheritance process
 * 
 * This component is typically placed in the ChatInterface to enable seamless
 * transitions that preserve full conversation history.
 */
const VoiceContextInheritance: React.FC<VoiceContextInheritanceProps> = ({ 
  onContextInherited 
}) => {
  const { state } = useGroupChatContext();
  const { cloneBotInstanceForVoice } = useBotRegistry();
  const [activeVoiceBots, setActiveVoiceBots] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for voice mode activation to trigger context inheritance
  useEffect(() => {
    // Only inherit context if:
    // 1. Voice recording is active
    // 2. We're not already initializing
    // 3. No voice bots have been created yet
    if (state.isRecording && !isInitializing && activeVoiceBots.length === 0) {
      inheritContext();
    }
  }, [state.isRecording]);

  // Clean up when voice mode is deactivated
  useEffect(() => {
    if (!state.isRecording && activeVoiceBots.length > 0) {
      setActiveVoiceBots([]);
    }
  }, [state.isRecording]);

  /**
   * Core method that handles the context inheritance process
   * 
   * This method:
   * 1. Retrieves current conversation messages
   * 2. Creates voice bot clones for each active bot
   * 3. Passes messages to enable context inheritance
   * 4. Tracks the created voice bots
   * 5. Notifies parent components of successful inheritance
   */
  const inheritContext = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      // Get current active bots and messages from global state
      const activeBotIds = state.settings.activeBotIds;
      const currentMessages = state.messages;
      
      // Validate that we have active bots
      if (!activeBotIds || activeBotIds.length === 0) {
        console.warn('No active bots to create voice ghosts for');
        return;
      }
      
      const newVoiceBotIds: string[] = [];
      
      // Process each active bot to create its voice counterpart with context
      for (const botId of activeBotIds) {
        // The cloneBotInstanceForVoice method handles the actual context inheritance
        // by leveraging VoiceModeManager internally
        const voiceBot = await cloneBotInstanceForVoice(botId, {
          messages: currentMessages, // Pass all messages for context filtering
        });
        
        if (voiceBot) {
          console.log(`Voice bot activated with conversation context: ${voiceBot.id}`);
          newVoiceBotIds.push(voiceBot.id);
        }
      }
      
      // Update component state with new voice bot IDs
      setActiveVoiceBots(newVoiceBotIds);
      
      // Notify parent component about successful context inheritance
      if (onContextInherited) {
        onContextInherited(newVoiceBotIds);
      }
    } catch (error) {
      console.error('Failed to inherit context for voice mode:', error);
      setError('Failed to prepare voice mode. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  // This component is mostly logic-focused and renders minimally
  // Only show an error message if something went wrong
  return error ? <div className="voice-error-message">{error}</div> : null;
};

export default VoiceContextInheritance; 