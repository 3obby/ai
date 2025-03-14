import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Chat Engine | AgentConsult',
  description: 'Engage in intelligent conversations with our advanced AI chat engine',
  keywords: 'AI, chat, conversation, artificial intelligence, messaging',
  openGraph: {
    title: 'AI Chat Engine | AgentConsult',
    description: 'Engage in intelligent conversations with our advanced AI chat engine',
    url: 'https://agentconsult.ai/chat',
    siteName: 'AgentConsult',
    images: [
      {
        url: '/images/chat-engine-og.jpg',
        width: 1200,
        height: 630,
        alt: 'AI Chat Engine',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Chat Engine | AgentConsult',
    description: 'Engage in intelligent conversations with our advanced AI chat engine',
    images: ['/images/chat-engine-og.jpg'],
  },
};

export default function ChatEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
} 