import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';

// Initialize the OpenAI client (server-side)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Map of companion IDs to voice models
const VOICE_MODELS: Record<string, string> = {
  'assistant-1': 'onyx', // Technical advisor (male, deep voice)
  'assistant-2': 'shimmer', // Creative lead (female, upbeat voice)
  'assistant-3': 'nova', // Project manager (female, professional voice)
  'assistant-4': 'echo', // Data analyst (male, analytical voice)
  'default': 'alloy' // Default fallback voice
};

export async function POST(request: Request) {
  try {
    const { text, companionId } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Determine which voice to use based on the companion
    const voice = companionId && VOICE_MODELS[companionId] 
      ? VOICE_MODELS[companionId] 
      : VOICE_MODELS.default;

    // Create audio with OpenAI
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as any,
      input: text.substring(0, 4096), // Limit to 4096 chars (OpenAI limit)
    });

    // Get the audio data as binary
    const audioData = await mp3.arrayBuffer();
    
    // Create a unique ID for the audio file
    const audioId = uuidv4();
    
    // Create a temporary directory
    const tempDir = os.tmpdir();
    const fileName = `speech-${audioId}.mp3`;
    const filePath = path.join(tempDir, fileName);
    
    // Save the audio file - convert Buffer to Uint8Array to satisfy type requirements
    await writeFile(filePath, new Uint8Array(audioData));
    
    // Return a JSON response with the URL to fetch the audio
    return NextResponse.json({
      audioId: audioId,
      fileName: fileName,
      success: true
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { 
        error: "Failed to generate speech", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Handler to fetch the generated audio file
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const audioId = url.searchParams.get('id');
    
    if (!audioId) {
      return NextResponse.json(
        { error: "Audio ID is required" },
        { status: 400 }
      );
    }
    
    const tempDir = os.tmpdir();
    const fileName = `speech-${audioId}.mp3`;
    const filePath = path.join(tempDir, fileName);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }
    
    // Read the file data
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create a response with the audio data
    const response = new NextResponse(fileBuffer);
    
    // Set the appropriate headers
    response.headers.set('Content-Type', 'audio/mpeg');
    response.headers.set('Content-Length', fileBuffer.length.toString());
    response.headers.set('Content-Disposition', `attachment; filename=${fileName}`);
    
    // Delete the file after sending (Next.js will clean this up properly)
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting audio file:', err);
    });
    
    return response;
  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json(
      { error: "Failed to serve audio file" },
      { status: 500 }
    );
  }
} 