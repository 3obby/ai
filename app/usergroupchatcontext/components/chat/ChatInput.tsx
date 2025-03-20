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
    
    if (!message.trim() || disabled || isProcessing) return;
    
    sendMessage(message.trim());
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
              placeholder={placeholder}
              disabled={disabled || isProcessing}
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "input-accessible min-h-[40px] max-h-[200px] pr-10",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              rows={1}
            />
          </div>
          
          <div className="blackbar-controls flex items-center gap-2">
            {/* Voice mode toggle button - Switches between text and voice modes */}
            <VoiceInputButton 
              onTranscriptionComplete={handleVoiceTranscription}
              disabled={disabled || isProcessing}
              // Auto-send is enabled by default
              autoSend={true}
              aria-label="Voice Mode"
              title="Start Voice Mode"
              className="voice-mode-btn"
            />
            
            {/* Send button - Primary action in text mode */}
            <button
              type="submit"
              disabled={!message.trim() || disabled || isProcessing}
              className={cn(
                "blackbar-send-btn rounded-full p-2 transition-colors touch-target",
                message.trim() && !disabled && !isProcessing
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
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
    </>
  );
} 