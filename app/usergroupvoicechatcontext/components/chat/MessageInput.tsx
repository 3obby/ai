'use client';

import { useState, useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { OpenAIVoiceButton } from './OpenAIVoiceButton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MessageInputProps {
  className?: string;
  placeholder?: string;
}

export function MessageInput({ className, placeholder = "Type a message..." }: MessageInputProps) {
  const { sendMessage, isProcessing } = useGroupChat();
  const [message, setMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSendMessage = () => {
    if (message.trim() && !isProcessing) {
      sendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceTranscription = (transcript: string) => {
    if (transcript) {
      setMessage(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  };

  return (
    <div className={cn("relative flex items-center space-x-2", className)}>
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isProcessing}
          className="min-h-[40px] w-full resize-none rounded-md border border-input bg-background p-3 pr-12 text-sm focus-visible:ring-1 focus-visible:ring-offset-1 disabled:opacity-50"
          rows={1}
        />
      </div>
      
      <div className="flex shrink-0 space-x-2">
        <OpenAIVoiceButton 
          onTranscriptionComplete={handleVoiceTranscription}
          disabled={isProcessing}
        />
        
        <Button
          type="button"
          size="icon"
          onClick={handleSendMessage}
          disabled={!message.trim() || isProcessing}
          aria-label="Send message"
          className={cn(
            "h-10 w-10 rounded-full shrink-0",
            !message.trim() && "opacity-50"
          )}
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
} 