'use client';

import { Button } from "@/app/shared/components/ui/button";
import { Input } from "@/app/shared/components/ui/input";
import { RefreshCw, Send } from "lucide-react";
import { TbMicrophone, TbMicrophoneOff } from "react-icons/tb";
import AudioWaveform from "./AudioWaveform";

interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  isSending: boolean;
  isRecording: boolean;
  isStreaming: boolean;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  sendMessage: () => Promise<void>;
  handleMicButtonClick: () => void;
}

export function ChatInput({
  inputValue,
  setInputValue,
  isSending,
  isRecording,
  isStreaming,
  mediaStreamRef,
  handleKeyDown,
  sendMessage,
  handleMicButtonClick
}: ChatInputProps) {
  return (
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
  );
} 