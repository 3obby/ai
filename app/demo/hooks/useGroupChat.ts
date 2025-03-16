import { useState, useCallback } from 'react';
import { Message } from '../types/companions';

export function useGroupChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingCompanions, setTypingCompanions] = useState<string[]>([]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    
    setIsSending(true);
    try {
      const newMessage: Message = {
        id: `user-${Date.now()}`,
        content: inputValue.trim(),
        senderId: "user",
        senderName: "You",
        senderAvatar: "/images/user-icon.png",
        timestamp: new Date(),
        isUser: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputValue("");
      
      // Handle AI responses here
      
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const restartChat = useCallback(() => {
    setMessages([{
      id: `system-welcome-${Date.now()}`,
      content: "Welcome to the AI group chat demo! Ask a question and the AIs will respond based on their unique personalities and expertise.",
      senderId: "system",
      senderName: "System",
      senderAvatar: "/images/system-icon.png",
      timestamp: new Date(),
      isUser: false
    }]);
    setIsLoading(false);
  }, []);

  return {
    messages,
    inputValue,
    isLoading,
    isSending,
    typingCompanions,
    setMessages,
    setInputValue,
    setIsLoading,
    setIsSending,
    setTypingCompanions,
    sendMessage,
    handleKeyDown,
    restartChat
  };
} 