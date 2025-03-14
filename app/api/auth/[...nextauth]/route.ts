import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Force Node.js runtime to support jsonwebtoken and bcrypt
export const runtime = 'nodejs';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 