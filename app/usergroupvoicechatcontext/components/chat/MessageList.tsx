'use client';

import React, { useRef, useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { Message } from '../../types';
import { TypingIndicator } from './TypingIndicator';
import { useGroupChatContext } from '../../context/GroupChatContext';

interface MessageListProps {
  messages: Message[];
  showDebugInfo?: boolean;
}

/**
 * MessageList
 * 
 * Renders the list of messages in the chat interface
 * with automatic scrolling to the latest message.
 */
export function MessageList({ messages, showDebugInfo = false }: MessageListProps) {
  const { state, dispatch } = useGroupChatContext();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);
  
  const handleBotSettingsClick = (botId: string) => {
    dispatch({ type: 'SET_SELECTED_BOT', payload: botId });
  };
  
  return (
    <div className="message-list w-full">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-3">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs">Start a conversation</p>
        </div>
      ) : (
        <div className="flex flex-col w-full">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              showTimestamp={true}
              showAvatar={true}
              showDebugInfo={showDebugInfo}
              onBotSettingsClick={handleBotSettingsClick}
            />
          ))}
        </div>
      )}
      
      {state.typingBotIds?.length > 0 && (
        <div className="px-3 py-2">
          <TypingIndicator botIds={state.typingBotIds} />
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
} 