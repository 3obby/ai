import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Companions | AgentConsult',
  description: 'Discover and interact with AI companions tailored to your needs',
  keywords: 'AI, companions, chat, virtual assistant, artificial intelligence',
  openGraph: {
    title: 'AI Companions | AgentConsult',
    description: 'Discover and interact with AI companions tailored to your needs',
    url: 'https://agentconsult.ai/companions',
    siteName: 'AgentConsult',
    images: [
      {
        url: '/images/companions-og.jpg',
        width: 1200,
        height: 630,
        alt: 'AI Companions',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Companions | AgentConsult',
    description: 'Discover and interact with AI companions tailored to your needs',
    images: ['/images/companions-og.jpg'],
  },
};

export default function CompanionsLayout({
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