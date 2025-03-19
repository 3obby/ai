import { getRecentChats } from '@/app/features/chat-engine/utils/chat-service';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { ChatType } from '@/app/shared/types/chat';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface RecentChatsProps {
  userId: string;
  limit?: number;
}

export default async function RecentChats({ userId, limit = 5 }: RecentChatsProps) {
  const chats = await getRecentChats(userId, limit);
  
  if (chats.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No recent chats found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-muted-foreground mb-3">Recent Chats</h3>
      <ul className="space-y-2">
        {chats.map((chat) => {
          const isGroupChat = chat.type === ChatType.GROUP;
          const href = isGroupChat 
            ? `/group-chat/${chat.id}` 
            : `/chat/${chat.id}`;
          
          return (
            <li key={chat.id}>
              <Link 
                href={href}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
              >
                <ServerAvatar 
                  src={isGroupChat 
                    ? '/images/group-chat.png' 
                    : (chat.participants[0]?.avatarUrl || '/images/default-avatar.png')}
                  alt={chat.name}
                  className="w-10 h-10"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium truncate">{chat.name}</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {isGroupChat 
                      ? `${chat.participants.length} participants` 
                      : 'Individual chat'}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 