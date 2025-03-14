'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/app/shared/hooks/useData';
import { BarChart3, MessageSquare, Users } from 'lucide-react';

interface AnalyticsData {
  totalChats: number;
  totalMessages: number;
  totalCompanions: number;
  activeCompanions: number;
  messagesByDay: {
    date: string;
    count: number;
  }[];
}

interface AnalyticsSummaryProps {
  userId: string;
}

export default function AnalyticsSummary({ userId }: AnalyticsSummaryProps) {
  const { data, isLoading, error } = useData<AnalyticsData>(
    'analytics',
    userId,
    `/api/analytics?userId=${userId}`,
    {
      // Refresh data every 5 minutes
      cacheDuration: 1000 * 60 * 5,
    }
  );

  if (isLoading) {
    return <p>Loading analytics...</p>;
  }

  if (error || !data) {
    return <p className="text-muted-foreground">Unable to load analytics data.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Chats"
          value={data.totalChats}
          icon={<MessageSquare className="w-5 h-5" />}
          trend={'+5%'}
          trendUp={true}
        />
        <StatCard
          title="Total Messages"
          value={data.totalMessages}
          icon={<BarChart3 className="w-5 h-5" />}
          trend={'+12%'}
          trendUp={true}
        />
        <StatCard
          title="Active Companions"
          value={data.activeCompanions}
          icon={<Users className="w-5 h-5" />}
          trend={'0%'}
          trendUp={false}
        />
      </div>

      {/* Message activity summary */}
      <div className="pt-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Recent Message Activity
        </h3>
        <div className="h-32 flex items-end gap-1">
          {data.messagesByDay.map((day, index) => (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center group"
            >
              <div 
                className="relative w-full bg-primary/20 hover:bg-primary/30 rounded-t-sm transition-colors"
                style={{ 
                  height: `${Math.max(15, (day.count / Math.max(...data.messagesByDay.map(d => d.count))) * 100)}%` 
                }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {day.count} messages
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground pt-1">{formatDate(day.date)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper components and functions

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: string;
  trendUp: boolean;
}

function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-muted/40 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
        <div className="p-2 bg-primary/10 rounded-full">{icon}</div>
      </div>
      <div className="mt-2 flex items-center">
        <span
          className={`text-xs font-medium ${
            trendUp ? 'text-green-500' : trend === '0%' ? 'text-muted-foreground' : 'text-red-500'
          }`}
        >
          {trend} {trendUp ? '↑' : trend === '0%' ? '→' : '↓'}
        </span>
        <span className="text-xs text-muted-foreground ml-1">vs. last week</span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', ' ');
} 