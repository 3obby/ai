'use client';

import React, { Suspense } from 'react';
import { Skeleton } from '@/app/shared/components/ui/skeleton';
import ChatHeader from './ChatHeader';
import ChatStream from './ChatStream';
import ChatInput from './ChatInput';
import { useParams } from 'next/navigation';
import { ChatType } from '@/app/shared/types/chat';

// Skeleton components for loading states
const ChatHeaderSkeleton = () => (
  <div className="p-4 border-b border-border flex items-center gap-3">
    <Skeleton className="h-8 w-8 rounded-full" />
    <Skeleton className="h-5 w-40" />
  </div>
);

const ChatStreamSkeleton = () => (
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
);

const ChatInputSkeleton = () => (
  <div className="p-4 border-t border-border">
    <Skeleton className="h-10 w-full rounded-md" />
  </div>
);

// Wrapper components for Suspense
const ChatHeaderWithSuspense = ({ chatId, chatType }: { chatId: string, chatType: ChatType }) => {
  return (
    <Suspense fallback={<ChatHeaderSkeleton />}>
      <ChatHeader 
        chatId={chatId} 
        chatType={chatType} 
        title="Loading..." 
        participantCount={0} 
      />
    </Suspense>
  );
};

const ChatStreamWithSuspense = ({ chatId, userId }: { chatId: string, userId: string }) => {
  return (
    <Suspense fallback={<ChatStreamSkeleton />}>
      <ChatStream 
        chatId={chatId} 
        userId={userId} 
      />
    </Suspense>
  );
};

const ChatInputWithSuspense = () => {
  return (
    <Suspense fallback={<ChatInputSkeleton />}>
      <ChatInput />
    </Suspense>
  );
};

// Main component
export default function ChatWithSuspense({ 
  userId,
  chatType = ChatType.INDIVIDUAL
}: { 
  userId: string,
  chatType?: ChatType
}) {
  const params = useParams();
  const chatId = params?.chatId as string;

  if (!chatId) {
    return <div className="p-4">Chat not found</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeaderWithSuspense chatId={chatId} chatType={chatType} />
      <ChatStreamWithSuspense chatId={chatId} userId={userId} />
      <ChatInputWithSuspense />
    </div>
  );
} 