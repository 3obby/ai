import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";
import { calculateLevel, getXPForNextLevel, getProgressToNextLevel } from "@/lib/level-system";

// Performance monitoring
import { performance } from "perf_hooks";

// For NextAuth we need to use Node.js runtime
// since it uses crypto which isn't available in Edge
export const runtime = 'nodejs';

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const startTime = performance.now();
  try {
    // Get auth session
    const session = await auth();
    const userId = session?.userId;
    
    // Parse query parameters
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;
    
    // Prepare cache headers
    const headers: HeadersInit = {};
    if (!effectiveUserId) {
      // Cache anonymous responses for 5 minutes
      headers["Cache-Control"] = "public, max-age=300, s-maxage=300";
    }
    
    // Run queries in parallel for better performance
    const [categoriesPromise, companionCountPromise, messageCountPromise, userProgressPromise] = [
      // Categories - simple and cacheable
      prismadb.category.findMany({
        orderBy: {
          name: 'asc'
        }
      }),
      
      // Companion count with appropriate filters
      prismadb.companion.count({
        where: effectiveUserId
          ? {
              OR: [
                { private: false },
                { userId: "system" },
                { userId: effectiveUserId }
              ]
            }
          : {
              OR: [
                { private: false },
                { userId: "system" }
              ]
            }
      }),
      
      // Message count only for authenticated users
      effectiveUserId
        ? prismadb.message.count({
            where: {
              userId: effectiveUserId
            }
          })
        : Promise.resolve(0),
      
      // User progress only for authenticated users
      effectiveUserId
        ? prismadb.userUsage.findUnique({
            where: {
              userId: effectiveUserId
            }
          })
        : Promise.resolve(null)
    ];
    
    // Wait for all queries to complete
    const [categories, companionCount, messageCount, userProgress] = await Promise.all([
      categoriesPromise,
      companionCountPromise,
      messageCountPromise,
      userProgressPromise
    ]);
    
    // Calculate user level data if authenticated
    let userLevelData = null;
    if (effectiveUserId && userProgress) {
      const currentTokensBurned = userProgress.totalSpent || 0;
      const currentLevel = calculateLevel(currentTokensBurned);
      const progressToNextLevel = getProgressToNextLevel(currentTokensBurned);
      
      userLevelData = {
        currentLevel,
        nextLevelXP: getXPForNextLevel(currentLevel),
        progressPercentage: progressToNextLevel,
        availableTokens: userProgress.availableTokens || 0,
        burnedTokens: currentTokensBurned,
      };
    }
    
    // Calculate execution time
    const queryTimeMs = Math.round(performance.now() - startTime);
    
    // Return optimized response with performance metrics
    return NextResponse.json({
      categories,
      counts: {
        companions: companionCount,
        messages: messageCount
      },
      userProgress: userLevelData,
      isAnonymous: !effectiveUserId,
      performance: {
        queryTimeMs,
        cached: false
      }
    }, { headers });
    
  } catch (error) {
    console.error("[DASHBOARD_DATA_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 