import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

// Helper function to validate environment variables
function validateEnvVars() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('LIVEKIT_API_KEY environment variable is missing or empty');
    return false;
  }
  
  if (!apiSecret || apiSecret.trim() === '') {
    console.error('LIVEKIT_API_SECRET environment variable is missing or empty');
    return false;
  }
  
  return true;
}

export async function GET(req: NextRequest) {
  try {
    // Get LiveKit API Key and Secret from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    console.log('LiveKit token API called, credentials available:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiSecretLength: apiSecret ? apiSecret.length : 0
    });
    
    if (!validateEnvVars()) {
      console.warn('LiveKit API credentials validation failed, using fallback token');
      
      // Return a fallback response for development with a more unique token
      const fallbackToken = `DEV_FALLBACK_TOKEN_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      return NextResponse.json({
        token: fallbackToken, 
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
      const token = new AccessToken(apiKey!, apiSecret!, {
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
      const jwt = await token.toJwt();
      console.log(`Generated LiveKit token for ${userId} in room ${roomName}, token length: ${jwt.length}`);
      
      // Return the token as JSON with additional debugging info
      const response = {
        token: jwt,
        roomName,
        userId,
        tokenLength: jwt.length,
        timestamp: Date.now()
      };
      
      // Final validation to prevent empty response
      if (!response.token || typeof response.token !== 'string' || response.token.length === 0) {
        console.error('Generated token is empty or invalid:', response);
        return NextResponse.json(
          { 
            error: 'Generated LiveKit token is empty or invalid',
            timestamp: Date.now()
          }, 
          { status: 500 }
        );
      }
      
      // Log the response structure (not the actual token for security)
      console.log('Returning token response with keys:', Object.keys(response));
      
      return NextResponse.json(response);
    } catch (tokenError) {
      console.error('Error generating LiveKit token:', tokenError);
      
      // Return a more detailed error response
      return NextResponse.json(
        { 
          error: 'Failed to generate LiveKit token during creation', 
          details: tokenError instanceof Error ? tokenError.message : String(tokenError),
          timestamp: Date.now()
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing LiveKit token request:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate LiveKit token', 
        details: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      }, 
      { status: 500 }
    );
  }
} 