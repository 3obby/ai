'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Activity, BarChart3, Mic } from 'lucide-react';
import voiceAnalyticsService, { VoiceAnalyticsData } from '../../services/voice/voice-analytics-service';

interface VoiceAnalyticsProps {
  className?: string;
  minimized?: boolean;
}

export default function VoiceAnalytics({ 
  className = '',
  minimized = false
}: VoiceAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<VoiceAnalyticsData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    // Get initial data
    setAnalyticsData(voiceAnalyticsService.getAnalyticsData());
    
    // Set up listener for updates
    const handleUpdate = (data: VoiceAnalyticsData) => {
      setAnalyticsData(data);
    };
    
    voiceAnalyticsService.on('analytics:updated', handleUpdate);
    
    return () => {
      voiceAnalyticsService.off('analytics:updated', handleUpdate);
    };
  }, []);
  
  if (!analyticsData) {
    return null;
  }
  
  // Format time in minutes:seconds
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  if (minimized) {
    return (
      <div 
        className={`fixed bottom-4 right-4 bg-background p-3 rounded-full shadow-md cursor-pointer ${className}`}
        onClick={() => setIsExpanded(true)}
      >
        <Activity className="h-5 w-5 text-primary" />
      </div>
    );
  }
  
  return (
    <div className={`bg-background rounded-md shadow-md ${className} ${isExpanded ? 'w-80' : 'w-40'}`}>
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Voice Analytics</h3>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? 'Minimize' : 'Expand'}
        </button>
      </div>
      
      <div className="p-3 space-y-4">
        {/* Session Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">Session</span>
            </div>
            <span className="text-xs font-mono">{formatTime(analyticsData.sessionDuration)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">Interactions</span>
            </div>
            <span className="text-xs font-mono">{analyticsData.totalInteractions}</span>
          </div>
        </div>
        
        {/* Speaking Time Bar Chart */}
        {isExpanded && (
          <>
            <div className="space-y-2">
              <h4 className="text-xs font-medium">Speaking Time</h4>
              <div className="space-y-1">
                {Object.entries(analyticsData.turnCounts).map(([speaker, count]) => {
                  const speakingTime = analyticsData.turnDurations[speaker]?.reduce((a, b) => a + b, 0) || 0;
                  const totalTime = analyticsData.sessionDuration;
                  const percentage = totalTime > 0 ? (speakingTime / totalTime) * 100 : 0;
                  
                  return (
                    <div key={speaker} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{speaker === 'user' ? 'You' : speaker}</span>
                        <span className="font-mono">{formatTime(speakingTime)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-background-lighter rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${speaker === 'user' ? 'bg-blue-500' : 'bg-primary'} rounded-full`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Voice Activity */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium">Voice Activity</h4>
              <div className="h-12 w-full bg-background-lighter rounded-md overflow-hidden flex items-end">
                {analyticsData.voiceActivityLevels.slice(-30).map((level, i) => {
                  const height = Math.max(2, level * 48);  // min 2px, max 48px (12 * 4)
                  return (
                    <div 
                      key={i}
                      className="w-1 bg-primary mx-px"
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Avg: {(analyticsData.averageVoiceLevel * 100).toFixed(0)}%</span>
                <span>Peak: {(analyticsData.peakVoiceLevel * 100).toFixed(0)}%</span>
              </div>
            </div>
            
            {/* Bot Response Times */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium">Response Times</h4>
              <div className="space-y-1">
                {Object.entries(analyticsData.averageBotResponseTime).map(([botId, avgTime]) => (
                  <div key={botId} className="flex justify-between text-xs">
                    <span>{botId}</span>
                    <span className="font-mono">{avgTime.toFixed(0)} ms</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tool Usage */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium">Tool Usage</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background-lighter rounded-md p-2 text-center">
                  <div className="text-sm font-medium">{analyticsData.voiceToolUsageCount}</div>
                  <div className="text-xs text-muted-foreground">Voice</div>
                </div>
                <div className="bg-background-lighter rounded-md p-2 text-center">
                  <div className="text-sm font-medium">{analyticsData.textToolUsageCount}</div>
                  <div className="text-xs text-muted-foreground">Text</div>
                </div>
              </div>
            </div>
            
            {/* Reset Button */}
            <div className="pt-2">
              <button
                onClick={() => voiceAnalyticsService.resetData()}
                className="w-full py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md"
              >
                Reset Analytics
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 