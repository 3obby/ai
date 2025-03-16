'use client';

import React, { useRef, useEffect } from 'react';
import { Message } from '../../types';
import { MessageItem } from './MessageItem';
import { useGroupChat } from '../../context/GroupChatContext';

interface MessageListProps {
  messages: Message[];
  className?: string;
}

export function MessageList({ messages, className = '' }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { state } = useGroupChat();
  
  const { showTimestamps, showAvatars, showDebugInfo } = state.settings.ui;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`flex flex-col w-full h-full overflow-y-auto p-4 ${className}`}>
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <p>No messages yet</p>
          <p className="text-sm">Start a conversation to see messages here</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageItem 
            key={message.id} 
            message={message} 
            showTimestamp={showTimestamps}
            showAvatar={showAvatars}
            showDebugInfo={showDebugInfo}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
} 