import { Suspense } from 'react';
import { getCompanionById } from '@/app/features/companions/utils/companion-service';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ChatButton } from './ChatButton';
import RecentChats from '@/app/features/chat-engine/components/RecentChats';

interface CompanionDetailsPageProps {
  params: {
    companionId: string;
  };
}

export async function generateMetadata(
  { params }: CompanionDetailsPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const companion = await getCompanionById(params.companionId);
  
  if (!companion) {
    return {
      title: 'Companion Not Found | AgentConsult',
      description: 'The requested AI companion could not be found',
    };
  }
  
  // Get parent metadata (e.g., from layout)
  const previousImages = (await parent).openGraph?.images || [];
  
  return {
    title: `${companion.name} | AI Companion | AgentConsult`,
    description: companion.description || `Chat with ${companion.name}, an AI companion on AgentConsult`,
    keywords: `AI, companion, ${companion.name}, chat, virtual assistant, artificial intelligence`,
    openGraph: {
      title: `${companion.name} | AI Companion | AgentConsult`,
      description: companion.description || `Chat with ${companion.name}, an AI companion on AgentConsult`,
      url: `https://agentconsult.ai/companions/${companion.id}`,
      siteName: 'AgentConsult',
      images: companion.src 
        ? [
            {
              url: companion.src,
              width: 300,
              height: 300,
              alt: companion.name,
            },
            ...previousImages,
          ]
        : previousImages,
      locale: 'en_US',
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${companion.name} | AI Companion`,
      description: companion.description || `Chat with ${companion.name}, an AI companion on AgentConsult`,
      images: companion.src ? [companion.src] : [],
    },
  };
}

export default async function CompanionDetailsPage({ params }: CompanionDetailsPageProps) {
  // Fetch companion details (this will be cached)
  const companion = await getCompanionById(params.companionId);
  
  if (!companion) {
    notFound();
  }
  
  // Formatting dates and stats
  const createdDate = formatDistanceToNow(new Date(companion.createdAt), { addSuffix: true });
  const messageCount = companion._count?.messages || 0;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/companions"
        className="text-sm text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        ← Back to Companions
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Companion details */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-start gap-6 mb-6">
            <ServerAvatar
              src={companion.src || '/images/default-avatar.png'}
              alt={companion.name}
              className="w-24 h-24 rounded-full"
            />
            <div>
              <h1 className="text-3xl font-bold">{companion.name}</h1>
              <p className="text-muted-foreground">{companion.description}</p>
              
              <div className="flex gap-4 mt-4">
                <ChatButton companionId={companion.id} />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-2xl font-bold">{messageCount}</p>
              <p className="text-sm text-muted-foreground">Messages</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-2xl font-bold">{createdDate}</p>
              <p className="text-sm text-muted-foreground">Created</p>
            </div>
            {companion.categoryId && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-2xl font-bold">Category</p>
                <p className="text-sm text-muted-foreground">{companion.categoryId}</p>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-card rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">About {companion.name}</h2>
            <p className="text-card-foreground leading-relaxed whitespace-pre-wrap">
              {companion.instructions || 'No additional information available.'}
            </p>
          </div>
        </div>
        
        {/* Sidebar with recent chats */}
        <div>
          <div className="p-6 bg-card rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Recent Conversations</h2>
            {/* Parallel data fetching for recent chats */}
            <Suspense fallback={<div className="h-40 w-full animate-pulse bg-muted rounded-md" />}>
              <RecentChats userId="current-user" limit={5} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
} 