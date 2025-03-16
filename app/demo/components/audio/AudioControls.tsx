'use client';

import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/app/shared/components/ui/button';
import { Card } from '@/app/shared/components/ui/card';
import AudioWaveform from '../AudioWaveform';

interface AudioControlsProps {
  isRecording: boolean;
  isStreaming: boolean;
  interimTranscript: string;
  onMicClick: () => void;
  onStartStreaming: () => Promise<void>;
  onStopStreaming: () => Promise<void>;
}

export default function AudioControls({
  isRecording,
  isStreaming,
  interimTranscript,
  onMicClick,
  onStartStreaming,
  onStopStreaming
}: AudioControlsProps) {
  return (
    <div className="flex items-center gap-4 p-4 border-t">
      <Button
        variant="ghost"
        size="icon"
        className={isStreaming ? 'text-primary' : 'text-muted-foreground'}
        onClick={onMicClick}
      >
        {isStreaming ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      {isStreaming && (
        <Card className="flex-1 p-2 bg-muted/50">
          <AudioWaveform isActive={isStreaming} />
          {interimTranscript && (
            <p className="text-sm text-muted-foreground mt-2">{interimTranscript}</p>
          )}
        </Card>
      )}
    </div>
  );
} 