'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { nanoid } from 'nanoid';
import { ChatMessage, ParticipantType } from '@/app/shared/types/chat';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  input: string;
  setInput: (input: string) => void;
  addMessage: (content: string, role: ParticipantType | 'system') => void;
  clearMessages: () => void;
  sendMessage: (message: string) => Promise<void>;
}

interface ChatProviderProps {
  children: ReactNode;
  chatId: string;
  companionId?: string;
  isGroupChat?: boolean;
  initialMessages?: ChatMessage[];
}

const ChatContext = createContext<ChatState | undefined>(undefined);

export const ChatProvider = ({ 
  children, 
  chatId, 
  companionId,
  isGroupChat = false,
  initialMessages = []
}: ChatProviderProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');

  // Add a new message to the chat
  const addMessage = (content: string, senderType: ParticipantType | 'system') => {
    const id = nanoid();
    
    const newMessage: ChatMessage = {
      id,
      chatId,
      senderId: senderType === ParticipantType.USER ? 'user' : senderType === ParticipantType.COMPANION ? companionId || 'system' : 'system',
      senderType: senderType === ParticipantType.USER ? ParticipantType.USER : ParticipantType.COMPANION,
      content,
      createdAt: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  // Clear all messages in the chat
  const clearMessages = () => {
    setMessages([]);
  };

  // Send a message to the API
  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);
      
      // First add the user message to the UI
      addMessage(content, ParticipantType.USER);
      
      // Clear the input
      setInput('');
      
      // Determine which API endpoint to use
      const apiUrl = isGroupChat 
        ? `/api/chats/group/${chatId}/chat` 
        : `/api/chats/individual/${chatId}`;
      
      // Send the message to the API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Get the response as a readable stream
      const data = response.body;
      
      if (!data) {
        throw new Error('No response data');
      }
      
      // Create a reader from the stream
      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedResponse = '';
      
      // Read the stream
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunk = decoder.decode(value);
          accumulatedResponse += chunk;
          
          // For simplicity, we'll just update the message on each chunk
          // In a real implementation, you might want to parse JSON and handle different event types
          if (done) {
            addMessage(accumulatedResponse, ParticipantType.COMPANION);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Sorry, there was an error processing your request.', 'system');
    } finally {
      setIsLoading(false);
    }
  };

  // Provide the chat state and actions
  const chatState: ChatState = {
    messages,
    isLoading,
    input,
    setInput,
    addMessage,
    clearMessages,
    sendMessage
  };

  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatState => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  
  return context;
}; 