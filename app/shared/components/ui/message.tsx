'use client';

import { ChatMessage } from '@/app/shared/types/chat';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { formatDistanceToNow } from 'date-fns';
import { memo } from 'react';
import { motion } from 'framer-motion';

interface MessageProps {
  message: ChatMessage;
  isUser?: boolean;
  isStreaming?: boolean;
}

// Typing animation for streaming messages
const TypingAnimation = () => {
  return (
    <div className="flex items-center space-x-1 h-4">
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-current"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
      />
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-current"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
      />
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-current"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
      />
    </div>
  );
};

export const Message = memo(function Message({ 
  message, 
  isUser = false,
  isStreaming = false
}: MessageProps) {
  const { content, createdAt, role } = message;
  const formattedTime = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  // Choose avatar and styling based on message role
  const avatarSrc = isUser 
    ? '/images/user-avatar.png'  // Default user avatar
    : '/images/assistant-avatar.png'; // Default assistant avatar
  
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <ServerAvatar
        src={avatarSrc}
        alt={isUser ? 'User' : 'Assistant'}
        className="w-10 h-10"
      />
      
      {/* Message content */}
      <div className={`
        flex-1 max-w-[85%] rounded-lg p-4
        ${isUser 
          ? 'bg-primary/10 text-primary-foreground' 
          : 'bg-muted/50 text-foreground'
        }
      `}>
        {/* Message header */}
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-sm">
            {isUser ? 'You' : role === 'assistant' ? 'Assistant' : 'Unknown'}
          </div>
          <div className="text-xs text-muted-foreground">
            {isStreaming ? (
              <TypingAnimation />
            ) : (
              formattedTime
            )}
          </div>
        </div>
        
        {/* Message body */}
        <div className="whitespace-pre-wrap text-sm">
          {content || <span className="text-muted-foreground italic">Empty message</span>}
        </div>
      </div>
    </div>
  );
}); 