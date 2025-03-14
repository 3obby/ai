import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import fs from 'fs';

// Initialize the OpenAI client (server-side)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    // Get form data from request
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" }, 
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Save the file temporarily
    const tempDir = os.tmpdir();
    const filename = `${uuidv4()}-${audioFile.name}`;
    const filepath = join(tempDir, filename);
    
    await writeFile(filepath, buffer);
    
    // Create a readable stream from the file
    const fileStream = fs.createReadStream(filepath);
    
    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
    });
    
    // Clean up the temporary file
    fs.unlink(filepath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
    });
    
    return NextResponse.json({
      transcription: transcription.text,
    });
  } catch (error) {
    console.error('Error processing audio transcription:', error);
    return NextResponse.json(
      { 
        error: "Failed to transcribe audio", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 