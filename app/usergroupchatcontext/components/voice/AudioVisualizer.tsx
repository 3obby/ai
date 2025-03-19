'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  audioLevel: number; // 0-1 scale
  color?: string;
  barCount?: number;
  className?: string;
}

export default function AudioVisualizer({
  audioLevel,
  color = 'bg-primary',
  barCount = 20,
  className
}: AudioVisualizerProps) {
  // Generate visualization bars based on current audio level
  const bars = useMemo(() => {
    const bars = [];
    const normalizedLevel = Math.min(Math.max(audioLevel, 0), 1);
    
    for (let i = 0; i < barCount; i++) {
      // Calculate height for this bar (0-100%)
      let heightPercentage = 0;
      
      // Generate a smooth, natural-looking visualization
      // Each bar has a different threshold at which it becomes visible
      const barThreshold = i / barCount;
      
      if (normalizedLevel > barThreshold) {
        // Calculate how far above threshold this level is (0-1)
        const aboveThreshold = (normalizedLevel - barThreshold) / (1 - barThreshold);
        
        // Add some randomness for a more natural look
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2
        heightPercentage = Math.min(aboveThreshold * randomFactor * 100, 100);
      }
      
      bars.push(
        <div 
          key={i} 
          className={cn("w-1 rounded-sm mx-0.5", color)}
          style={{ 
            height: `${heightPercentage}%`,
            transition: 'height 50ms ease'
          }}
        />
      );
    }
    
    return bars;
  }, [audioLevel, barCount, color]);

  return (
    <div 
      className={cn(
        "w-full h-full flex items-end justify-center", 
        className
      )}
    >
      {bars}
    </div>
  );
} 