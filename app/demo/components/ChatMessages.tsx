'use client';

import { ScrollArea } from "@/app/shared/components/ui/scroll-area";
import { Message, Companion } from "../types/companions";
import ChatMessage from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { TranscriptionStatus } from "./TranscriptionStatus";

interface ChatMessagesProps {
  messages: Message[];
  companions: Companion[];
  typingCompanions: string[];
  isStreaming: boolean;
  isConnectingWebRTC: boolean;
  interimTranscript: string;
  onCompanionClick?: (companionId: string) => void;
}

export function ChatMessages({
  messages,
  companions,
  typingCompanions,
  isStreaming,
  isConnectingWebRTC,
  interimTranscript,
  onCompanionClick
}: ChatMessagesProps) {
  return (
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
        
        {/* Show transcription status when streaming */}
        {isStreaming && (
          <TranscriptionStatus
            isConnecting={isConnectingWebRTC}
            transcript={interimTranscript}
          />
        )}
        
        {/* Show typing indicators */}
        {typingCompanions.length > 0 && (
          <TypingIndicator
            companions={companions}
            typingCompanionIds={typingCompanions}
          />
        )}
      </div>
    </ScrollArea>
  );
} 