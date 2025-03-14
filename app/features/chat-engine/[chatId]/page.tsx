import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChatById } from '@/app/features/chat-engine/utils/chat-service';
import ChatHeader from '@/app/features/chat-engine/components/ChatHeader';
import ChatStream from '@/app/features/chat-engine/components/ChatStream';
import { withAuth } from '@/lib/auth';
import { ChatType } from '@/app/shared/types/chat';
import { Skeleton } from '@/app/shared/components/ui/skeleton';

interface ChatPageProps {
  params: {
    chatId: string;
  };
}

export async function generateMetadata(
  { params }: ChatPageProps,
): Promise<Metadata> {
  const chat = await getChatById(params.chatId);

  if (!chat) {
    return {
      title: 'Chat Not Found',
      description: 'The requested chat could not be found.',
    };
  }

  return {
    title: `${chat.name} | Chat`,
    description: `Chat with ${chat.name}`,
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  // Verify authentication
  const { userId, isAuthenticated } = await withAuth();
  
  if (!userId) {
    return notFound();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Suspense boundary */}
      <Suspense fallback={<ChatHeaderSkeleton />}>
        <ChatHeaderSection chatId={params.chatId} />
      </Suspense>
      
      {/* Chat content area with Suspense boundary */}
      <Suspense fallback={<ChatStreamSkeleton />}>
        <ChatStream 
          chatId={params.chatId} 
          userId={userId}
        />
      </Suspense>
    </div>
  );
}

// Separate component to handle data fetching for the header
async function ChatHeaderSection({ chatId }: { chatId: string }) {
  const chat = await getChatById(chatId);
  
  if (!chat) {
    return notFound();
  }
  
  return (
    <ChatHeader 
      chatId={chatId}
      chatType={chat.type}
      title={chat.name}
      participantCount={chat.participants?.length || 0}
    />
  );
}

// Skeleton loaders for suspense fallbacks
function ChatHeaderSkeleton() {
  return (
    <div className="border-b border-border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

function ChatStreamSkeleton() {
  return (
    <div className="flex-1 overflow-hidden p-4">
      <div className="space-y-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 