'use client';

import { useState, useRef } from "react";
import { Button } from "@/app/shared/components/ui/button";
import { Input } from "@/app/shared/components/ui/input";
import { ScrollArea } from "@/app/shared/components/ui/scroll-area";
import { Skeleton } from "@/app/shared/components/ui/skeleton";
import { Badge } from "@/app/shared/components/ui/badge";
import { RefreshCw, Send, UserIcon } from "lucide-react";
import { TbMicrophone, TbMicrophoneOff } from "react-icons/tb";

import { Message, Companion } from "../../types/companions";
import ChatMessage from "../ChatMessage";
import AudioWaveform from "../AudioWaveform";

interface ChatContainerProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  isSending: boolean;
  isRecording: boolean;
  isStreaming: boolean;
  isConnectingWebRTC: boolean;
  interimTranscript: string;
  typingCompanions: string[];
  companions: Companion[];
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  sendMessage: () => Promise<void>;
  handleMicButtonClick: () => void;
  onCompanionClick?: (companionId: string) => void;
}

export default function ChatContainer({
  messages,
  inputValue,
  setInputValue,
  isLoading,
  isSending,
  isRecording,
  isStreaming,
  isConnectingWebRTC,
  interimTranscript,
  typingCompanions,
  companions,
  mediaStreamRef,
  handleKeyDown,
  sendMessage,
  handleMicButtonClick,
  onCompanionClick
}: ChatContainerProps) {
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Debug display of messages and transcript */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-slate-900 text-gray-300 text-xs mb-2 rounded-md">
          <details>
            <summary className="cursor-pointer">Debug Info</summary>
            <div className="p-2 mt-2 bg-slate-800 rounded-md overflow-auto max-h-36">
              <div>Interim Transcript: "{interimTranscript}"</div>
              <div className="mt-1">Messages ({messages.length}):</div>
              <pre>{JSON.stringify(messages, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
      
      <ScrollArea className="flex-1 pr-4">
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              companions={companions}
              onCompanionClick={onCompanionClick}
            />
          ))}
          
          {/* Only show connecting status when connecting, not streaming */}
          {isConnectingWebRTC && (
            <div className="flex items-start gap-3 mt-4">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <div className="flex gap-2 items-center">
                  <span className="font-semibold">You</span>
                  <Badge variant="secondary" className="px-1 py-0 text-xs">
                    Connecting...
                  </Badge>
                </div>
                <div className="prose dark:prose-invert">
                  <p className="text-muted-foreground italic">Establishing secure connection...</p>
                </div>
              </div>
            </div>
          )}
          
          {typingCompanions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {typingCompanions.map(id => {
                const companion = companions.find(c => c.id === id);
                return companion ? (
                  <div key={id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <span>{companion.name} is typing...</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="pt-4 border-t mt-auto">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || isRecording || isStreaming}
            className="flex-1"
          />
          
          <Button 
            onClick={handleMicButtonClick}
            disabled={isSending}
            variant={(isRecording || isStreaming) ? "destructive" : "outline"}
            className="relative overflow-hidden"
            title={(isRecording || isStreaming) ? "Stop recording" : "Record audio message"}
            data-recording={isRecording}
            data-streaming={isStreaming}
          >
            {(isRecording || isStreaming) && (
              <div className="absolute inset-0 w-full h-full z-0">
                <AudioWaveform
                  isRecording={true}
                  mediaStream={mediaStreamRef.current}
                />
              </div>
            )}
            
            <div className="relative z-10">
              {(isRecording || isStreaming) ? (
                <TbMicrophoneOff className="h-4 w-4" />
              ) : (
                <TbMicrophone className="h-4 w-4" />
              )}
            </div>
            
            {(isRecording || isStreaming) && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full animate-pulse z-20" />
            )}
            <span className="sr-only">{(isRecording || isStreaming) ? "Stop recording" : "Record audio"}</span>
          </Button>
          
          <Button onClick={sendMessage} disabled={!inputValue.trim() || isSending || isRecording || isStreaming}>
            {isSending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </>
  );
} 