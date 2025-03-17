'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { VoiceConversationController } from '../voice/VoiceConversationController';

interface ChatInputProps {
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({ 
  disabled = false, 
  placeholder = 'Type a message...',
  className = ''
}: ChatInputProps) {
  const { state, dispatch } = useGroupChatContext();
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(state.settings.ui?.enableVoice ?? false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '' || disabled) return;
    
    // Create a new message
    const messageId = uuidv4();
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: messageId,
        content: input.trim(),
        role: 'user',
        sender: 'user',
        timestamp: Date.now(),
        type: 'text',
        metadata: {
          processing: {
            preProcessed: false,
            postProcessed: false
          }
        }
      }
    });
    
    // Clear the input
    setInput('');
    
    // Focus the input again
    inputRef.current?.focus();
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const toggleVoice = useCallback(() => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    
    // Update settings
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        ui: {
          ...state.settings.ui,
          enableVoice: newValue
        }
      }
    });
  }, [voiceEnabled, dispatch, state.settings.ui]);
  
  const toggleRecording = useCallback(() => {
    // Recording is now handled by the VoiceConversationController
    // This just updates UI state
    setIsRecording(!isRecording);
    
    // Toggle recording state in group chat context
    dispatch({
      type: 'TOGGLE_RECORDING'
    });
  }, [isRecording, dispatch]);
  
  return (
    <>
      {/* Include the voice conversation controller */}
      <VoiceConversationController 
        voiceEnabled={voiceEnabled} 
        onVoiceToggle={setVoiceEnabled}
      />
      
      <div className={cn("border-t py-2 px-3", className)}>
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-none min-h-[60px] max-h-[200px] overflow-y-auto"
              rows={1}
            />
          </div>
          
          {/* Voice toggle button */}
          <button
            type="button"
            onClick={toggleVoice}
            className={cn(
              "p-2 rounded-md",
              voiceEnabled 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
          >
            {voiceEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </button>
          
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </>
  );
} 