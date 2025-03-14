import { NextRequest, NextResponse } from 'next/server';
import { transcriptionData } from '../route';

// Define runtime configuration
export const runtime = 'nodejs'; // Force Node.js runtime instead of Edge

// Store transcription data from the WebRTC service
// Since the WebRTC service doesn't use our server for the actual transcription,
// we'll create an in-memory store for transcriptions that the client can update
export const webrtcTranscriptionData = new Map<string, { text: string, timestamp: number }>();

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }
  
  // Get transcription data for this session
  // Check both the old transcription data and the WebRTC transcription data
  const data = transcriptionData.get(sessionId) || webrtcTranscriptionData.get(sessionId);
  
  if (!data) {
    return NextResponse.json({ error: 'No transcription data found for this session' }, { status: 404 });
  }
  
  return NextResponse.json({
    sessionId,
    transcription: data.text,
    timestamp: data.timestamp
  });
}

// Add a POST endpoint to allow the client to update transcription data
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, transcription } = body;
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }
  
  if (typeof transcription !== 'string') {
    return NextResponse.json({ error: 'Transcription must be a string' }, { status: 400 });
  }
  
  // Update the WebRTC transcription data
  webrtcTranscriptionData.set(sessionId, {
    text: transcription,
    timestamp: Date.now()
  });
  
  return NextResponse.json({
    status: 'updated',
    sessionId
  });
} 