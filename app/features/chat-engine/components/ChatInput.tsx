'use client';

import { useState, FormEvent } from 'react';
import { SendIcon } from 'lucide-react';
import { Button } from '@/app/shared/components/ui/button';
import { useChat } from '@/app/features/chat-engine/hooks/useChat';
import { useParams } from 'next/navigation';

interface ChatInputProps {
  disabled?: boolean;
  placeholder?: string;
  onSend?: (message: string) => Promise<void>;
}

export default function ChatInput({
  disabled = false,
  placeholder = 'Type your message...',
  onSend
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const params = useParams();
  const chatId = params?.chatId as string;

  // If no custom onSend is provided, use the default chat hook
  const { sendMessage: defaultSendMessage } = useChat({
    chatId,
    userId: 'current', // This will be replaced with the actual user ID in the hook
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || disabled || isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Use provided onSend function or default from the hook
      if (onSend) {
        await onSend(inputValue);
      } else if (defaultSendMessage) {
        await defaultSendMessage(inputValue);
      }
      
      // Clear input after sending
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border-t border-border">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className="flex-1 py-2 px-4 bg-background rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />
        <Button 
          type="submit" 
          disabled={disabled || isSubmitting || !inputValue.trim()}
          className="bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <SendIcon className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </div>
  );
} 