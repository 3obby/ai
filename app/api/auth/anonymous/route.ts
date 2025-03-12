import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prismadb from "@/lib/prismadb";
import { allocateAnonymousTokens } from "@/lib/token-usage";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check if userId is provided in the request
    const { userId } = await request.json().catch(() => ({ userId: null }));
    
    // Generate a new ID if none provided
    const anonymousId = userId || uuidv4();
    console.log(`Processing anonymous user with ID: ${anonymousId}`);
    
    // If userId was provided, just set the cookie and return
    if (userId) {
      // User already exists, just set the cookie in the response
      const response = NextResponse.json({ 
        success: true, 
        userId: anonymousId,
        message: "Anonymous user cookie set"
      });
      
      // Set the cookie in the response
      response.cookies.set('anonymousUserId', anonymousId, {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        path: '/',
        sameSite: 'lax'
      });
      
      return response;
    }
    
    // Create a new user record in the database
    try {
      // Check if user already exists
      const existingUser = await prismadb.user.findUnique({
        where: { id: anonymousId }
      });
      
      if (!existingUser) {
        // Create a new user record
        await prismadb.user.create({
          data: {
            id: anonymousId,
            name: 'Anonymous User',
            email: `anon-${anonymousId}@example.com`
          }
        });
        
        // Allocate tokens to the new user
        await allocateAnonymousTokens(anonymousId);
        console.log(`Created new anonymous user: ${anonymousId}`);
      } else {
        console.log(`Anonymous user ${anonymousId} already exists`);
      }
      
      // Return success response with cookie
      const response = NextResponse.json({
        success: true,
        userId: anonymousId,
        message: "Anonymous user created and cookie set"
      });
      
      // Set the cookie in the response
      response.cookies.set('anonymousUserId', anonymousId, {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        path: '/',
        sameSite: 'lax'
      });
      
      return response;
    } catch (error) {
      console.error('Error creating anonymous user:', error);
      
      // Return error response
      return NextResponse.json({
        success: false,
        error: "Failed to create anonymous user"
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling anonymous user request:', error);
    
    // Return error response
    return NextResponse.json({
      success: false,
      error: "Failed to process request"
    }, { status: 500 });
  }
} 