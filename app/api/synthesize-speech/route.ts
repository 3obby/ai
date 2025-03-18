import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default options for the most natural, high-quality voice
const DEFAULT_MODEL = 'gpt-4o-realtime-preview';
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
    
    // Determine which model to use - prioritize realtime models for higher quality
    let model = options?.model || DEFAULT_MODEL;
    let voice = options?.voice || DEFAULT_VOICE;
    const speed = options?.speed || 1.0;
    
    // Log what we're using
    console.log(`Synthesizing speech with model=${model}, voice=${voice}`);
    
    let audioData;
    
    // Check if we're using a realtime model
    if (model.includes('realtime')) {
      try {
        // Call OpenAI's realtime model through the appropriate API
        // Note: Replace with the actual API endpoint when available
        const realtimeResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: model,
            input: text,
            voice: voice,
            speed: speed,
            response_format: 'mp3',
            // Add any additional realtime-specific parameters here
          })
        });
        
        if (!realtimeResponse.ok) {
          throw new Error(`Realtime API error: ${realtimeResponse.status}`);
        }
        
        audioData = await realtimeResponse.arrayBuffer();
      } catch (realtimeError) {
        console.error('Error using realtime model, falling back to TTS:', realtimeError);
        
        // Fallback to standard TTS if realtime fails
        model = 'tts-1-hd';
        
        const response = await openai.audio.speech.create({
          model: model,
          voice: voice,
          input: text,
          speed: speed,
          response_format: 'mp3',
        });
        
        audioData = await response.arrayBuffer();
      }
    } else {
      // Using standard TTS model
      const response = await openai.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
        speed: speed,
        response_format: 'mp3',
      });
      
      audioData = await response.arrayBuffer();
    }
    
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