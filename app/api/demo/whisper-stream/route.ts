import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  console.log('[whisper-stream] Received POST request');
  
  try {
    // Get form data from request
    const formData = await request.formData();
    const audioChunk = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    
    console.log(`[whisper-stream] Processing audio chunk for session ${sessionId?.substring(0, 8)}...`);
    console.log(`[whisper-stream] Audio chunk type: ${audioChunk?.type}, size: ${audioChunk?.size} bytes`);
    
    if (!audioChunk || !sessionId) {
      console.error('[whisper-stream] Missing audio chunk or session ID');
      return NextResponse.json(
        { error: "Audio chunk or session ID not provided" }, 
        { status: 400 }
      );
    }

    // Skip transcription for very small chunks (likely silence)
    if (audioChunk.size < 1000) {
      console.log('[whisper-stream] Audio chunk too small, likely silence');
      return NextResponse.json({
        transcription: "",
        chunkId: `empty-${Date.now()}`,
        completed: true
      });
    }

    // Create a unique directory for the session if it doesn't exist
    const tempDir = join(os.tmpdir(), sessionId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`[whisper-stream] Created temp directory: ${tempDir}`);
    }
    
    // Generate a unique name for this chunk with appropriate extension
    const timestamp = Date.now();
    const chunkId = `${timestamp}-${uuidv4().substring(0, 8)}`;
    
    // Use appropriate file extension based on MIME type
    let fileExtension = '.webm';
    if (audioChunk.type === 'audio/mp4' || audioChunk.type === 'audio/m4a') {
      fileExtension = '.m4a';
    } else if (audioChunk.type === 'audio/wav') {
      fileExtension = '.wav';
    } else if (audioChunk.type === 'audio/mpeg') {
      fileExtension = '.mp3';
    }
    
    const chunkPath = join(tempDir, `${chunkId}${fileExtension}`);
    
    console.log(`[whisper-stream] Saving audio chunk to ${chunkPath} with type ${audioChunk.type}`);
    
    // Convert file to buffer and save
    const bytes = await audioChunk.arrayBuffer();
    console.log(`[whisper-stream] Audio chunk array buffer size: ${bytes.byteLength} bytes`);
    await writeFile(chunkPath, new Uint8Array(bytes));
    
    // Verify the file was written
    if (!fs.existsSync(chunkPath) || fs.statSync(chunkPath).size === 0) {
      throw new Error(`Failed to write audio file or file is empty: ${chunkPath}`);
    }
    
    // Create a readable stream from the file
    const fileStream = fs.createReadStream(chunkPath);
    
    console.log('[whisper-stream] Sending to OpenAI Whisper API');
    
    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'en', // Explicitly set to English for better results
      response_format: 'json',
    });
    
    console.log(`[whisper-stream] Transcription result: "${transcription.text}"`);
    
    // Clean up the temporary file
    fs.unlink(chunkPath, (err) => {
      if (err) console.error('[whisper-stream] Error deleting temporary chunk file:', err);
      else console.log(`[whisper-stream] Deleted temporary file: ${chunkPath}`);
    });
    
    return NextResponse.json({
      transcription: transcription.text,
      chunkId: chunkId,
      completed: true
    });
  } catch (error) {
    console.error('[whisper-stream] Error processing audio stream:', error);
    
    // Include more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: "Failed to transcribe audio", 
        details: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    );
  }
} 