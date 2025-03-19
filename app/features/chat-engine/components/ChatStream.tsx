'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/app/features/chat-engine/hooks/useChat';
import { Message } from '@/app/shared/components/ui/message';
import { Avatar } from '@/app/shared/components/ui/avatar';
import { Skeleton } from '@/app/shared/components/ui/skeleton';
import { ChatMessage } from '@/app/shared/types/chat';
import { Companion } from '@/app/shared/types/companion';

interface ChatStreamProps {
  chatId: string;
  userId: string;
  initialMessages?: ChatMessage[];
  companion?: Companion;
}

export default function ChatStream({ 
  chatId, 
  userId, 
  initialMessages = [],
  companion
}: ChatStreamProps) {
  // Reference to the message container for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State to track when new messages are being streamed
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamedContent, setCurrentStreamedContent] = useState<string>('');
  
  // Use our chat hook for message management
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage,
    streamingMessage
  } = useChat({
    chatId,
    userId,
    initialMessages,
    onStreamStart: () => {
      setIsStreaming(true);
      setCurrentStreamedContent('');
    },
    onStreamData: (chunk: string) => {
      setCurrentStreamedContent(prev => prev + chunk);
    },
    onStreamEnd: () => {
      setIsStreaming(false);
      setCurrentStreamedContent('');
    }
  });

  // Scroll to bottom when messages change or during streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentStreamedContent]);

  // Handle sending a new message
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Generate a temporary message for currently streaming content
  const streamingMessageObj = isStreaming ? {
    id: 'streaming-message',
    chatId,
    content: currentStreamedContent || 'Thinking...',
    createdAt: new Date(),
    role: 'assistant',
    senderId: companion?.id || 'assistant',
    senderType: 'companion'
  } : null;

  // Combine messages with streaming message if active
  const allMessages = [
    ...messages,
    ...(streamingMessageObj ? [streamingMessageObj] : [])
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages container with overflow scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Actual messages
          <>
            {allMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              allMessages.map((message, index) => (
                <Message
                  key={message.id || `temp-${index}`}
                  message={message}
                  isStreaming={message.id === 'streaming-message'}
                  isUser={message.senderType === 'user'}
                />
              ))
            )}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-2 text-sm text-red-500 bg-red-100 dark:bg-red-900/20 rounded-md mx-4 mb-2">
          Error: {error}
        </div>
      )}

      {/* Message input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const content = formData.get('message') as string;
            handleSendMessage(content);
            e.currentTarget.reset();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            name="message"
            placeholder="Type your message..."
            className="flex-1 py-2 px-4 bg-background rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 