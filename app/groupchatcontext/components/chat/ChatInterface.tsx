'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, Mic, MicOff, Send } from 'lucide-react';
import { useGroupChatContext } from '../../context/GroupChatProvider';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { createUserMessage } from '../../types/messages';
import MessageList from './MessageList';
import { TypingIndicator } from './TypingIndicator';

interface ChatInterfaceProps {
  onSettingsClick?: () => void;
}

export default function ChatInterface({ onSettingsClick }: ChatInterfaceProps) {
  const { state, dispatch } = useGroupChatContext();
  const { getSelectedBots } = useBotRegistry();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const message = createUserMessage(inputValue.trim());
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      
      // In a real implementation, we would call an API here to get bot responses
      // For now, we'll just simulate typing indicators
      const selectedBots = getSelectedBots();
      selectedBots.forEach(bot => {
        dispatch({ type: 'ADD_TYPING_BOT', payload: bot.id });
        
        // Simulate bot response after a delay
        setTimeout(() => {
          dispatch({ type: 'REMOVE_TYPING_BOT', payload: bot.id });
          
          // Add a mock response
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: `bot-${bot.id}-${Date.now()}`,
              content: `This is a mock response from ${bot.name} to your message: "${inputValue.trim()}"`,
              sender: bot.id,
              senderName: bot.name,
              senderAvatar: bot.avatar,
              timestamp: new Date(),
              type: 'text'
            }
          });
        }, 1500 + Math.random() * 2000); // Random delay between 1.5-3.5s
      });
      
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    dispatch({ type: 'SET_RECORDING', payload: !state.isRecording });
    // In a real implementation, we would start/stop the transcription service here
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-background">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-lg font-semibold">Group Chat</h1>
        <button 
          onClick={onSettingsClick}
          className="p-2 rounded-full hover:bg-muted"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList messages={state.messages} />
        
        {/* Typing indicators */}
        {state.typingBots.length > 0 && (
          <div className="pl-4">
            <TypingIndicator botIds={state.typingBots} />
          </div>
        )}
        
        {/* Interim transcript */}
        {state.interimTranscript && (
          <div className="pl-4 text-muted-foreground italic">
            {state.interimTranscript}
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t flex items-center gap-2">
        <button
          onClick={toggleRecording}
          className={`p-2 rounded-full ${
            state.isRecording 
              ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
              : 'hover:bg-muted'
          }`}
          aria-label={state.isRecording ? 'Stop recording' : 'Start recording'}
        >
          {state.isRecording ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={state.isRecording}
          className="flex-1 p-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
        />
        
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim()}
          className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
} 