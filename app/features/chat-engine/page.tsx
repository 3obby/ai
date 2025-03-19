import { Suspense } from 'react';
import { Skeleton } from '@/app/shared/components/ui/skeleton';
import { withAuth } from '@/lib/auth';
import ChatClientWrapper from './components/ChatClientWrapper';

// Metadata for the page
export const metadata = {
  title: 'Chat | AI Companion',
  description: 'Chat with your AI companion using advanced streaming and Suspense for optimal performance.',
};

// Page component that handles auth and wraps the chat
async function ChatPage() {
  // Get the user ID from the auth function
  const { userId } = await withAuth();

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="p-6 bg-card rounded-lg shadow-lg">
          <h1 className="text-xl font-bold mb-4">Authentication Required</h1>
          <p>Please sign in to access the chat feature.</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => window.location.href = '/login'}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Suspense fallback={<div className="p-4">Loading chat environment...</div>}>
        <ChatClientWrapper userId={userId} />
      </Suspense>
    </div>
  );
}

// Export the page
export default ChatPage; 