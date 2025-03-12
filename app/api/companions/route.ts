import { auth } from "@/lib/auth";
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

// For NextAuth we need to use Node.js runtime 
// since it uses crypto which isn't available in Edge
export const runtime = 'nodejs';

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Try to get authenticated user
    const session = await auth();
    const userId = session?.userId;
    const user = session?.user;
    
    // For both anonymous and authenticated users
    // Anonymous users can see public companions
    const companions = await prismadb.companion.findMany({
      where: {
        OR: [
          { private: false }, 
          { userId: "system" },
          // Only include user's private companions if authenticated
          ...(userId ? [{ userId }] : [])
        ],
      },
      select: {
        id: true,
        name: true,
        src: true,
        categoryId: true,
        userName: true,  // Make sure userName is included for display
        tokensBurned: true, // Include tokensBurned for global stats
        // Only include these fields for authenticated users
        ...(userId ? { 
          private: true,
          userId: true 
        } : {}),
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If logged in, fetch user-specific burned tokens data
    if (userId) {
      // Get user burned tokens for these companions
      const userBurnedTokens = await prismadb.userBurnedTokens.findMany({
        where: {
          userId,
          companionId: {
            in: companions.map(companion => companion.id)
          }
        }
      });
      
      // Attach user burned tokens to companions
      const companionsWithUserTokens = companions.map(companion => ({
        ...companion,
        userBurnedTokens: userBurnedTokens.filter(
          token => token.companionId === companion.id
        )
      }));
      
      return NextResponse.json(companionsWithUserTokens);
    }

    return NextResponse.json(companions);
  } catch (error) {
    console.log("[COMPANIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
