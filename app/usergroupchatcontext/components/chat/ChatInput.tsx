'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import { VoiceInputButton } from './VoiceInputButton';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import VoiceModeRedbar from './VoiceModeRedbar';
import voiceModeManager from '../../services/voice/VoiceModeManager';
import sessionConnectionManager from '../../services/livekit/session-connection-manager';
import { usePromptsContext } from '../../context/PromptsContext';
import { PromptIndicator } from './PromptIndicator';
import HoldRecordVoiceMessageButton from './HoldRecordVoiceMessageButton';

interface ChatInputProps {
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * ChatInput - The "blackbar" component
 * 
 * Serves as the primary control center for all user interactions in both voice and text modes.
 * - In text mode: Contains text input, send button, and voice mode toggle
 * - In voice mode: Changes to support voice interactions
 */
export function ChatInput({
  className,
  placeholder = "Type a message...",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isProcessing } = useRealGroupChat();
  const { isInVoiceMode } = useLiveKitIntegration();
  const { state: promptsState, dispatch: promptsDispatch } = usePromptsContext();

  // Check if there are any enabled prompts
  const hasEnabledPrompts = React.useMemo(() => {
    const containerPrompts = promptsState.containers
      .filter(container => container.enabled)
      .some(container => container.prompts.some(prompt => prompt.enabled));
    
    const standalonePrompts = promptsState.standalonePrompts.some(prompt => prompt.enabled);
    
    return containerPrompts || standalonePrompts;
  }, [promptsState]);

  // Get concatenated text of all enabled prompts
  const concatenatedPromptsText = React.useMemo(() => {
    const containerPrompts = promptsState.containers
      .filter(container => container.enabled)
      .flatMap(container => container.prompts.filter(prompt => prompt.enabled)
        .map(prompt => prompt.text));
    
    const standalonePrompts = promptsState.standalonePrompts
      .filter(prompt => prompt.enabled)
      .map(prompt => prompt.text);
    
    const allPromptTexts = [...containerPrompts, ...standalonePrompts];
    return allPromptTexts.length > 0 ? allPromptTexts.join('\n\n') : null;
  }, [promptsState]);

  // Count enabled prompts
  const enabledPromptCount = React.useMemo(() => {
    const containerPromptCount = promptsState.containers
      .filter(container => container.enabled)
      .reduce((acc, container) => 
        acc + container.prompts.filter(prompt => prompt.enabled).length, 0);
    
    const standalonePromptCount = promptsState.standalonePrompts
      .filter(prompt => prompt.enabled)
      .length;
    
    return containerPromptCount + standalonePromptCount;
  }, [promptsState]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Handle text submission in text mode
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there's no message or prompts, or if we're disabled/processing, don't submit
    if ((!message && !concatenatedPromptsText) || disabled || isProcessing) return;
    
    // Combine prompts with user message if prompts are enabled
    let textToSend = message;
    if (concatenatedPromptsText) {
      textToSend = message 
        ? `${concatenatedPromptsText}\n\n${message}` 
        : concatenatedPromptsText;
    }
    
    sendMessage(textToSend.trim());
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle voice transcription from voice mode
  const handleVoiceTranscription = (transcript: string) => {
    // We'll only add to the input field if it's not auto-sending
    setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    
    // Focus the textarea after voice input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Handle closing voice mode from VoiceModeBlackbar
  const handleCloseVoiceMode = () => {
    // Get LiveKit integration's stopListening function
    const { stopListening } = useLiveKitIntegration();
    
    // Stop listening for audio
    if (typeof stopListening === 'function') {
      stopListening();
    }
    
    // Use VoiceModeManager to handle voice-to-text transition
    voiceModeManager.deactivateVoiceMode();
    
    // Set voice mode inactive in session connection manager
    try {
      const activeRoomName = sessionConnectionManager.getActiveRoomName();
      if (activeRoomName) {
        sessionConnectionManager.closeConnection(activeRoomName);
      }
      sessionConnectionManager.setVoiceModeActive(false);
    } catch (error) {
      console.error('Error during voice mode cleanup:', error);
    }
    
    console.log('Voice mode closed from blackbar - complete shutdown sequence executed');
  };

  // Handle clearing all prompts
  const handleClearPrompts = () => {
    // Disable all prompts in containers
    promptsState.containers.forEach(container => {
      container.prompts.forEach(prompt => {
        if (prompt.enabled) {
          promptsDispatch({
            type: 'UPDATE_PROMPT',
            promptId: prompt.id,
            updates: { enabled: false }
          });
        }
      });
    });
    
    // Disable all standalone prompts
    promptsState.standalonePrompts.forEach(prompt => {
      if (prompt.enabled) {
        promptsDispatch({
          type: 'UPDATE_PROMPT',
          promptId: prompt.id,
          updates: { enabled: false }
        });
      }
    });
  };

  // Return the appropriate blackbar based on mode
  return (
    <>
      {isInVoiceMode ? (
        // Voice Mode Blackbar - Shows voice analytics and controls
        <VoiceModeRedbar onClose={handleCloseVoiceMode} />
      ) : (
        // Text Mode Blackbar - Shows text input and controls
        <form 
          onSubmit={handleSubmit} 
          className="blackbar"
        >
          {/* Text input - Primary input method in text mode */}
          <div className="w-full mb-3 relative">
            <div className="flex items-center border border-input rounded-md bg-background overflow-hidden">
              {/* Prompt indicator rendered directly in the input container */}
              {enabledPromptCount > 0 && (
                <PromptIndicator
                  promptCount={enabledPromptCount}
                  onClear={handleClearPrompts}
                  className="ml-3"
                />
              )}
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || isProcessing}
                className={cn(
                  "w-full resize-none border-0 bg-transparent px-3 py-2 text-sm flex-1",
                  "focus-visible:outline-none focus-visible:ring-0",
                  "input-accessible min-h-[50px] max-h-[200px]",
                  (disabled || isProcessing) && "opacity-50 cursor-not-allowed"
                )}
                rows={1}
              />
            </div>
          </div>
          
          <div className="flex justify-end items-center gap-3 w-full">
            {/* Press and hold voice recording button */}
            <HoldRecordVoiceMessageButton
              onTranscriptionComplete={handleVoiceTranscription}
              disabled={disabled || isProcessing}
              className="rounded-full p-2 flex items-center justify-center w-9 h-9 bg-muted/60 text-muted-foreground hover:bg-muted/80 transition-colors touch-target"
            />
            
            {/* Send button - Primary action in text mode */}
            <button
              type="submit"
              disabled={(!message && !concatenatedPromptsText) || disabled || isProcessing}
              className={cn(
                "rounded-full p-2 flex items-center justify-center w-9 h-9 transition-colors touch-target",
                (message.trim() || concatenatedPromptsText) && !disabled && !isProcessing
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                  : "bg-muted/60 text-muted-foreground",
                hasEnabledPrompts && "border-primary/30"
              )}
              aria-label="Send message"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      )}
      <style jsx global>{`
        @keyframes subtle-pulse {
          0% { box-shadow: 0 0 0 rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
          100% { box-shadow: 0 0 0 rgba(59, 130, 246, 0.3); }
        }
        .animate-subtle-pulse {
          animation: subtle-pulse 2s infinite;
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
          100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
      `}</style>
    </>
  );
} 