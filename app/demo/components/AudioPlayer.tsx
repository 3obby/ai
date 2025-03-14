'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/app/shared/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioId?: string;
  companionId?: string;
  text?: string;
  messageId?: string;
  className?: string;
}

export default function AudioPlayer({
  audioId,
  companionId,
  text,
  messageId,
  className
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Generate audio when the component mounts
  useEffect(() => {
    if (audioId) {
      // If we already have an audioId, use it
      setAudioUrl(`/api/demo/text-to-speech?id=${audioId}`);
    } else if (text && companionId && messageId) {
      // Otherwise, generate new audio
      generateSpeech();
    }
    
    return () => {
      // Clean up audio element on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      }
    };
  }, [audioId, companionId, text, messageId]);
  
  // Generate speech from text
  const generateSpeech = async () => {
    if (!text || !companionId || !messageId) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/demo/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          companionId,
          messageId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const data = await response.json();
      
      if (data.success && data.audioId) {
        setAudioUrl(`/api/demo/text-to-speech?id=${data.audioId}`);
      } else {
        throw new Error('Invalid response from speech API');
      }
    } catch (error) {
      console.error('Error generating speech:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle play/pause
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    audioRef.current.muted = !audioRef.current.muted;
    setIsMuted(!isMuted);
  };
  
  // Handle audio ended event
  const handleEnded = () => {
    setIsPlaying(false);
  };
  
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          onEnded={handleEnded}
          className="hidden"
        />
      )}
      
      <Button
        variant="ghost"
        size="icon"
        disabled={!audioUrl || isLoading}
        onClick={togglePlayback}
        title={isPlaying ? "Pause" : "Play"}
        className="h-7 w-7"
      >
        {isLoading ? (
          <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        disabled={!audioUrl || isLoading}
        onClick={toggleMute}
        title={isMuted ? "Unmute" : "Mute"}
        className="h-7 w-7"
      >
        {isMuted ? (
          <VolumeX className="h-3 w-3" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
} 