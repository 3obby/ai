'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGroupChatContext } from '../../context/GroupChatProvider';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({
  onSendMessage,
  isProcessing,
  placeholder = 'Type a message...',
  disabled = false
}: MessageInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, dispatch } = useGroupChatContext();
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isProcessing && inputValue.trim()) {
      e.preventDefault();
      handleSendClick();
    }
  };
  
  const handleSendClick = () => {
    if (inputValue.trim() && !isProcessing) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  const toggleRecording = () => {
    dispatch({
      type: 'TOGGLE_RECORDING'
    });
    
    // When stopping recording, focus the input
    if (state.isRecording && inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant={state.isRecording ? "destructive" : "outline"}
        onClick={toggleRecording}
        disabled={disabled}
        className="flex-shrink-0"
        aria-label={state.isRecording ? 'Stop recording' : 'Start recording'}
      >
        {state.isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={isProcessing ? "Processing..." : placeholder}
        disabled={disabled || state.isRecording}
        className="flex-1 p-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
      
      <Button
        type="button"
        size="icon"
        onClick={handleSendClick}
        disabled={!inputValue.trim() || isProcessing || disabled}
        className="flex-shrink-0"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
} 