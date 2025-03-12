import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Get the current session on the server side
 */
export async function auth() {
  const session = await getServerSession(authOptions);
  
  return {
    userId: session?.user?.id,
    user: session?.user,
  };
}

/**
 * Get authentication status information for server components
 */
export async function getServerAuthStatus() {
  const session = await getServerSession(authOptions);
  
  return { 
    isSignedIn: !!session?.user?.id, 
    userId: session?.user?.id || null 
  };
}

/**
 * Gets the current authentication session
 * Alias for getServerSession for backward compatibility
 */
export async function getAuthSession() {
  return getServerSession(authOptions);
}
