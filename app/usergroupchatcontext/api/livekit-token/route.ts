import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req: NextRequest) {
  try {
    // Get LiveKit API Key and Secret from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    console.log('LiveKit token API called, credentials available:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });
    
    if (!apiKey || !apiSecret) {
      console.warn('LiveKit API Key or Secret not configured, using fallback token');
      
      // Return a fallback response for development
      return NextResponse.json({
        token: "DEVELOPMENT_FALLBACK_TOKEN", 
        roomName: "default-room",
        userId: `user-${Date.now()}`,
        note: "This is a development fallback token"
      });
    }
    
    // Generate a token for the user
    const roomName = 'default-room';
    const userId = `user-${Date.now()}`;
    const userName = 'User';
    
    try {
      // Create a new access token
      const token = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        name: userName,
      });
      
      // Add user permissions
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      
      // Generate JWT
      const jwt = token.toJwt();
      console.log(`Generated LiveKit token for ${userId} in room ${roomName}`);
      
      // Return the token as JSON
      return NextResponse.json({
        token: jwt,
        roomName,
        userId,
      });
    } catch (tokenError) {
      console.error('Error generating LiveKit token:', tokenError);
      throw tokenError;
    }
  } catch (error) {
    console.error('Error processing LiveKit token request:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate LiveKit token', 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
} 