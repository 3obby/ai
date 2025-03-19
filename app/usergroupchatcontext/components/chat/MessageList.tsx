'use client';

import React, { useRef, useEffect } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { cn } from '@/lib/utils';

export function MessageList() {
  const { state } = useGroupChatContext();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);
  
  if (state.messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">No messages yet</p>
        <p className="text-xs mt-1">Start a conversation to begin</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col p-4 gap-4">
      {state.messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isUser={message.sender === 'user'}
          showDebug={state.settings.ui?.showDebugInfo}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
} 