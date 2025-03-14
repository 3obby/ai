'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/app/shared/types/chat';
import axios from 'axios';
import { useData } from '@/app/shared/hooks/useData';

interface UseChatOptions {
  chatId: string;
  userId: string;
  initialMessages?: ChatMessage[];
  onStreamStart?: () => void;
  onStreamData?: (chunk: string) => void;
  onStreamEnd?: () => void;
}

interface UseChatResult {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  streamingMessage: boolean;
}

export function useChat({
  chatId,
  userId,
  initialMessages = [],
  onStreamStart,
  onStreamData,
  onStreamEnd,
}: UseChatOptions): UseChatResult {
  // Use our data hook to fetch initial messages
  const {
    data: fetchedMessages,
    isLoading,
    error: fetchError,
    mutate
  } = useData<ChatMessage[]>(
    'chat-messages',
    chatId,
    `/api/chats/${chatId}/messages?userId=${userId}`,
    {
      initialData: initialMessages,
      revalidateOnMount: true
    }
  );

  // State for messages and errors
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState(false);

  // Update messages when fetched messages change
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  // Set error when fetch error occurs
  useEffect(() => {
    if (fetchError) {
      setError(String(fetchError));
    }
  }, [fetchError]);

  // Send a message with streaming response
  const sendMessage = useCallback(async (content: string) => {
    try {
      setError(null);
      
      // Add user message immediately for responsive UI
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chatId,
        content,
        createdAt: new Date(),
        role: 'user',
        senderId: userId,
        senderType: 'user'
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Start streaming process
      setStreamingMessage(true);
      onStreamStart?.();
      
      // Use fetch for streaming support instead of axios
      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message: content
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      
      // Read the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode and process the chunk
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        
        // Notify about new chunk
        onStreamData?.(chunk);
      }
      
      // Create the final assistant message
      const assistantMessage: ChatMessage = {
        id: `response-${Date.now()}`,
        chatId,
        content: accumulatedContent,
        createdAt: new Date(),
        role: 'assistant',
        senderId: 'assistant', // Will be replaced with actual ID from server
        senderType: 'companion'
      };
      
      // Update messages with the complete response
      setMessages(prev => [...prev, assistantMessage]);
      
      // Refresh messages from server to get proper IDs and metadata
      mutate();
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while sending the message');
    } finally {
      setStreamingMessage(false);
      onStreamEnd?.();
    }
  }, [chatId, userId, onStreamStart, onStreamData, onStreamEnd, mutate]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    streamingMessage
  };
} 