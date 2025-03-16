'use client';

import { useState } from 'react';
import { Message as MessageType } from '../types/companions';
import { Avatar } from "@/app/shared/components/ui/avatar";
import { Button } from "@/app/shared/components/ui/button";
import { Eye, EyeOff } from 'lucide-react';
import DebugInfo from './DebugInfo';

interface MessageProps {
  message: MessageType;
  isLast: boolean;
}

export default function Message({ message, isLast }: MessageProps) {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className={`flex gap-3 ${message.isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8">
        <img src={message.senderAvatar} alt={message.senderName} />
      </Avatar>
      
      <div className={`flex flex-col ${message.isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{message.senderName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <div className={`rounded-lg px-4 py-2 ${
          message.isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <div className="whitespace-pre-wrap">{message.content}</div>
          
          {message.debugInfo && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setShowDebug(!showDebug)}
              >
                {showDebug ? (
                  <EyeOff className="h-3 w-3 mr-1" />
                ) : (
                  <Eye className="h-3 w-3 mr-1" />
                )}
                {showDebug ? 'Hide' : 'Show'} Under the Hood
              </Button>
              <DebugInfo debugInfo={message.debugInfo} isExpanded={showDebug} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 