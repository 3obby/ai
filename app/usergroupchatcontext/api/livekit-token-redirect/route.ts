import { NextRequest, NextResponse } from 'next/server';

// Simple redirecting handler to support both paths
export async function GET(req: NextRequest) {
  // Get the token from the actual handler
  const actualEndpoint = new URL('/api/livekit-token/', req.nextUrl.origin);
  
  try {
    console.log(`[DEBUG] Redirecting LiveKit token request to ${actualEndpoint}`);
    const response = await fetch(actualEndpoint);
    
    // If the fetch fails, return the error
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }
    
    // Return the successful response
    const data = await response.json();
    console.log('[DEBUG] Successfully redirected LiveKit token request');
    return NextResponse.json(data);
  } catch (error) {
    console.error('[DEBUG] Error in livekit-token redirect handler:', error);
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