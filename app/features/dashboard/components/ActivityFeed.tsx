'use client';

import { useData } from '@/app/shared/hooks/useData';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'message' | 'chat_created' | 'companion_added' | 'group_created';
  content?: string;
  chatId?: string;
  chatName?: string;
  companionId?: string;
  companionName?: string;
  createdAt: Date;
}

interface ActivityFeedProps {
  userId: string;
  limit?: number;
}

export default function ActivityFeed({ userId, limit = 5 }: ActivityFeedProps) {
  const { data: activities, isLoading, error } = useData(
    'user-activity',
    userId,
    `/api/users/${userId}/activity?limit=${limit}`,
    {
      cacheDuration: 1000 * 60 * 2, // 2 minutes
    }
  );

  if (isLoading) {
    return <p>Loading activity...</p>;
  }

  if (error || !activities || activities.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No recent activity to display.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const { type, chatName, companionName, createdAt } = activity;
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  // Determine icon and text based on activity type
  let icon = '/images/message-icon.png';
  let primaryText = '';
  let secondaryText = '';
  
  switch (type) {
    case 'message':
      icon = '/images/message-icon.png';
      primaryText = 'New message';
      secondaryText = `You received a message ${chatName ? `in ${chatName}` : ''}`;
      break;
    case 'chat_created':
      icon = '/images/chat-icon.png';
      primaryText = 'Chat created';
      secondaryText = `You started a new chat${chatName ? ` called "${chatName}"` : ''}`;
      break;
    case 'companion_added':
      icon = '/images/companion-icon.png';
      primaryText = 'Companion added';
      secondaryText = `You added ${companionName || 'a companion'} to a chat`;
      break;
    case 'group_created':
      icon = '/images/group-icon.png';
      primaryText = 'Group created';
      secondaryText = `You created a new group chat${chatName ? ` called "${chatName}"` : ''}`;
      break;
    default:
      icon = '/images/activity-icon.png';
      primaryText = 'Activity';
      secondaryText = 'Something happened in your account';
  }

  return (
    <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
      <ServerAvatar
        src={icon}
        alt={type}
        className="w-10 h-10"
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm">
          <h4 className="font-semibold">{primaryText}</h4>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{secondaryText}</p>
      </div>
    </div>
  );
} 