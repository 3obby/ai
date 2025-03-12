'use server';

import { v4 as uuidv4 } from 'uuid';
import prismadb from "@/lib/prismadb";
import { cookies } from "next/headers";
import { allocateAnonymousTokens } from "@/lib/token-usage";

// Server action to get or create an anonymous user with proper cookie handling
export async function getOrCreateAnonymousUser(): Promise<string> {
  // In Next.js 15, cookies() is async and must be awaited
  const cookieStore = await cookies();
  const anonymousUserId = cookieStore.get('anonymousUserId')?.value;
  
  // If anonymousUserId cookie exists, check if user exists in DB
  if (anonymousUserId) {
    try {
      const existingUser = await prismadb.user.findUnique({
        where: { id: anonymousUserId }
      });
      
      if (existingUser) {
        console.log(`Reusing existing anonymous user with ID: ${anonymousUserId}`);
        return anonymousUserId;
      }
      // User not found in DB, will create a new one
    } catch (error) {
      console.error('Error checking existing anonymous user:', error);
      // Continue to create a new user
    }
  }
  
  // Generate a new anonymous user ID
  const newAnonymousId = uuidv4();
  
  console.log(`Creating new anonymous user with ID: ${newAnonymousId}`);
  
  try {
    // Create a new user record with minimal required fields
    await prismadb.user.create({
      data: {
        id: newAnonymousId,
        name: 'Anonymous User',
        email: `anon-${newAnonymousId}@example.com`
      }
    });
    
    // Allocate tokens to the anonymous user
    await allocateAnonymousTokens(newAnonymousId);
    
    // Set the cookie - using cookies API as a Server Action which is allowed
    // In Next.js 15, we also need to await cookies() here
    const setCookieStore = await cookies();
    // Format: key, value, options
    setCookieStore.set('anonymousUserId', newAnonymousId, {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      path: '/',
      sameSite: 'lax'
    });
    
    console.log(`Successfully created new anonymous user: ${newAnonymousId}`);
    return newAnonymousId;
  } catch (error) {
    console.error('Error creating anonymous user:', error);
    // Return a temporary ID if we fail - this allows the user to at least use the app
    // even if their data won't be persisted
    return `temp-${uuidv4()}`;
  }
} 