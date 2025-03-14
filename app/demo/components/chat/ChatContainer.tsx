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
  handleMicButtonClick
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
      <ScrollArea className="flex-1 pr-4">
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {/* Show streaming status and transcript if streaming */}
          {(isStreaming || isConnectingWebRTC) && (
            <div className="flex items-start gap-3 mt-4">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow">
                {isConnectingWebRTC ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UserIcon className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <div className="flex gap-2 items-center">
                  <span className="font-semibold">You</span>
                  <Badge variant="secondary" className="px-1 py-0 text-xs">
                    {isConnectingWebRTC ? "Connecting..." : "Listening..."}
                  </Badge>
                </div>
                <div className="prose dark:prose-invert">
                  {isConnectingWebRTC ? (
                    <p className="text-muted-foreground italic">Establishing secure connection...</p>
                  ) : interimTranscript ? (
                    <p>{interimTranscript}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Listening to you speak...</p>
                  )}
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
        {/* Audio waveform */}
        <AudioWaveform
          isRecording={isRecording || isStreaming}
          mediaStream={mediaStreamRef.current}
          className="mb-2"
        />
        
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
            className="relative"
            title={(isRecording || isStreaming) ? "Stop recording" : "Record audio message"}
            data-recording={isRecording}
            data-streaming={isStreaming}
          >
            {(isRecording || isStreaming) ? (
              <TbMicrophoneOff className="h-4 w-4" />
            ) : (
              <TbMicrophone className="h-4 w-4" />
            )}
            {(isRecording || isStreaming) && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full animate-pulse" />
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