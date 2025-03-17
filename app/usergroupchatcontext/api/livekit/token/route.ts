import { NextRequest, NextResponse } from 'next/server';
import { createUserToken, createAssistantToken } from '../../../utils/livekit-auth';

/**
 * API route for generating LiveKit tokens
 * This enables secure token generation from the client
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Extract required parameters
    const { type, roomName, id, name } = body;
    
    // Validate required parameters
    if (!type || !roomName || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get API key and secret from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    // Debug for troubleshooting
    console.log('Using LiveKit credentials for:', process.env.NEXT_PUBLIC_LIVEKIT_URL);
    console.log('API Key used (first 6 chars):', apiKey?.substring(0, 6));
    
    // Validate API credentials with detailed error message
    if (!apiKey || !apiSecret) {
      console.error('LiveKit API credentials are not configured. Make sure to add the following environment variables to your .env.local file:');
      console.error('LIVEKIT_API_KEY=your-livekit-api-key');
      console.error('LIVEKIT_API_SECRET=your-livekit-api-secret');
      console.error('NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud');
      
      return NextResponse.json({ 
        error: 'Server configuration error: LiveKit API credentials missing', 
        details: 'Make sure LIVEKIT_API_KEY and LIVEKIT_API_SECRET are set in your .env.local file' 
      }, { status: 500 });
    }
    
    let token: string;
    
    // Generate token based on type
    switch (type) {
      case 'user':
        token = await createUserToken(apiKey, apiSecret, roomName, id, name);
        break;
      case 'assistant':
        token = await createAssistantToken(apiKey, apiSecret, roomName, id);
        break;
      default:
        return NextResponse.json({ error: 'Invalid participant type' }, { status: 400 });
    }
    
    // Return the token
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}

/**
 * GET handler for token generation (with query parameters)
 */
export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const roomName = searchParams.get('roomName');
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    
    console.log('LiveKit token request:', { type, roomName, id, name });
    
    // Validate required parameters
    if (!type || !roomName || !id) {
      console.error('Missing required parameters for token generation', { type, roomName, id });
      return NextResponse.json({ error: 'Missing required parameters for token generation' }, { status: 400 });
    }
    
    // Get API key and secret from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    // Debug for troubleshooting
    console.log('Using LiveKit credentials for:', process.env.NEXT_PUBLIC_LIVEKIT_URL);
    console.log('API Key used (first 6 chars):', apiKey?.substring(0, 6));
    
    // Validate API credentials with detailed error message
    if (!apiKey || !apiSecret) {
      console.error('LiveKit API credentials are not configured. Make sure to add the following environment variables to your .env.local file:');
      console.error('LIVEKIT_API_KEY=your-livekit-api-key');
      console.error('LIVEKIT_API_SECRET=your-livekit-api-secret');
      console.error('NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud');
      
      return NextResponse.json({ 
        error: 'Server configuration error: LiveKit API credentials missing', 
        details: 'Make sure LIVEKIT_API_KEY and LIVEKIT_API_SECRET are set in your .env.local file' 
      }, { status: 500 });
    }
    
    let token: string;
    
    // Generate token based on type
    try {
      switch (type) {
        case 'user':
          token = await createUserToken(apiKey, apiSecret, roomName, id, name || undefined);
          console.log('Generated user token for room:', roomName);
          break;
        case 'assistant':
          token = await createAssistantToken(apiKey, apiSecret, roomName, id);
          console.log('Generated assistant token for room:', roomName);
          break;
        default:
          console.error('Invalid participant type:', type);
          return NextResponse.json({ error: 'Invalid participant type' }, { status: 400 });
      }
    } catch (tokenError) {
      console.error('Error generating token:', tokenError);
      return NextResponse.json({ 
        error: 'Failed to generate token', 
        details: tokenError instanceof Error ? tokenError.message : 'Unknown token generation error' 
      }, { status: 500 });
    }
    
    // Return the token
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json({ 
      error: 'Failed to generate token', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 