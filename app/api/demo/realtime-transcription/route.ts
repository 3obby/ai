import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

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
  const { sessionId, action, audioData } = body;
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }
  
  if (!action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 });
  }
  
  // Handle different actions
  switch (action) {
    case 'connect':
      return handleConnect(sessionId);
    
    case 'sendAudio':
      return handleSendAudio(sessionId, audioData);
    
    case 'disconnect':
      return handleDisconnect(sessionId);
    
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function handleConnect(sessionId: string) {
  // Check if we already have a connection for this session
  if (activeConnections.has(sessionId)) {
    return NextResponse.json({ 
      status: 'already_connected',
      sessionId 
    });
  }
  
  try {
    // Get the OpenAI API key from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    // Create a new WebSocket connection to OpenAI with authentication
    const ws = new WebSocket('wss://api.openai.com/v1/audio/transcriptions', {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Save the connection
    activeConnections.set(sessionId, ws);
    
    // Initialize transcription data
    transcriptionData.set(sessionId, { text: '', timestamp: Date.now() });
    
    // Set up event handlers
    ws.on('open', () => {
      console.log(`WebSocket connection opened for session ${sessionId}`);
      
      // Send initialization message - OpenAI's transcription API doesn't require explicit initialization
      // since it works on a per-request basis
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'transcription') {
          // Update stored transcription
          transcriptionData.set(sessionId, {
            text: message.text,
            timestamp: Date.now()
          });
          
          console.log(`Transcription for ${sessionId}: ${message.text}`);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
    });
    
    ws.on('close', () => {
      console.log(`WebSocket connection closed for session ${sessionId}`);
      activeConnections.delete(sessionId);
    });
    
    return NextResponse.json({
      status: 'connected',
      sessionId
    });
  } catch (error) {
    console.error(`Error creating WebSocket connection for session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to establish connection' }, { status: 500 });
  }
}

async function handleSendAudio(sessionId: string, audioData: string) {
  let ws = activeConnections.get(sessionId);
  
  if (!ws) {
    return NextResponse.json({ error: 'No active connection for this session' }, { status: 404 });
  }
  
  if (ws.readyState !== WebSocket.OPEN) {
    // Try to reconnect if the connection was closed unexpectedly
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      console.log(`Connection closed for session ${sessionId}, attempting to reconnect`);
      
      // Remove the old connection
      activeConnections.delete(sessionId);
      
      // Attempt to reestablish the connection
      const reconnectResponse = await handleConnect(sessionId);
      
      // Check if reconnection was successful
      const reconnectData = await reconnectResponse.json();
      if (reconnectData.error) {
        return NextResponse.json({ error: 'Connection lost and reconnection failed' }, { status: 503 });
      }
      
      // Get the new connection
      const newWs = activeConnections.get(sessionId);
      if (!newWs || newWs.readyState !== WebSocket.OPEN) {
        return NextResponse.json({ error: 'Reconnection succeeded but connection not ready' }, { status: 503 });
      }
      
      // Update our reference
      ws = newWs;
    } else {
      return NextResponse.json({ error: 'Connection is not open' }, { status: 400 });
    }
  }
  
  try {
    // Instead of using WebSockets directly, let's use the REST API for OpenAI Whisper
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    // Convert base64 to binary
    const binaryData = Buffer.from(audioData, 'base64');
    
    // Create a temporary file name
    const fileName = `${sessionId}-${Date.now()}.webm`;
    const filePath = `/tmp/${fileName}`;
    
    // Write the file to disk
    const fs = require('fs');
    fs.writeFileSync(filePath, binaryData);
    
    // Create FormData with the file
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
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
    
    // Update the transcription data
    if (response.data && response.data.text) {
      const text = response.data.text.trim();
      
      // Update stored transcription with incremental text
      const currentData = transcriptionData.get(sessionId) || { text: '', timestamp: 0 };
      const updatedText = currentData.text 
        ? `${currentData.text} ${text}` 
        : text;
      
      transcriptionData.set(sessionId, {
        text: updatedText,
        timestamp: Date.now()
      });
      
      console.log(`Transcription for ${sessionId}: ${text}`);
    }
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }
    
    return NextResponse.json({
      status: 'audio_processed',
      sessionId
    });
  } catch (error) {
    console.error(`Error processing audio data for session ${sessionId}:`, error);
    return NextResponse.json({ 
      error: 'Failed to process audio data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function handleDisconnect(sessionId: string) {
  const ws = activeConnections.get(sessionId);
  
  if (!ws) {
    return NextResponse.json({
      status: 'not_connected',
      sessionId
    });
  }
  
  try {
    // Close the WebSocket connection
    ws.close();
    
    // Remove from our maps
    activeConnections.delete(sessionId);
    transcriptionData.delete(sessionId);
    
    return NextResponse.json({
      status: 'disconnected',
      sessionId
    });
  } catch (error) {
    console.error(`Error closing WebSocket connection for session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
} 