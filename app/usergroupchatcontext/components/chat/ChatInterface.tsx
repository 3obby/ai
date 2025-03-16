'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGroupChat } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { SettingsModal } from '../settings/SettingsModal';
import { Settings, Send, Mic, MicOff, Users } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const { state, dispatch, sendMessage } = useGroupChat();
  const { state: botState } = useBotRegistry();
  const bots = botState.availableBots;
  
  const [inputValue, setInputValue] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-scroll on new messages or when typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.typingBotIds]);

  // Auto-resize textarea height
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || state.isProcessing) return;
    
    // Send message
    sendMessage(inputValue.trim());
    
    // Reset input
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, this would start/stop voice recording
  };

  const toggleSettings = () => {
    dispatch({ type: 'TOGGLE_SETTINGS' });
    setSettingsOpen(!settingsOpen);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/10">
        <div className="flex items-center">
          <h2 className="font-medium text-sm">{state.settings.name}</h2>
          <div className="ml-2 flex items-center">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-xs text-primary">
              {state.settings.activeBotIds.length}
            </span>
            <Users className="h-3 w-3 ml-1 text-muted-foreground" />
          </div>
        </div>
        <button
          onClick={toggleSettings}
          className="p-1.5 text-muted-foreground hover:text-primary rounded-md transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-3">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start a conversation</p>
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {state.messages.map((message) => (
              <div key={message.id} className="py-2 px-2">
                <div className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.sender !== 'user' && message.senderName && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
                      {message.senderName?.charAt(0) || 'A'}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[85%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {message.sender !== 'user' && message.senderName && (
                      <div className="text-xs font-medium text-muted-foreground ml-1 mb-1">
                        {message.senderName}
                      </div>
                    )}
                    <div className={`px-3 py-2 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    </div>
                    {message.metadata?.toolResults && message.metadata.toolResults.length > 0 && (
                      <div className="mt-1 px-1">
                        <div className="text-xs text-muted-foreground">
                          Used {message.metadata.toolResults.length} tool{message.metadata.toolResults.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {state.typingBotIds.length > 0 && (
          <div className="px-3 py-2">
            <TypingIndicator botIds={state.typingBotIds} />
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>
      
      <div className="border-t bg-background p-2">
        {state.isProcessing && (
          <div className="px-2 py-1 mb-2 text-xs text-muted-foreground bg-muted/20 rounded-md">
            Processing responses...
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <button
            onClick={toggleRecording}
            disabled={state.isProcessing}
            className={`p-2 rounded-full ${
              isRecording 
                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' 
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/40'
            } transition-colors touch-manipulation`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={state.isProcessing ? "Processing..." : "Type your message..."}
              disabled={state.isProcessing || isRecording}
              rows={1}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-none max-h-32 pr-10 input-accessible text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || state.isProcessing}
              className="absolute right-2 bottom-2 p-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
} 