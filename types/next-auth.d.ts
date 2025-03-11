import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      isAnonymous?: boolean;
    } & DefaultSession["user"];
  }
  
  // Add isAnonymous to User interface
  interface User {
    id: string;
    isAnonymous?: boolean;
    name?: string;
    email?: string;
    image?: string;
  }
} 