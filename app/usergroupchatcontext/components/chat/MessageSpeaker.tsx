'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Play, Pause, StopCircle } from 'lucide-react';
import { useVoiceSynthesis } from '../../services/voiceSynthesisService';
import { cn } from '@/lib/utils';

interface MessageSpeakerProps {
  message: string;
  botName?: string;
  className?: string;
  voicePreference?: string;
}

export function MessageSpeaker({
  message,
  botName,
  className,
  voicePreference,
}: MessageSpeakerProps) {
  const [showControls, setShowControls] = useState(false);
  
  const {
    isPlaying,
    isPaused,
    speak,
    pause,
    resume,
    stop,
    isSupported,
    availableVoices,
  } = useVoiceSynthesis({
    voice: voicePreference,
    rate: 1,
    pitch: 1,
  });

  if (!isSupported) {
    return null;
  }

  const togglePlay = () => {
    if (isPlaying && !isPaused) {
      pause();
    } else if (isPlaying && isPaused) {
      resume();
    } else {
      speak(message);
    }
    setShowControls(true);
  };

  const handleStop = () => {
    stop();
    setShowControls(false);
  };

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "p-1 rounded-full transition-colors",
          isPlaying 
            ? "text-primary hover:text-primary/80" 
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label={isPlaying ? "Pause speech" : "Speak message"}
      >
        {isPlaying && !isPaused ? (
          <Pause className="h-3.5 w-3.5" />
        ) : isPlaying && isPaused ? (
          <Play className="h-3.5 w-3.5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
      </button>
      
      {showControls && (
        <button
          type="button"
          onClick={handleStop}
          className="ml-1 p-1 rounded-full text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Stop speech"
        >
          <StopCircle className="h-3.5 w-3.5" />
        </button>
      )}
      
      {isPlaying && (
        <span className="animate-pulse absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full"></span>
      )}
    </div>
  );
} 