import { NextRequest, NextResponse } from 'next/server';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';

// Define runtime configuration
export const runtime = 'nodejs'; // Force Node.js runtime instead of Edge

interface TranscriptionData {
  text: string;
  timestamp: number;
}

// Store active WebSocket connections by session ID
export const activeConnections = new Map<string, WebSocket>();

// Store transcription data by session ID
export const transcriptionData = new Map<string, TranscriptionData>();

// Create WebSocket server
let wss: WebSocketServer;
try {
  const server = createServer();
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
  
    ws.on('message', async (data: Buffer) => {
      try {
        // Get the OpenAI API key from environment variables
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          ws.send(JSON.stringify({ error: 'OpenAI API key not configured' }));
          return;
        }
  
        // Convert audio data to base64
        const audioData = data.toString('base64');
  
        // Create FormData with the audio data
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', Buffer.from(audioData, 'base64'), { filename: 'audio.webm' });
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
  
        // Send to OpenAI API
        const axios = require('axios');
        const response = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              ...formData.getHeaders(),
            },
          }
        );
  
        // Send transcription back to client
        if (response.data && response.data.text) {
          ws.send(JSON.stringify({
            text: response.data.text.trim(),
            result: response.data
          }));
        }
      } catch (error: unknown) {
        console.error('Error processing audio:', error);
        ws.send(JSON.stringify({ error: 'Failed to process audio' }));
      }
    });
  
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
  
  // Start the WebSocket server
  const port = process.env.TRANSCRIPTION_WS_PORT || 3001;
  server.listen(port, () => {
    console.log(`WebSocket server is running on port ${port}`);
  });
} catch (error) {
  console.error('Failed to initialize WebSocket server:', error);
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }
  
  // Check if we have a connection for this session
  const isConnected = activeConnections.has(sessionId);
  
  return NextResponse.json({
    sessionId,
    connected: isConnected
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, action } = body;
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }
  
  if (!action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 });
  }
  
  try {
    // Handle different actions
    switch (action) {
      case 'connect':
        // Register the session ID
        return NextResponse.json({ 
          status: 'connected',
          sessionId
        });
      
      case 'disconnect':
        // Remove any stored data for this session
        transcriptionData.delete(sessionId);
        activeConnections.delete(sessionId);
        return NextResponse.json({
          status: 'disconnected',
          sessionId
        });
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error handling action ${action} for session ${sessionId}:`, error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 