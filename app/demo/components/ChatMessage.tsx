'use client';

import { useState } from 'react';
import { Message } from '../types/companions';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { Card, CardContent, CardFooter } from '@/app/shared/components/ui/card';
import { Button } from '@/app/shared/components/ui/button';
import { ChevronDown, ChevronUp, Sparkles, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/app/shared/components/ui/badge';
import AudioPlayer from './AudioPlayer';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
  // Format the time
  const formattedTime = formatDistanceToNow(new Date(message.timestamp), {
    addSuffix: true,
  });
  
  return (
    <div className={`flex mb-4 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      <Card 
        className={`max-w-3xl ${
          message.isUser ? 'bg-primary/10' : 'bg-secondary/10'
        } border-0 shadow-sm`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {!message.isUser && (
              <ServerAvatar
                src={message.senderAvatar}
                alt={message.senderName}
                className="h-8 w-8"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">
                  {message.senderName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formattedTime}
                </span>
                {message.messageType === 'audio' && (
                  <Badge variant="secondary" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Voice
                  </Badge>
                )}
                {message.messageType === 'tool_call' && (
                  <Badge variant="secondary" className="text-xs bg-primary/10">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Used tools
                  </Badge>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              
              {/* Audio Player for AI responses */}
              {!message.isUser && (
                <div className="mt-2">
                  <AudioPlayer 
                    companionId={message.senderId}
                    text={message.content}
                    messageId={message.id}
                  />
                </div>
              )}
            </div>
            {message.isUser && (
              <ServerAvatar
                src={message.senderAvatar}
                alt={message.senderName}
                className="h-8 w-8"
              />
            )}
          </div>
        </CardContent>
        
        {!message.isUser && message.debugInfo && (
          <CardFooter className="px-4 py-2 flex-col items-start">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleDebugInfo}
              className="text-xs flex items-center gap-1 text-muted-foreground"
            >
              {showDebugInfo ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show under the hood
                </>
              )}
            </Button>
            
            {showDebugInfo && (
              <div className="mt-2 text-xs bg-muted/50 p-3 rounded-md w-full">
                <h4 className="font-semibold mb-1">Response Details:</h4>
                {message.messageType === 'tool_call' && message.debugInfo?.toolsCalled && (
                  <div className="mb-2">
                    <h5 className="font-medium text-xs text-primary">Tools Used:</h5>
                    <ul className="list-disc pl-4 mt-1 mb-2 space-y-1">
                      {message.debugInfo.toolsCalled.originalToolCalls?.map((tool: any, index: number) => (
                        <li key={index} className="text-xs">
                          <span className="font-medium">{tool.function.name}</span>
                          <span className="text-muted-foreground"> with params: </span>
                          <code className="bg-muted/70 px-1 rounded text-xs">
                            {tool.function.arguments.substring(0, 30)}
                            {tool.function.arguments.length > 30 ? '...' : ''}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                  {JSON.stringify(message.debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 