'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Message } from '../../types/messages';

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const timestamp = typeof message.timestamp === 'string' 
    ? new Date(message.timestamp) 
    : message.timestamp;
  
  const formattedTime = formatDistanceToNow(timestamp, { addSuffix: true });

  // System message styling
  if (isSystem) {
    return (
      <div className="py-2 px-4 mx-auto max-w-md text-center text-sm text-muted-foreground bg-muted rounded-md">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        <div 
          className={`py-2 px-4 rounded-2xl ${
            isUser 
              ? 'bg-primary text-primary-foreground rounded-tr-none' 
              : 'bg-secondary text-secondary-foreground rounded-tl-none'
          }`}
        >
          {!isUser && (
            <div className="font-semibold mb-1">{message.senderName}</div>
          )}
          <div>{message.content}</div>
          
          {/* Tool results would go here if message has them */}
          {message.metadata?.toolResults && message.metadata.toolResults.length > 0 && (
            <div className="mt-2 pt-2 border-t border-t-muted-foreground/30 text-sm">
              <div className="font-semibold">Tool Results:</div>
              {message.metadata.toolResults.map((result, index) => (
                <div key={index} className="mt-1">
                  <span className="opacity-70">{result.toolName}:</span> {JSON.stringify(result.result)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className="text-xs text-muted-foreground mt-1">
          {formattedTime}
        </div>
      </div>
    </div>
  );
} 