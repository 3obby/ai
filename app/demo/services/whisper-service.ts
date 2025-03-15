/**
 * Service for handling voice transcriptions using OpenAI's Whisper API
 */

// Interface for detailed transcription results
export interface DetailedTranscription {
  text: string;
  duration?: number;
  language?: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    tokens?: number[];
    temperature?: number;
    avg_logprob?: number;
    compression_ratio?: number;
    no_speech_prob?: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  task?: string;
}

// Transcribe audio using the server-side API endpoint
export async function transcribeAudio(audioBlob: Blob): Promise<{ 
  transcription: string; 
  error?: string;
  details?: DetailedTranscription;
}> {
  try {
    // Create a FormData object to send the audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    
    // Call our API endpoint instead of using OpenAI client directly
    const response = await fetch('/api/demo/whisper-transcription', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to transcribe audio');
    }

    const data = await response.json();
    return {
      transcription: data.transcription,
      details: {
        text: data.transcription,
        duration: data.duration,
        language: data.language,
        segments: data.segments,
        words: data.words,
        task: 'transcribe'
      }
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return { 
      transcription: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 