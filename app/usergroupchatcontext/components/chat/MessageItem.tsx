'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Message, ProcessingMetadata, ToolResultMetadata } from '../../types/messages';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { ProcessingInfo } from '../debug/ProcessingInfo';
import { DebugInfo } from '../debug/DebugInfo';

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

  // Extract metadata
  const toolResults = message.metadata?.toolResults || [];
  const hasToolResults = toolResults.length > 0;
  const hasProcessingMetadata = !!message.metadata?.processingInfo;
  const showSignalChain = hasToolResults || hasProcessingMetadata;
  
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
        
        {showSignalChain && (
          <div className="mt-1 w-full">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-xs text-muted-foreground hover:text-primary px-1"
            >
              {showDetails ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showDetails ? 'Hide' : 'Show'} signal chain
              {hasToolResults && ` (${toolResults.length} tool${toolResults.length !== 1 ? 's' : ''})`}
              {hasProcessingMetadata && hasToolResults && ', includes processing'}
              {hasProcessingMetadata && !hasToolResults && ' (processing details)'}
            </button>
            
            {showDetails && (
              <div className="mt-2 space-y-2 overflow-hidden">
                {/* Processing workflow visualization */}
                <div className="flex items-center justify-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center px-3 py-1 bg-muted/10 rounded-lg">
                    <span>User Input</span>
                    <span className="text-center">↓</span>
                    {message.metadata?.processingInfo?.preProcessed && (
                      <>
                        <span>Pre-Processing</span>
                        <span className="text-center">↓</span>
                      </>
                    )}
                    {hasToolResults && (
                      <>
                        <span>Tool Calling</span>
                        <span className="text-center">↓</span>
                      </>
                    )}
                    {message.metadata?.processingInfo?.postProcessed && (
                      <>
                        <span>Post-Processing</span>
                        <span className="text-center">↓</span>
                      </>
                    )}
                    <span>Bot Response</span>
                  </div>
                </div>
                
                {/* Original content if pre-processed */}
                {message.metadata?.processingInfo?.originalContent && (
                  <div className="bg-muted/10 rounded p-2 text-xs text-muted-foreground">
                    <div className="font-medium mb-1">Original Input:</div>
                    <div className="whitespace-pre-wrap">
                      {message.metadata.processingInfo.originalContent}
                    </div>
                  </div>
                )}
                
                {/* Pre-processing results if applicable */}
                {message.metadata?.processingInfo?.preProcessed && message.metadata?.processingInfo?.modifiedContent && (
                  <div className="bg-muted/10 rounded p-2 text-xs text-muted-foreground">
                    <div className="font-medium mb-1">After Pre-Processing:</div>
                    <div className="whitespace-pre-wrap">
                      {message.metadata.processingInfo.modifiedContent}
                    </div>
                  </div>
                )}
                
                {/* Tool results */}
                {hasToolResults && (
                  <div className="bg-muted/10 rounded p-2 text-xs text-muted-foreground">
                    <div className="font-medium mb-1">Tool Execution:</div>
                    <div className="space-y-2">
                      {toolResults.map((tool, index) => (
                        <div key={index} className="border-t border-muted/20 pt-2 first:border-0 first:pt-0">
                          <div className="font-medium">{tool.toolName}</div>
                          <div className="mt-1 grid grid-cols-[auto,1fr] gap-x-2 gap-y-1">
                            <div className="text-muted-foreground">Result:</div>
                            <div className="font-mono text-[10px] bg-muted/30 p-1 rounded overflow-x-auto">
                              {typeof tool.result === 'string' 
                                ? tool.result 
                                : JSON.stringify(tool.result, null, 2)}
                            </div>
                            {tool.error && (
                              <>
                                <div className="text-muted-foreground">Error:</div>
                                <div className="font-mono text-[10px] bg-destructive/10 text-destructive p-1 rounded overflow-x-auto">
                                  {tool.error}
                                </div>
                              </>
                            )}
                            {tool.executionTime && (
                              <>
                                <div className="text-muted-foreground">Time:</div>
                                <div>{tool.executionTime.toFixed(2)}ms</div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Post-processing results if applicable */}
                {message.metadata?.processingInfo?.postProcessed && (
                  <div className="bg-muted/10 rounded p-2 text-xs text-muted-foreground">
                    <div className="font-medium mb-1">After Post-Processing:</div>
                    <div className="whitespace-pre-wrap">
                      {message.content} {/* The final content is the message content */}
                    </div>
                  </div>
                )}
                
                {/* Processing metadata */}
                {message.metadata?.processingInfo && showDebugInfo && (
                  <div className="mt-2">
                    <ProcessingInfo metadata={message.metadata.processingInfo} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 