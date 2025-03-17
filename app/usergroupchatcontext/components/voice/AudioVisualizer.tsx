import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  className?: string;
  barCount?: number;
  barWidth?: number;
  barGap?: number;
  minBarHeight?: number;
  barColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  height?: number;
  level: number;
}

export default function AudioVisualizer({
  className = '',
  barCount = 30,
  barWidth = 3,
  barGap = 2,
  minBarHeight = 3,
  barColor = '#64748b',
  activeColor = '#0ea5e9',
  backgroundColor = 'transparent',
  height = 40,
  level = 0,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isActive = level > 0.1;
  
  // Calculate the total width based on bar count, width, and gap
  const totalWidth = barCount * (barWidth + barGap) - barGap;
  
  // Effect to draw the audio visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Generate random bar heights based on the level
    // In a real implementation, this would be based on frequency data
    const bars = Array.from({ length: barCount }, () => {
      const randomFactor = 0.5 + Math.random() * 0.5;
      const heightFactor = level * randomFactor;
      return minBarHeight + heightFactor * (height - minBarHeight);
    });
    
    // Draw the bars
    for (let i = 0; i < barCount; i++) {
      const barHeight = bars[i];
      const x = i * (barWidth + barGap);
      const y = (height - barHeight) / 2;
      
      // Use active color when speaking, otherwise use the regular bar color
      ctx.fillStyle = isActive ? activeColor : barColor;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [
    isActive,
    level,
    barCount,
    barWidth,
    barGap,
    minBarHeight,
    height,
    barColor,
    activeColor,
    backgroundColor
  ]);
  
  return (
    <canvas
      ref={canvasRef}
      width={totalWidth}
      height={height}
      className={`rounded ${className}`}
    />
  );
} 