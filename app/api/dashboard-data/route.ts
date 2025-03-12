import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";
import { calculateLevel, getXPForNextLevel, getProgressToNextLevel } from "@/lib/level-system";
import { getFromCache, setCache } from "@/lib/redis-cache";

// Performance monitoring
import { performance } from "perf_hooks";

// For NextAuth we need to use Node.js runtime
// since it uses crypto which isn't available in Edge
export const runtime = 'nodejs';

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Cache control for anonymous users
export const revalidate = 60; // 1 minute revalidation for all users

export async function GET(req: Request) {
  const startTime = performance.now();
  try {
    console.log("[DASHBOARD_DATA] Request started");
    
    // Get auth session
    const session = await auth();
    const userId = session?.userId;
    
    // Parse query parameters
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('userId');
    const timestamp = url.searchParams.get('_t');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;
    const isAnonymous = !effectiveUserId;
    
    // Try to get from cache first for anonymous users
    if (isAnonymous && timestamp) {
      try {
        const cacheKey = `dashboard-data:anon:${timestamp.substring(0, 8)}`;
        const cachedData = await getFromCache(cacheKey);
        if (cachedData) {
          console.log(`[DASHBOARD_DATA] Using cached data for anonymous user`);
          return NextResponse.json(cachedData, {
            headers: {
              'X-Cache': 'HIT',
              'Cache-Control': 'public, max-age=300, s-maxage=300',
            }
          });
        }
      } catch (cacheError) {
        console.error('[DASHBOARD_DATA] Cache error:', cacheError);
        // Continue with DB query
      }
    }
    
    // Prepare cache headers
    const headers: HeadersInit = {};
    if (isAnonymous) {
      // Cache anonymous responses for 5 minutes
      headers["Cache-Control"] = "public, max-age=300, s-maxage=300";
    }
    
    // Run queries in parallel for better performance with timeouts
    console.log(`[DASHBOARD_DATA] Fetching data for ${isAnonymous ? 'anonymous user' : `user ${effectiveUserId}`}`);
    
    // Use longer timeouts for anonymous users
    const queryTimeout = isAnonymous ? 6000 : 3000; // 6 seconds for anon, 3 for logged in
    
    // Wrap each query in a promise race with timeout to prevent slow queries
    const categoriesPromise = Promise.race([
      // Categories - simple and cacheable
      prismadb.category.findMany({
        orderBy: {
          name: 'asc'
        },
        // Only select needed fields for better performance
        select: {
          id: true,
          name: true
        }
      }),
      // Longer timeout
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Categories query timeout')), queryTimeout)
      )
    ]).catch(err => {
      console.error("[DASHBOARD_DATA] Categories query error:", err);
      return []; // Return empty array if categories query fails
    });
    
    const companionCountPromise = Promise.race([
      // Use a raw query for better performance on large tables
      prismadb.$queryRaw`
        SELECT COUNT(*) as count FROM "Companion" 
        WHERE (private = false OR "userId" = 'system') 
      `,
      // Longer timeout
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Companion count query timeout')), queryTimeout)
      )
    ]).catch(err => {
      console.error("[DASHBOARD_DATA] Companion count query error:", err);
      return [{ count: 0 }]; // Return 0 if count query fails
    });
    
    // Message count only for authenticated users
    const messageCountPromise = effectiveUserId
      ? Promise.race([
          prismadb.$queryRaw`
            SELECT COUNT(*) as count FROM "Message"
            WHERE "userId" = ${effectiveUserId}
          `,
          // Timeout after timeout period
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Message count query timeout')), queryTimeout)
          )
        ]).catch(err => {
          console.error("[DASHBOARD_DATA] Message count query error:", err);
          return [{ count: 0 }]; // Return 0 if count query fails
        })
      : Promise.resolve([{ count: 0 }]);
    
    // User progress only for authenticated users
    const userProgressPromise = effectiveUserId
      ? Promise.race([
          prismadb.userUsage.findUnique({
            where: {
              userId: effectiveUserId
            },
            select: {
              availableTokens: true,
              totalSpent: true
            }
          }),
          // Timeout after timeout period
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('User progress query timeout')), queryTimeout)
          )
        ]).catch(err => {
          console.error("[DASHBOARD_DATA] User progress query error:", err);
          return null; // Return null if query fails
        })
      : Promise.resolve(null);
    
    console.log(`[DASHBOARD_DATA] All queries dispatched, waiting for results`);
    
    // Use Promise.allSettled to handle partial failures gracefully
    const results = await Promise.allSettled([
      categoriesPromise,
      companionCountPromise,
      messageCountPromise,
      userProgressPromise
    ]);
    
    // Process results with fallbacks for any failures
    const categories = results[0].status === 'fulfilled' ? results[0].value : [];
    
    // Handle bigint conversion and safe extraction
    let companionCount = 0;
    if (results[1].status === 'fulfilled') {
      const countResult = results[1].value;
      if (Array.isArray(countResult) && countResult.length > 0) {
        companionCount = Number(countResult[0]?.count || 0);
      } 
    }
    
    // Handle bigint conversion and safe extraction for message count
    let messageCount = 0;
    if (results[2].status === 'fulfilled') {
      const msgCountResult = results[2].value;
      if (Array.isArray(msgCountResult) && msgCountResult.length > 0) {
        messageCount = Number(msgCountResult[0]?.count || 0);
      }
    }
    
    const userProgress = results[3].status === 'fulfilled' ? results[3].value : null;
    
    console.log(`[DASHBOARD_DATA] Processing query results`);
    
    // Calculate user level data if authenticated
    let userLevelData = null;
    if (effectiveUserId && userProgress) {
      // Use type assertion or optional chaining with default values to handle
      // potential undefined properties safely
      const totalSpent = userProgress ? (userProgress as any).totalSpent || 0 : 0;
      const currentTokensBurned = Number(totalSpent);
      const currentLevel = calculateLevel(currentTokensBurned);
      const progressToNextLevel = getProgressToNextLevel(currentTokensBurned);
      
      // Get availableTokens safely using type assertion
      const availableTokens = userProgress ? Number((userProgress as any).availableTokens || 0) : 0;
      
      userLevelData = {
        currentLevel,
        nextLevelXP: getXPForNextLevel(currentLevel),
        progressPercentage: progressToNextLevel,
        availableTokens: availableTokens,
        burnedTokens: currentTokensBurned,
      };
    }
    
    // Calculate execution time
    const queryTimeMs = Math.round(performance.now() - startTime);
    console.log(`[DASHBOARD_DATA] Query completed in ${queryTimeMs}ms`);
    
    // Prepare response data
    const responseData = {
      categories,
      counts: {
        companions: companionCount,
        messages: messageCount
      },
      userProgress: userLevelData,
      isAnonymous: isAnonymous,
      performance: {
        queryTimeMs,
        cached: false
      }
    };
    
    // Cache for anonymous users
    if (isAnonymous && timestamp) {
      try {
        const cacheKey = `dashboard-data:anon:${timestamp.substring(0, 8)}`;
        await setCache(cacheKey, responseData, 300); // 5 minute TTL
        console.log(`[DASHBOARD_DATA] Cached data for anonymous user`);
      } catch (cacheError) {
        console.error('[DASHBOARD_DATA] Caching error:', cacheError);
      }
    }
    
    // Return optimized response with performance metrics
    return NextResponse.json(responseData, { headers });
    
  } catch (error) {
    const queryTimeMs = Math.round(performance.now() - startTime);
    console.error("[DASHBOARD_DATA_ERROR]", error);
    
    // Return a minimal response instead of a 500 error
    // This helps the client continue functioning even when the server has issues
    return NextResponse.json({
      categories: [],
      counts: {
        companions: 0,
        messages: 0
      },
      userProgress: null,
      isAnonymous: true,
      performance: {
        queryTimeMs,
        cached: false,
        error: true
      }
    }, { status: 200 }); // Return 200 with empty data instead of 500
  }
} 