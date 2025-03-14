'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  isRecording: boolean;
  className?: string;
  mediaStream?: MediaStream | null; // Add prop to accept the existing stream
}

export default function AudioWaveform({
  isRecording,
  className,
  mediaStream
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isVisualizationActive, setIsVisualizationActive] = useState(false);

  // Start/stop visualization based on isRecording prop
  useEffect(() => {
    console.log('AudioWaveform: Recording state changed to', isRecording);
    
    if (isRecording) {
      // If we were provided a stream, use it
      if (mediaStream) {
        console.log('AudioWaveform: Using provided media stream');
        startVisualizationWithStream(mediaStream);
      } else {
        // Otherwise create our own
        console.log('AudioWaveform: No media stream provided, creating new one');
        startVisualization();
      }
    } else {
      stopVisualization();
    }

    return () => {
      console.log('AudioWaveform: Cleaning up');
      stopVisualization();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        console.log('AudioWaveform: Closing AudioContext');
        audioContextRef.current.close().catch(err => 
          console.error('Error closing audio context:', err)
        );
        audioContextRef.current = null;
      }
    };
  }, [isRecording, mediaStream]);

  // Function to start visualization with an existing stream
  const startVisualizationWithStream = async (stream: MediaStream) => {
    console.log('AudioWaveform: Starting visualization with provided stream');
    try {
      // Stop any previous visualization first
      stopVisualization();
      
      // Always create a fresh AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }
      
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioWaveform: Created new AudioContext, state:', newAudioContext.state);
      audioContextRef.current = newAudioContext;
      
      // We don't need to get a new stream, use the provided one
      mediaStreamRef.current = stream;
      
      // Create analyzer node
      const analyser = newAudioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      // Connect stream to analyzer
      const source = newAudioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      console.log('AudioWaveform: Starting animation loop');
      // Start animation loop
      setIsVisualizationActive(true);
      animateWaveform();
    } catch (error) {
      console.error('Error starting audio visualization with provided stream:', error);
    }
  };

  const startVisualization = async () => {
    console.log('AudioWaveform: Starting visualization with new stream');
    try {
      // Stop any previous visualization first
      stopVisualization();
      
      // Always create a fresh AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }
      
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioWaveform: Created new AudioContext, state:', newAudioContext.state);
      audioContextRef.current = newAudioContext;
      
      // Get microphone stream
      console.log('AudioWaveform: Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('AudioWaveform: Got microphone stream');
      mediaStreamRef.current = stream;
      
      // Create analyzer node
      const analyser = newAudioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      // Connect stream to analyzer
      const source = newAudioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      console.log('AudioWaveform: Starting animation loop');
      // Start animation loop
      setIsVisualizationActive(true);
      animateWaveform();
    } catch (error) {
      console.error('Error starting audio visualization:', error);
    }
  };

  const stopVisualization = () => {
    console.log('AudioWaveform: Stopping visualization');
    setIsVisualizationActive(false);
    
    // Stop animation loop
    if (animationRef.current) {
      console.log('AudioWaveform: Cancelling animation frame');
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Only stop the stream if we created it ourselves (not if it was provided)
    if (mediaStreamRef.current && !mediaStream) {
      console.log('AudioWaveform: Stopping media tracks (internal stream)');
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      console.log('AudioWaveform: Clearing canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const animateWaveform = () => {
    if (!analyserRef.current || !canvasRef.current || !isVisualizationActive) {
      console.log('AudioWaveform: Missing analyser, canvas, or visualization not active');
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('AudioWaveform: Could not get canvas context');
      return;
    }
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get waveform data
    analyser.getByteTimeDomainData(dataArray);
    
    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(127, 120, 255)';
    ctx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0; // byte data ranges from 0-255, normalize to -1 to 1
      const y = (v * canvas.height) / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Continue animation loop if still active
    if (isVisualizationActive) {
      animationRef.current = requestAnimationFrame(animateWaveform);
    }
  };

  // Ensure canvas has the right size
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
          console.log('AudioWaveform: Resized canvas to', canvas.width, 'x', canvas.height);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial sizing
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div 
      className={cn(
        "rounded-md overflow-hidden bg-muted/20 h-10", 
        isRecording ? "opacity-100" : "opacity-0 h-0",
        "transition-all duration-300 ease-in-out",
        className
      )}
      data-recording={isRecording ? "true" : "false"}
      data-visualization-active={isVisualizationActive ? "true" : "false"}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
      />
    </div>
  );
} 