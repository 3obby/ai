import { getChat } from '@/app/features/chat-engine/utils/chat-service';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { ChatType } from '@/app/shared/types/chat';
import { formatDistanceToNow } from 'date-fns';

interface ChatDetailsProps {
  chatId: string;
}

export default async function ChatDetails({ chatId }: ChatDetailsProps) {
  const chat = await getChat(chatId);
  
  if (!chat) {
    return (
      <div className="p-4 bg-background rounded-lg shadow">
        <p className="text-center text-muted-foreground">Chat not found</p>
      </div>
    );
  }

  const isGroupChat = chat.type === ChatType.GROUP;
  const formattedDate = formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true });
  const participants = isGroupChat 
    ? chat.participants.length 
    : 1; // In individual chats, only count the companion

  return (
    <div className="bg-background rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <ServerAvatar
            src={isGroupChat 
              ? '/images/group-chat.png' 
              : (chat.participants[0]?.avatarUrl || '/images/default-avatar.png')}
            alt={chat.name}
            className="w-12 h-12"
          />
          <div>
            <h2 className="font-semibold text-lg">{chat.name}</h2>
            <p className="text-sm text-muted-foreground">
              {isGroupChat 
                ? `${participants} participants` 
                : 'Individual chat'}
            </p>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span>{formattedDate}</span>
          </div>

          {isGroupChat && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Creator</span>
              <span>{chat.creatorId}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Messages</span>
            <span>{chat.messageCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 