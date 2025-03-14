'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/shared/components/ui/button';
import { MessageSquare } from 'lucide-react';
import axios from 'axios';

interface ChatButtonProps {
  companionId: string;
}

export function ChatButton({ companionId }: ChatButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const startChat = async () => {
    try {
      setIsLoading(true);
      
      // Create an individual chat with this companion
      const response = await axios.post('/api/chats/individual', {
        companionId
      });
      
      // Navigate to the chat page
      if (response.data && response.data.id) {
        router.push(`/chat/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={startChat}
      disabled={isLoading}
      className="gap-2"
    >
      <MessageSquare className="h-4 w-4" />
      Start Chat
    </Button>
  );
} 