'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Mic, Ghost, Activity, Clock, AlertTriangle, X } from 'lucide-react';
import { VoiceModeState, VoiceModeTransition, VoiceGhost } from '../../services/voice/VoiceModeManager';
import { useVoiceState } from '../../hooks/useVoiceState';
import eventBus from '../../services/events/EventBus';

interface VoiceGhostDebuggerProps {
  className?: string;
  onClose?: () => void;
}

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'state' | 'ghost' | 'transition' | 'error' | 'lifecycle';
  message: string;
  details: any;
}

/**
 * VoiceGhostDebugger Component
 * 
 * A debugging tool that shows real-time information about voice ghost lifecycle:
 * - State transitions
 * - Ghost creation and destruction
 * - Performance metrics
 * - Error information
 * 
 * This component is intended for development and troubleshooting use.
 */
export function VoiceGhostDebugger({ className, onClose }: VoiceGhostDebuggerProps) {
  const { currentState, lastError, isRecording, activeVoiceBotIds } = useVoiceState();
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeGhosts, setActiveGhosts] = useState<VoiceGhost[]>([]);
  const [metrics, setMetrics] = useState({
    avgTransitionTime: 0,
    totalTransitions: 0,
    errorCount: 0,
    lastTransitionTime: 0
  });
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Add a log entry
  const addLog = (type: 'state' | 'ghost' | 'transition' | 'error' | 'lifecycle', message: string, details: any) => {
    setLogs(prev => {
      const newLogs = [
        ...prev,
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type,
          message,
          details: details || {}
        }
      ].slice(-100); // Keep only the last 100 logs
      
      return newLogs;
    });
    
    // Scroll to bottom of logs
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  // Update metrics based on new data
  const updateMetrics = (transitionTime?: number, isError: boolean = false) => {
    setMetrics(prev => {
      const newCount = prev.totalTransitions + (transitionTime ? 1 : 0);
      const newAvg = transitionTime 
        ? ((prev.avgTransitionTime * prev.totalTransitions) + transitionTime) / newCount
        : prev.avgTransitionTime;
      
      return {
        avgTransitionTime: newAvg,
        totalTransitions: newCount,
        errorCount: prev.errorCount + (isError ? 1 : 0),
        lastTransitionTime: transitionTime || prev.lastTransitionTime
      };
    });
  };
  
  // Setup event listeners
  useEffect(() => {
    // Handle state changes
    const handleStateChange = ({ prevState, nextState, data }: { 
      prevState: VoiceModeState, 
      nextState: VoiceModeState,
      data?: any
    }) => {
      addLog('state', `State changed: ${prevState} → ${nextState}`, { prevState, nextState, data });
    };
    
    // Handle ghost creation
    const handleGhostsCreated = (ghosts: VoiceGhost[]) => {
      setActiveGhosts(ghosts);
      addLog(
        'ghost', 
        `${ghosts.length} ghost(s) created`, 
        { count: ghosts.length, ghostIds: ghosts.map(g => g.id) }
      );
    };
    
    // Handle ghost cleanup
    const handleGhostsCleared = () => {
      setActiveGhosts([]);
      addLog('ghost', 'All ghosts cleared', { });
    };
    
    // Handle transition completion
    const handleTransitionComplete = (data: { 
      direction: 'text-to-voice' | 'voice-to-text', 
      timestamp: number 
    }) => {
      addLog(
        'transition', 
        `Transition complete: ${data.direction}`, 
        data
      );
    };
    
    // Handle detailed lifecycle events
    const handleLifecycleComplete = (data: { 
      direction: 'text-to-voice' | 'voice-to-text',
      timestamp: number,
      duration: number,
      success: boolean
    }) => {
      addLog(
        'lifecycle', 
        `Lifecycle complete: ${data.direction} (${data.duration}ms)${data.success ? '' : ' - FAILED'}`,
        data
      );
      
      updateMetrics(data.duration, !data.success);
    };
    
    // Handle errors
    const handleError = () => {
      const error = lastError;
      if (error) {
        addLog('error', `Error: ${error.message}`, { error });
        updateMetrics(undefined, true);
      }
    };
    
    // Listen for state changes
    eventBus.on('state:changed', handleStateChange);
    
    // Listen for ghost lifecycle events
    eventBus.on('ghosts:created', handleGhostsCreated);
    eventBus.on('ghosts:cleared', handleGhostsCleared);
    
    // Listen for transition events
    eventBus.on('transition:complete', handleTransitionComplete);
    
    // Listen for detailed lifecycle events
    eventBus.on('lifecycle:complete', handleLifecycleComplete);
    
    // Handle ghost lifecycle events
    const handleGhostCreate = (data: { timestamp: number, ghostId: string, originalBotId: string, details?: any }) => {
      addLog('ghost', `Ghost created: ${data.ghostId} (from ${data.originalBotId})`, data);
    };
    
    const handleGhostDestroy = (data: { timestamp: number, ghostId: string, originalBotId: string, details?: any }) => {
      addLog('ghost', `Ghost destroyed: ${data.ghostId} (from ${data.originalBotId})`, data);
    };
    
    eventBus.on('lifecycle:ghost:create', handleGhostCreate);
    eventBus.on('lifecycle:ghost:destroy', handleGhostDestroy);
    
    // Check initial state
    handleError(); // Check for initial errors
    
    // Cleanup
    return () => {
      eventBus.off('state:changed', handleStateChange);
      eventBus.off('ghosts:created', handleGhostsCreated);
      eventBus.off('ghosts:cleared', handleGhostsCleared);
      eventBus.off('transition:complete', handleTransitionComplete);
      eventBus.off('lifecycle:complete', handleLifecycleComplete);
      eventBus.off('lifecycle:ghost:create', handleGhostCreate);
      eventBus.off('lifecycle:ghost:destroy', handleGhostDestroy);
    };
  }, [lastError]);
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
  };
  
  // Get color for log type
  const getLogColor = (type: string) => {
    switch (type) {
      case 'state': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ghost': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'transition': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'lifecycle': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };
  
  // Get icon for log type
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'state': return <Mic className="h-4 w-4" />;
      case 'ghost': return <Ghost className="h-4 w-4" />;
      case 'transition': return <Activity className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'lifecycle': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };
  
  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/95 shadow-lg overflow-hidden flex flex-col",
      className
    )}>
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-lg font-medium flex items-center">
          <Ghost className="h-5 w-5 mr-2" />
          Voice Ghost Debugger
        </h3>
        
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Close debugger"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {/* State info */}
        <div className="bg-muted rounded-md p-3 md:col-span-1">
          <h4 className="text-sm font-medium mb-2">Current State</h4>
          <div className={cn(
            "text-sm p-2 rounded",
            currentState === VoiceModeState.ERROR 
              ? "bg-destructive/20 text-destructive" 
              : "bg-primary/20 text-primary"
          )}>
            {currentState}
          </div>
          
          <h4 className="text-sm font-medium mt-4 mb-2">Active Ghosts ({activeGhosts.length})</h4>
          {activeGhosts.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
              {activeGhosts.map(ghost => (
                <div key={ghost.id} className="p-2 bg-background rounded border">
                  <div className="font-medium">{ghost.id}</div>
                  <div className="text-muted-foreground">From: {ghost.originalBotId}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No active ghosts</div>
          )}
        </div>
        
        {/* Metrics */}
        <div className="bg-muted rounded-md p-3 md:col-span-1">
          <h4 className="text-sm font-medium mb-2">Performance Metrics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Avg. Transition Time:</span>
              <span className="font-mono">{metrics.avgTransitionTime.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Last Transition:</span>
              <span className="font-mono">{metrics.lastTransitionTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Total Transitions:</span>
              <span className="font-mono">{metrics.totalTransitions}</span>
            </div>
            <div className="flex justify-between">
              <span>Error Count:</span>
              <span className={cn(
                "font-mono",
                metrics.errorCount > 0 ? "text-destructive" : ""
              )}>
                {metrics.errorCount}
              </span>
            </div>
          </div>
          
          <h4 className="text-sm font-medium mt-4 mb-2">Current Error</h4>
          {lastError ? (
            <div className="p-2 bg-destructive/20 text-destructive rounded text-sm">
              {lastError.message}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No errors</div>
          )}
        </div>
        
        {/* Actions */}
        <div className="bg-muted rounded-md p-3 md:col-span-1">
          <h4 className="text-sm font-medium mb-2">Debug Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLogs([])}
              className="px-3 py-1.5 text-xs bg-muted-foreground/20 hover:bg-muted-foreground/30 rounded"
            >
              Clear Logs
            </button>
            
            <button
              type="button"
              onClick={() => {
                const json = JSON.stringify({
                  logs,
                  activeGhosts,
                  currentState,
                  metrics,
                  error: lastError?.message
                }, null, 2);
                
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `voice-ghost-debug-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded"
            >
              Export Debug Data
            </button>
          </div>
        </div>
      </div>
      
      {/* Logs */}
      <div className="flex-1 p-4 overflow-hidden">
        <h4 className="text-sm font-medium mb-2">Event Log</h4>
        <div className="bg-muted rounded-md h-full overflow-y-auto p-2 text-xs font-mono">
          {logs.length > 0 ? (
            <div className="space-y-1">
              {logs.map(log => (
                <div 
                  key={log.id}
                  className={cn(
                    "px-2 py-1 rounded flex items-start",
                    getLogColor(log.type)
                  )}
                >
                  <span className="mr-2 mt-0.5">{getLogIcon(log.type)}</span>
                  <div>
                    <span className="opacity-70">[{formatTime(log.timestamp)}]</span>{' '}
                    <span>{log.message}</span>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-4">
              No events logged yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 