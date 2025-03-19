'use server';

import { v4 as uuidv4 } from 'uuid';
import prismadb from "@/lib/prismadb";
import { cookies } from "next/headers";
import { allocateAnonymousTokens } from "@/lib/token-usage";
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache';
import { fetchWithBaseUrl } from '@/lib/url-helper';

// Server action to get or create an anonymous user with proper cookie handling
export async function getOrCreateAnonymousUser(): Promise<string> {
  // In Next.js 15, cookies() is async and must be awaited
  const cookieStore = await cookies();
  const anonymousUserId = cookieStore.get('anonymousUserId')?.value;
  
  // Get origin for absolute URLs (required in Next.js 15)
  const origin = process.env.NEXTAUTH_URL || 
                 process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                 'http://localhost:3000';
  
  // If anonymousUserId cookie exists, check if user exists in DB
  if (anonymousUserId) {
    try {
      const existingUser = await prismadb.user.findUnique({
        where: { id: anonymousUserId },
        select: { id: true }
      });
      
      if (existingUser) {
        console.log(`Reusing existing anonymous user with ID: ${anonymousUserId}`);
        
        // Call API route to ensure cookie is set (for Next.js 15 compatibility)
        try {
          await fetchWithBaseUrl('/api/auth/anonymous', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: anonymousUserId }),
          });
        } catch (error) {
          console.error('Error calling anonymous API route:', error);
          // Continue anyway as we already have the user ID
        }
        
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
    // Call API endpoint to create anonymous user and set cookie in response
    const response = await fetchWithBaseUrl('/api/auth/anonymous', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Successfully created anonymous user via API:', data.userId);
      return data.userId;
    } else {
      throw new Error(data.error || 'Failed to create anonymous user');
    }
  } catch (error) {
    console.error('Error creating anonymous user:', error);
    // Return a temporary ID if we fail - this allows the user to at least use the app
    // even if their data won't be persisted
    return `temp-${uuidv4()}`;
  }
}

// Server action to set anonymous user ID cookie (for client components)
export async function setAnonymousUserCookie(formData: FormData) {
  const userId = formData.get('userId') as string;
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  // Get origin for absolute URLs (required in Next.js 15)
  const origin = process.env.NEXTAUTH_URL || 
                 process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                 'http://localhost:3000';
  
  try {
    // Use the API endpoint to set the cookie
    const response = await fetchWithBaseUrl('/api/auth/anonymous', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error setting anonymous user cookie:', error);
    return { success: false, error: 'Failed to set cookie' };
  }
} 