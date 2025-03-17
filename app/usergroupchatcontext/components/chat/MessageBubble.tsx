'use client';

import React, { useState } from 'react';
import { Message } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
  showDebug?: boolean;
}

export function MessageBubble({ message, isUser, showDebug = false }: MessageBubbleProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Format timestamp
  const formattedTime = formatDistanceToNow(new Date(message.timestamp), { 
    addSuffix: true,
    includeSeconds: true
  });
  
  // Determine message type styling
  const isSystemMessage = message.role === 'system';
  const isToolResult = message.type === 'tool_result';
  const isVoiceMessage = message.type === 'voice';
  
  return (
    <div className={cn(
      "flex flex-col",
      isUser ? "items-end" : "items-start",
      isSystemMessage && "items-center w-full"
    )}>
      {/* Message header with sender name */}
      {!isUser && !isSystemMessage && (
        <div className="flex items-center mb-1 ml-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium mr-2">
            {message.sender.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium">{message.sender}</span>
        </div>
      )}
      
      {/* Message bubble */}
      <div className={cn(
        "px-4 py-2 rounded-lg max-w-[80%]",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-none" 
          : isSystemMessage
            ? "bg-muted text-muted-foreground w-full text-center text-sm"
            : isToolResult
              ? "bg-secondary text-secondary-foreground border"
              : "bg-card text-card-foreground border rounded-tl-none",
        isVoiceMessage && "border-blue-500 border"
      )}>
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        {/* Voice indicator */}
        {isVoiceMessage && (
          <div className="flex items-center mt-1 text-xs text-muted-foreground">
            <span>🎤 Voice message</span>
          </div>
        )}
        
        {/* Tool result details */}
        {isToolResult && message.metadata?.toolResults && (
          <div className="mt-1 text-xs text-muted-foreground">
            <span>🔧 Tool: {message.metadata.toolResults[0]?.toolName}</span>
          </div>
        )}
        
        {/* Timestamp */}
        <div className="mt-1 text-xs text-right opacity-70">
          {formattedTime}
        </div>
      </div>
      
      {/* Debug information */}
      {showDebug && message.metadata && (
        <div className="mt-1 w-full">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center text-xs text-muted-foreground hover:text-foreground"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show details
              </>
            )}
          </button>
          
          {showDetails && (
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
              {JSON.stringify(message.metadata, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
} 