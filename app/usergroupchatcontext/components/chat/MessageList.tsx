'use client';

import React, { useRef, useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { Message } from '../../types';
import { TypingIndicator } from './TypingIndicator';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useProcessingState } from '../../context/ProcessingStateProvider';

interface MessageListProps {
  messages: Message[];
  showDebugInfo?: boolean;
  onBotSettingsClick?: (botId: string) => void;
}

/**
 * MessageList
 * 
 * Renders the list of messages in the chat interface
 * with automatic scrolling to the latest message.
 */
export function MessageList({ 
  messages, 
  showDebugInfo = false,
  onBotSettingsClick
}: MessageListProps) {
  const { state, dispatch } = useGroupChatContext();
  const { state: processingState } = useProcessingState();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);
  
  // Use the passed handler if provided, otherwise use the local one
  const handleBotSettings = (botId: string) => {
    if (onBotSettingsClick) {
      onBotSettingsClick(botId);
    } else {
      dispatch({ type: 'SET_SELECTED_BOT', payload: botId });
    }
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
              onBotSettingsClick={handleBotSettings}
            />
          ))}
        </div>
      )}
      
      {state.typingBotIds?.length > 0 && (
        <div className="px-3 py-2">
          <TypingIndicator
            botIds={state.typingBotIds}
            processingStages={processingState.processingStages}
            activeTools={processingState.activeTools}
          />
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
} 