'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  } | null;
  networkRequests: number;
  renderTime: number;
}

export default function PerformanceOverlay() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: null,
    networkRequests: 0,
    renderTime: 0,
  });
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;
    let originalFetch: typeof fetch;
    let startRenderTime = performance.now();

    const updateFPS = () => {
      const now = performance.now();
      frameCount++;
      
      if (now >= lastTime + 1000) {
        const renderTime = performance.now() - startRenderTime;
        startRenderTime = performance.now();
        
        setMetrics(prev => ({
          ...prev,
          fps: Math.round(frameCount * 1000 / (now - lastTime)),
          renderTime,
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          } : null,
        }));
        
        frameCount = 0;
        lastTime = now;
      }
      
      animationFrameId = requestAnimationFrame(updateFPS);
    };

    // Initialize metrics tracking
    updateFPS();
    
    // Track network requests
    originalFetch = window.fetch;
    window.fetch = function(...args) {
      setMetrics(prev => ({
        ...prev,
        networkRequests: prev.networkRequests + 1,
      }));
      
      const request = originalFetch.apply(this, args);
      
      // Optional: Add response timing here
      
      return request;
    };

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.fetch = originalFetch;
    };
  }, []);

  if (!visible || process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-0 left-0 z-50 p-2 bg-dark-900 bg-opacity-90 text-white text-xs font-mono rounded-tr-md border border-dark-700 shadow-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "−" : "+"}
        </button>
        
        <div className="flex gap-4">
          <div>FPS: {metrics.fps}</div>
          {expanded && metrics.memory && (
            <div>
              Mem: {Math.round(metrics.memory.usedJSHeapSize / 1048576)}MB / 
              {Math.round(metrics.memory.totalJSHeapSize / 1048576)}MB
            </div>
          )}
          {expanded && (
            <>
              <div>Req: {metrics.networkRequests}</div>
              <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
            </>
          )}
        </div>
        
        <button 
          onClick={() => setVisible(false)}
          className="ml-2 w-5 h-5 flex items-center justify-center bg-red-500 bg-opacity-25 hover:bg-opacity-50 rounded"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      
      {expanded && (
        <div className="mt-2 pt-2 border-t border-dark-700 grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="text-dark-300">Next.js 13.4.11</div>
          <div className="text-dark-300">App Router</div>
          <div className="col-span-2 mt-1">
            <div className="w-full bg-dark-700 rounded-full h-1">
              <div 
                className="bg-primary-500 h-1 rounded-full" 
                style={{ width: `${Math.min(100, metrics.fps / 60 * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 