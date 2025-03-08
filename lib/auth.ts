import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export const dynamic = 'force-dynamic';

/**
 * Get the current session on the server side
 */
export async function auth() {
  const session = await getServerSession(authOptions);
  return session;
}

/**
 * Get authentication status information for server components
 */
export async function getServerAuthStatus() {
  const session = await auth();
  
  return { 
    isSignedIn: !!session?.user?.id, 
    userId: session?.user?.id || null 
  };
}

/**
 * Gets the current authentication session
 * Alias for auth() for backward compatibility
 */
export async function getAuthSession() {
  return auth();
}
