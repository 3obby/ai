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
import { usePromptsContext } from '../../context/PromptsContext';

interface ChatInputProps {
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  activePrompt?: string | null;
  onActivePromptSent?: () => void;
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
  activePrompt = null,
  onActivePromptSent,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isProcessing } = useRealGroupChat();
  const { isInVoiceMode } = useLiveKitIntegration();
  const { state: promptsState } = usePromptsContext();

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

  // Get the first enabled prompt text
  const firstEnabledPromptText = React.useMemo(() => {
    // Start with container prompts
    for (const container of promptsState.containers) {
      if (container.enabled) {
        for (const prompt of container.prompts) {
          if (prompt.enabled) {
            return prompt.text;
          }
        }
      }
    }
    
    // Then check standalone prompts
    for (const prompt of promptsState.standalonePrompts) {
      if (prompt.enabled) {
        return prompt.text;
      }
    }
    
    return null;
  }, [promptsState]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Set the message to the active prompt if provided
  useEffect(() => {
    if (activePrompt) {
      setMessage(activePrompt);
    }
  }, [activePrompt]);

  // Handle text submission in text mode
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use text in this priority: activePrompt > message > concatenatedPromptsText
    const textToSend = (activePrompt || message || concatenatedPromptsText || '').trim();
    
    if (!textToSend || disabled || isProcessing) return;
    
    sendMessage(textToSend);
    setMessage('');
    
    // Notify that the active prompt was sent
    if (activePrompt && onActivePromptSent) {
      onActivePromptSent();
    }
    
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
    // Use VoiceModeManager to handle voice-to-text transition
    voiceModeManager.deactivateVoiceMode();
    console.log('Voice mode closed from blackbar');
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
          className={cn(
            "blackbar flex items-end gap-2 border-t bg-background p-4 mobile-safe-bottom",
            className
          )}
        >
          {/* Text input - Primary input method in text mode */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={firstEnabledPromptText ? "Prompts ready to send..." : placeholder}
              disabled={disabled || isProcessing || !!activePrompt}
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "input-accessible min-h-[40px] max-h-[200px] pr-10",
                (disabled || activePrompt) && "opacity-50 cursor-not-allowed",
                hasEnabledPrompts && !message && "border-primary/30 bg-primary/5"
              )}
              rows={1}
            />
          </div>
          
          <div className="blackbar-controls flex items-center gap-2">
            {/* Voice mode toggle button - Switches between text and voice modes */}
            <div className="voice-button-wrapper">
              <VoiceInputButton 
                onTranscriptionComplete={handleVoiceTranscription}
                disabled={disabled || isProcessing}
                // Auto-send is enabled by default
                autoSend={true}
                aria-label="Voice Mode"
                title="Start Voice Mode"
                className="voice-mode-btn"
              />
            </div>
            
            {/* Send button - Primary action in text mode */}
            <button
              type="submit"
              disabled={(!message && !concatenatedPromptsText && !activePrompt) || disabled || isProcessing}
              className={cn(
                "blackbar-send-btn rounded-full p-2 transition-colors touch-target",
                "send-button-wrapper",
                hasEnabledPrompts && !message && !disabled && !isProcessing ? 
                  "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 animate-subtle-pulse" : 
                (message.trim() || activePrompt) && !disabled && !isProcessing
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                  : "bg-muted text-muted-foreground",
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
      `}</style>
    </>
  );
} 