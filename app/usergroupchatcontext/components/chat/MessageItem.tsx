'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Message } from '../../types/messages';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  showTimestamp?: boolean;
  showAvatar?: boolean;
  showDebugInfo?: boolean;
}

export function MessageItem({ 
  message, 
  showTimestamp = true, 
  showAvatar = true,
  showDebugInfo = false 
}: MessageItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isUser = message.sender === 'user';
  const timestamp = new Date(message.timestamp);
  
  // Only show timeAgo if timestamp is valid and not too far in the past
  // This prevents the "55 years ago" issue with Unix epoch or very old dates
  const timeAgo = timestamp.getTime() > 1000000000000 
    ? formatDistanceToNow(timestamp, { addSuffix: true })
    : '';

  // Tool results
  const toolResults = message.metadata?.toolResults || [];
  const hasToolResults = toolResults.length > 0;
  
  return (
    <div className={`flex w-full py-1.5 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {showAvatar && !isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs mr-1.5 mt-1 flex-shrink-0">
          {message.senderName?.charAt(0) || 'A'}
        </div>
      )}
      
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && message.senderName && (
          <div className="text-xs font-medium text-muted-foreground mb-0.5">
            {message.senderName}
          </div>
        )}
        
        <div className={`px-2.5 py-1.5 rounded-lg ${
          isUser 
            ? 'bg-primary text-primary-foreground rounded-br-sm' 
            : 'bg-muted text-foreground rounded-bl-sm'
        }`}>
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        </div>
        
        {showTimestamp && timeAgo && (
          <div className="text-[10px] text-muted-foreground mt-0.5 px-1">
            {timeAgo}
          </div>
        )}
        
        {hasToolResults && (
          <div className="mt-1">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-xs text-muted-foreground hover:text-primary px-1"
            >
              {showDetails ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {toolResults.length} tool{toolResults.length !== 1 ? 's' : ''} used
            </button>
            
            {showDetails && (
              <div className="mt-1 bg-muted/20 rounded p-1.5 text-xs text-muted-foreground">
                {toolResults.map((tool, index) => (
                  <div key={index} className="mb-1 last:mb-0">
                    <div className="font-medium">{tool.toolName}</div>
                    <div className="truncate">{typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result).slice(0, 100) + '...'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 