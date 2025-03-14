/**
 * Service for handling voice transcriptions using OpenAI's Whisper API
 */

// Transcribe audio using the server-side API endpoint
export async function transcribeAudio(audioBlob: Blob): Promise<{ transcription: string; error?: string }> {
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
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return { 
      transcription: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 