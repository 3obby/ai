import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { calculateLevel, getXPForNextLevel, getProgressToNextLevel } from "@/lib/level-system";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { getFromCache, getChunkedFromCache, setCache, setCacheWithChunking } from "@/lib/redis-cache";

// For NextAuth we need to use Node.js runtime 
// since it uses crypto which isn't available in Edge
export const runtime = 'nodejs';
export const revalidate = 10; // 10 seconds

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Helper function to safely convert BigInt to Number
function safeNumberConversion(value: any): number {
  if (typeof value === 'bigint') {
    // If the bigint is too large for a number, use a safe conversion
    return Number(value.toString()); 
  } else if (typeof value === 'string' && !isNaN(Number(value))) {
    return Number(value);
  }
  return value || 0;
}

export async function GET(req: Request) {
  try {
    // Track request timing
    const startTime = Date.now();
    
    // Cache for 5 minutes if no user is logged in
    let headers: HeadersInit = {};
    
    // Get user session
    const session = await auth();
    const userId = session?.userId;
    
    // Use query parameters for filtering
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const skip = (page - 1) * pageSize;
    
    // Generate cache key based on request params
    const cacheKey = `dashboard:${userId || 'anon'}:${categoryId || 'all'}:${page}:${pageSize}`;
    
    // For anonymous users, try to get from cache first
    if (!userId) {
      const cachedData = await getChunkedFromCache(cacheKey);
      if (cachedData) {
        console.log(`[DASHBOARD_PREFETCH] Cache hit for ${cacheKey}`);
        return NextResponse.json(cachedData, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
            'CDN-Cache-Control': 'public, max-age=300, s-maxage=300'
          }
        });
      }
    }
    
    // Create base query depending on whether we should use the materialized view
    let useView = true;
    
    try {
      // Check if the view exists
      await prismadb.$queryRaw`SELECT 1 FROM "mv_dashboard_companions" LIMIT 1`;
    } catch (e) {
      console.log("[DASHBOARD_PREFETCH] Materialized view not found, falling back to direct queries");
      useView = false;
    }
    
    // Execute queries in parallel for better performance
    const categoriesPromise = prismadb.category.findMany({
      orderBy: {
        name: 'asc'
      },
      // Limit fields for better performance
      select: {
        id: true,
        name: true
      }
    });
    
    let companionsPromise;
    let countPromise;
    
    if (useView) {
      // Use the much faster materialized view if available
      const viewWhereClause = categoryId 
        ? Prisma.sql`WHERE "categoryId" = ${categoryId}`
        : Prisma.sql``;
        
      // Get count from view with a timeout
      countPromise = Promise.race([
        prismadb.$queryRaw`
          SELECT COUNT(*) as count FROM "mv_dashboard_companions"
          ${viewWhereClause}
        `,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Count query timeout')), 1000)
        )
      ]).catch(err => {
        console.log("[DASHBOARD_PREFETCH] Count query timeout, using estimate:", err);
        return [{ count: 100 }]; // Fallback to an estimate
      });
      
      // Get data from view with pagination and optimized field selection
      companionsPromise = prismadb.$queryRaw`
        SELECT 
          id, name, src, description, "categoryId", "userName", 
          "isFree", global, "createdAt", views, votes
        FROM "mv_dashboard_companions"
        ${viewWhereClause}
        LIMIT ${pageSize} OFFSET ${skip}
      `;
    } else {
      // Fall back to the original query with optimizations
      const whereCondition: Prisma.CompanionWhereInput = {
        OR: [
          { private: false },
          { userId: "system" },
          ...(userId ? [{ userId }] : [])
        ],
        ...(categoryId ? { categoryId } : {})
      };
      
      // Select only needed fields to reduce query size and processing time
      companionsPromise = prismadb.companion.findMany({
        where: whereCondition,
        select: {
          id: true,
          userId: true,
          userName: true,
          src: true,
          name: true,
          description: true,
          categoryId: true,
          isFree: true,
          global: true,
          createdAt: true,
          views: true,
          votes: true,
          // Exclude large fields like instructions, seed, etc.
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize,
      });
    
      // Use an SQL count query instead
      countPromise = prismadb.$queryRaw`
        SELECT COUNT(*) as count FROM "Companion" 
        WHERE (private = false OR "userId" = 'system' ${userId ? Prisma.sql`OR "userId" = ${userId}` : Prisma.empty})
        ${categoryId ? Prisma.sql`AND "categoryId" = ${categoryId}` : Prisma.empty}
      `;
    }
    
    // Get user progress (if authenticated)
    const userProgressPromise = userId ? prismadb.userUsage.findUnique({
      where: { userId },
      select: {
        availableTokens: true,
        totalSpent: true
      }
    }) : Promise.resolve(null);
    
    // Wait for all queries to complete
    const [categories, companions, companionsCount, userProgress] = await Promise.all([
      categoriesPromise,
      companionsPromise,
      countPromise,
      userProgressPromise
    ]) as [any, any[], any[], any];
    
    // Process the companions data to ensure consistent structure
    const processedCompanions = companions.map((companion: any) => ({
      ...companion,
      _count: {
        messages: safeNumberConversion(companion.message_count) || 0
      },
      tokensBurned: safeNumberConversion(companion.tokensBurned)
    }));
    
    // For authenticated users, fetch user-specific burned tokens
    let companionsWithUserData = processedCompanions;
    
    if (userId) {
      const userBurnedTokensPromise = prismadb.userBurnedTokens.findMany({
        where: {
          userId,
          companionId: {
            in: processedCompanions.map((c: any) => c.id)
          }
        }
      });
      
      // Load user burned tokens in parallel with other queries
      const userBurnedTokens = await userBurnedTokensPromise;
      
      companionsWithUserData = processedCompanions.map((companion: any) => ({
        ...companion,
        userBurnedTokens: userBurnedTokens.filter(
          token => token.companionId === companion.id
        ).map(token => ({
          ...token,
          tokensBurned: safeNumberConversion(token.tokensBurned)
        }))
      }));
    }
    
    // Prepare response data with safely converted numbers
    const totalCompanions = safeNumberConversion(
      Array.isArray(companionsCount) && companionsCount.length > 0 
        ? companionsCount[0]?.count 
        : 0
    );
    
    // Trim companion data to reduce cache size
    const trimmedCompanions = companionsWithUserData.map(companion => ({
      id: companion.id,
      name: companion.name,
      src: companion.src,
      description: companion.description.substring(0, 100) + (companion.description.length > 100 ? '...' : ''),
      categoryId: companion.categoryId,
      userName: companion.userName,
      isFree: companion.isFree,
      global: companion.global,
      createdAt: companion.createdAt,
      views: companion.views,
      votes: companion.votes,
      // Exclude large fields like instructions, seed, and configuration objects
    }));
    
    const responseData = {
      categories,
      companions: trimmedCompanions, // Use trimmed companions data for response
      totalCompanions,
      currentPage: page,
      pageSize,
      userProgress: userProgress ? {
        availableTokens: safeNumberConversion(userProgress.availableTokens),
        totalSpent: safeNumberConversion(userProgress.totalSpent)
      } : { availableTokens: 0, totalSpent: 0 },
      performance: {
        responseTime: Date.now() - startTime,
        cached: false,
        usedMaterializedView: useView
      }
    };
    
    // If no user, add cache headers and cache the result
    if (!userId) {
      headers = {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "CDN-Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Cache": "MISS"
      };
      
      // Cache for anonymous users (5 minutes) with chunking
      await setCacheWithChunking(cacheKey, responseData, 300);
    } else if (userId) {
      // Cache for authenticated users (30 seconds) with chunking
      await setCacheWithChunking(cacheKey, responseData, 30);
    }
    
    // Log performance
    const duration = Date.now() - startTime;
    console.log(`[DASHBOARD_PREFETCH] Completed in ${duration}ms`);
    
    // Use the structured clone algorithm to handle BigInt serialization
    return new NextResponse(
      JSON.stringify(responseData, (key, value) => {
        if (typeof value === 'bigint') {
          return Number(value.toString());
        }
        return value;
      }),
      { headers }
    );
    
  } catch (error) {
    console.log("[DASHBOARD_PREFETCH_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Helper to process user data
async function processUserData(userId: string, userUsage: any, userSubscription: any) {
  // Non-subscribed users get this many free tokens
  const FREE_TOKEN_ALLOWANCE = 10000;
  const ANONYMOUS_TOKEN_ALLOWANCE = 1000;
  const DAY_IN_MS = 86_400_000;
  
  // If user doesn't have a usage record yet, create one with initial tokens
  if (!userUsage) {
    try {
      // For this quick fix, we'll use a temporary email
      const tempEmail = `${userId}@tempmail.com`;

      // Create new user usage record with initial tokens
      const newUserUsage = await prismadb.userUsage.create({
        data: {
          userId: userId,
          email: tempEmail,
          availableTokens: FREE_TOKEN_ALLOWANCE,
          totalSpent: 0,
          totalMoneySpent: 0,
        },
      });

      console.log("Created new user usage record:", newUserUsage);

      // Return initial data
      return {
        burnedTokens: 0,
        level: 0,
        nextLevelTokens: getXPForNextLevel(0),
        progressToNextLevel: 0,
        usedTokens: 0,
        remainingTokens: FREE_TOKEN_ALLOWANCE,
        baseTokenAllocation: FREE_TOKEN_ALLOWANCE,
        isSubscribed: false,
        totalMoneySpent: 0,
      };
    } catch (error) {
      console.error("Error creating user usage record:", error);
      throw error;
    }
  }

  // Use totalSpent as the tokens burned value
  const currentTokensBurned = userUsage.totalSpent || 0;
  const currentLevel = calculateLevel(currentTokensBurned);
  const nextLevelTokens = getXPForNextLevel(currentLevel);
  const progressToNextLevel = getProgressToNextLevel(currentTokensBurned);

  // Check subscription status
  const isSubscribed =
    userSubscription?.stripePriceId &&
    userSubscription.stripeCurrentPeriodEnd?.getTime()! + DAY_IN_MS >
      Date.now();

  // Calculate token allocation based on subscription status
  const baseTokens = isSubscribed
    ? 1000000 // Default for subscription plans
    : FREE_TOKEN_ALLOWANCE;

  // For now, just use the availableTokens as the actual available tokens
  const remainingTokens = userUsage.availableTokens || 0;

  // Calculate used tokens as baseTokens - availableTokens, but ensure it's not negative
  const usedTokens = Math.max(0, baseTokens - remainingTokens);

  return {
    burnedTokens: currentTokensBurned,
    level: currentLevel,
    nextLevelTokens: nextLevelTokens,
    progressToNextLevel: progressToNextLevel,
    usedTokens: usedTokens,
    remainingTokens: remainingTokens,
    baseTokenAllocation: baseTokens,
    isSubscribed: !!isSubscribed,
    totalMoneySpent: userUsage.totalMoneySpent || 0,
  };
} 