import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

// Get the current authentication session from NextAuth
export async function getAuthSession() {
  return await getServerSession(authOptions);
}

// Authentication helper that returns the user ID or redirects
export async function auth() {
  const session = await getAuthSession();
  
  return {
    userId: session?.user?.id,
    user: session?.user,
  };
}

// Get server authentication status (used for UI conditional rendering)
export function getServerAuthStatus() {
  return {
    isAuthenticated: async () => {
      const session = await getAuthSession();
      return !!session?.user?.id;
    },
    getCurrentUser: async () => {
      const session = await getAuthSession();
      return session?.user;
    },
  };
} 