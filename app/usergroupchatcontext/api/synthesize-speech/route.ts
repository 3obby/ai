import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default options for the most natural, high-quality voice
const DEFAULT_MODEL = 'tts-1';  // Use standard TTS model which is widely available
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
    
    // Handle model name and ensure it's a valid TTS model
    let model = DEFAULT_MODEL;
    
    // If options.model is provided, verify it's a valid TTS model
    if (options?.model) {
      // Support for tts-1 or tts-1-hd only
      if (['tts-1', 'tts-1-hd'].includes(options.model)) {
        model = options.model;
      } else if (options.model.includes('realtime') || options.model.includes('gpt')) {
        // If it's a realtime or GPT model, use the default TTS model
        console.log(`Model ${options.model} is not a TTS model. Using ${DEFAULT_MODEL} instead.`);
        model = DEFAULT_MODEL;
      }
    }
    
    const voice = options?.voice || DEFAULT_VOICE;
    const speed = options?.speed || 1.0;
    
    // Log what we're using
    console.log(`Synthesizing speech with model=${model}, voice=${voice}`);
    
    try {
      // OpenAI API call using the audio.speech.create method
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
    } catch (apiError: any) {
      console.error('OpenAI API error:', apiError);
      
      // Handle specific API errors
      if (apiError.status === 404) {
        console.error('API endpoint not found. Check if your OpenAI SDK version is compatible with the API.');
      }
      
      // Throw the error to be caught by the outer catch block
      throw apiError;
    }
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    
    // Implement graceful fallback in the API route itself
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