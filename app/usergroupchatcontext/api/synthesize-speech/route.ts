import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default options for the most natural, high-quality voice
const DEFAULT_MODEL = 'tts-1-hd';  // Use the high-definition TTS model instead of realtime
const DEFAULT_VOICE = 'coral';  // Change default from 'alloy' to 'coral'

export async function POST(req: NextRequest) {
  try {
    const { text, options } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' }, 
        { status: 400 }
      );
    }
    
    // Always use a standard TTS model, even if a realtime model is requested
    // Realtime models aren't supported for pure TTS yet
    const model = options?.model?.includes('realtime') ? 'tts-1-hd' : (options?.model || DEFAULT_MODEL);
    const voice = options?.voice || DEFAULT_VOICE;
    const speed = options?.speed || 1.0;
    
    // Log what we're using
    console.log(`Synthesizing speech with model=${model}, voice=${voice}`);
    
    // Fixed OpenAI API call to properly use SDK v4.87.3
    const response = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      speed: speed,
    });
    
    // Get the audio as an ArrayBuffer
    const audioData = await response.arrayBuffer();
    
    // Convert to Buffer for response
    const buffer = Buffer.from(audioData);
    
    // Return the audio with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    
    // Implement graceful fallback in the API route itself
    // This way, if there's an issue with OpenAI, we at least return a readable error
    return NextResponse.json(
      { 
        error: 'Failed to synthesize speech', 
        details: error instanceof Error ? error.message : String(error),
        fallback: true, // Indicate to the client that it should use browser TTS
      }, 
      { status: 500 }
    );
  }
} 