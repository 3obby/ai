import { Suspense, lazy } from 'react';
import { withAuth } from '@/lib/auth';
import { Metadata } from 'next';
import { Skeleton } from '@/app/shared/components/ui/skeleton'; 

// Lazy loaded components
const RecentChats = lazy(() => 
  import('@/app/features/chat-engine/components/RecentChats')
);

const CompanionList = lazy(() => 
  import('@/app/features/companions/components/CompanionList')
);

const AnalyticsSummary = lazy(() => 
  import('@/app/features/dashboard/components/AnalyticsSummary')
);

const ActivityFeed = lazy(() => 
  import('@/app/features/dashboard/components/ActivityFeed')
);

export const metadata: Metadata = {
  title: 'Dashboard | AgentConsult',
  description: 'Your personalized dashboard with recent chats and companions',
};

export default async function DashboardPage() {
  // Check authentication
  const { userId, isAuthenticated } = await withAuth();
  
  if (!isAuthenticated) {
    // Redirect logic would be handled by withAuth
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-8">
          {/* Analytics summary - prioritized content */}
          <section className="bg-card rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Analytics Summary</h2>
            <Suspense fallback={<AnalyticsSkeleton />}>
              <AnalyticsSummary userId={userId} />
            </Suspense>
          </section>
          
          {/* Recent activity - less critical, lazy loaded */}
          <section className="bg-card rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <Suspense fallback={<ActivitySkeleton />}>
              <ActivityFeed userId={userId} limit={5} />
            </Suspense>
          </section>
          
          {/* Featured companions - less critical, lazy loaded */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Featured Companions</h2>
            <Suspense fallback={<CompanionsListSkeleton />}>
              <CompanionList limit={6} />
            </Suspense>
          </section>
        </div>
        
        {/* Sidebar - 1/3 width on large screens */}
        <div className="space-y-8">
          {/* Recent chats - prioritized sidebar content */}
          <section className="bg-card rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Chats</h2>
            <Suspense fallback={<RecentChatsSkeleton />}>
              <RecentChats userId={userId} limit={5} />
            </Suspense>
          </section>
          
          {/* Quick actions */}
          <section className="bg-card rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionButton
                href="/companions"
                label="Browse Companions"
              />
              <QuickActionButton
                href="/chat/new"
                label="New Chat"
              />
              <QuickActionButton
                href="/group-chat/new"
                label="New Group Chat"
              />
              <QuickActionButton
                href="/settings"
                label="Settings"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Helper components for the dashboard

function QuickActionButton({ href, label }: { href: string; label: string }) {
  return (
    <a 
      href={href}
      className="flex items-center justify-center p-3 bg-primary/10 hover:bg-primary/20 
                rounded-md text-primary font-medium transition-colors"
    >
      {label}
    </a>
  );
}

// Skeleton loaders for suspense fallbacks

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array(3).fill(0).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanionsListSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array(6).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col rounded-xl overflow-hidden border border-dark-700 bg-dark-900">
          <Skeleton className="h-32 w-full" />
          <div className="pt-12 p-4 flex flex-col items-center">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-5/6 mb-1" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentChatsSkeleton() {
  return (
    <div className="space-y-3">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
} 