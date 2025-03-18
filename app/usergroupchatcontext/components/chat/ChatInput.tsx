'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import { VoiceInputButton } from './VoiceInputButton';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface ChatInputProps {
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  className,
  placeholder = "Type a message...",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isProcessing } = useRealGroupChat();

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

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

  const handleVoiceTranscription = (transcript: string) => {
    setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    
    // Focus the textarea after voice input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <>
      <form 
        onSubmit={handleSubmit} 
        className={cn(
          "flex items-end gap-2 border-t bg-background p-4 mobile-safe-bottom",
          className
        )}
      >
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
        
        <div className="flex items-center gap-2">
          <VoiceInputButton 
            onTranscriptionComplete={handleVoiceTranscription}
            disabled={disabled || isProcessing}
          />
          
          <button
            type="submit"
            disabled={!message.trim() || disabled || isProcessing}
            className={cn(
              "rounded-full p-2 transition-colors touch-target",
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
    </>
  );
} 