import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default options for the most natural, high-quality voice
const DEFAULT_MODEL = 'tts-1-hd';  // Use the high-definition TTS model instead of realtime
const DEFAULT_VOICE = 'alloy';

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
    
    // Always use the standard TTS API
    const response = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      speed: speed,
      response_format: 'mp3',
    });
    
    const audioData = await response.arrayBuffer();
    
    // Get the audio as a buffer
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
    
    return NextResponse.json(
      { 
        error: 'Failed to synthesize speech', 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
} 