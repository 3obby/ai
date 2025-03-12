import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// For NextAuth we need to use Node.js runtime 
// since it uses crypto which isn't available in Edge
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      authenticated: !!session,
      user: session?.user || null
    }, { status: 200 });
  } catch (error) {
    console.error("[AUTH_STATUS_ERROR]", error);
    return NextResponse.json({
      authenticated: false,
      error: "Failed to check authentication status"
    }, { status: 500 });
  }
} 