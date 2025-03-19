'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChatType } from '@/app/shared/types/chat';
import { ArrowLeft, MoreHorizontal, Settings, UserPlus, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/shared/components/ui/dropdown-menu';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  chatId: string;
  chatType: ChatType;
  title: string;
  participantCount: number;
  avatarUrl?: string;
}

export default function ChatHeader({
  chatId,
  chatType,
  title,
  participantCount,
  avatarUrl,
}: ChatHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isGroupChat = chatType === ChatType.GROUP;
  const href = isGroupChat ? '/group-chat' : '/chat';

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        <Link
          href={href}
          className="mr-3 flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </Link>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ServerAvatar
            src={avatarUrl || (isGroupChat ? '/images/group-chat.png' : '/images/companion-default.png')}
            alt={title}
            className="h-9 w-9"
          />
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-medium truncate">{title}</div>
            <div className="text-xs text-muted-foreground">
              {isGroupChat
                ? `${participantCount} participant${participantCount !== 1 ? 's' : ''}`
                : 'Direct conversation'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGroupChat && (
            <Link
              href={`/group-chat/${chatId}/members`}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                "hover:bg-muted transition-colors"
              )}
            >
              <Users className="h-5 w-5" />
              <span className="sr-only">Participants</span>
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                aria-label="More options"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isGroupChat && (
                <DropdownMenuItem asChild>
                  <Link href={`/group-chat/${chatId}/add-companion`}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add companion
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
} 