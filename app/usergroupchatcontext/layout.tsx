import React from 'react';
import './mobile.css';

export const metadata = {
  title: 'Group Chat Context',
  description: 'A flexible system for managing multi-bot conversations',
};

export default function GroupChatContextLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background">
      {children}
    </div>
  );
} 