'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ChatContainerProps {
  children: ReactNode;
  className?: string;
}

export function ChatContainer({ children, className }: ChatContainerProps) {
  return (
    <div className={cn("flex flex-col h-full overflow-y-auto", className)}>
      {children}
    </div>
  );
} 