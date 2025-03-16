import React from 'react';

export const metadata = {
  title: 'Mobile AI Toolbox Chat',
  description: 'A minimal, mobile-first group chat interface with multiple AI bots',
};

export default function GroupChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background">
      {children}
    </div>
  );
} 