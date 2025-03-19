'use client';

import { ChatType } from '@/app/shared/types/chat';
import ChatWithSuspense from './ChatWithSuspense';

export default function ChatClientWrapper({ userId }: { userId: string }) {
  return (
    <ChatWithSuspense userId={userId} chatType={ChatType.INDIVIDUAL} />
  );
} 