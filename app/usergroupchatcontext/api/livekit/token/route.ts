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
    
    // Validate API credentials
    if (!apiKey || !apiSecret) {
      console.error('LiveKit API credentials are not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    let token: string;
    
    // Generate token based on type
    switch (type) {
      case 'user':
        token = createUserToken(apiKey, apiSecret, roomName, id, name);
        break;
      case 'assistant':
        token = createAssistantToken(apiKey, apiSecret, roomName, id);
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
    
    // Validate required parameters
    if (!type || !roomName || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get API key and secret from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    // Validate API credentials
    if (!apiKey || !apiSecret) {
      console.error('LiveKit API credentials are not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    let token: string;
    
    // Generate token based on type
    switch (type) {
      case 'user':
        token = createUserToken(apiKey, apiSecret, roomName, id, name || undefined);
        break;
      case 'assistant':
        token = createAssistantToken(apiKey, apiSecret, roomName, id);
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