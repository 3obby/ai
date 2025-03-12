import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb"
import { NextResponse } from "next/server"
import {
  calculateLevel,
  getXPForNextLevel,
  getProgressToNextLevel,
} from "@/lib/level-system"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"
import { setCacheWithChunking, getChunkedFromCache } from "@/lib/redis-cache"

// For NextAuth we need to use Node.js runtime 
// since it uses crypto which isn't available in Edge
export const runtime = 'nodejs';
export const revalidate = 5;

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Non-subscribed users get this many free tokens
const FREE_TOKEN_ALLOWANCE = 10000
const ANONYMOUS_TOKEN_ALLOWANCE = 1000
const DAY_IN_MS = 86_400_000

// Cache TTL in seconds
const ANON_CACHE_TTL = 600 // 10 minutes
const TEMP_CACHE_TTL = 300 // 5 minutes

export async function GET(req: Request) {
  const startTime = performance.now();
  try {
    const session = await auth()
    const userId = session?.userId
    
    // Get the userId from the query if passed (useful for anonymous users)
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;

    // Check if this is a temp user ID (for anonymous users who couldn't set cookies)
    const isTempUser = effectiveUserId?.startsWith('temp-');
    
    // If this is an anonymous user without a user ID, return default values immediately
    if (!effectiveUserId) {
      // Return default values for anonymous users instead of 401 error
      return NextResponse.json({
        burnedTokens: 0,
        level: 0,
        nextLevelTokens: getXPForNextLevel(0),
        progressToNextLevel: 0,
        usedTokens: 0,
        remainingTokens: ANONYMOUS_TOKEN_ALLOWANCE,
        baseTokenAllocation: ANONYMOUS_TOKEN_ALLOWANCE,
        isSubscribed: false,
        totalMoneySpent: 0,
        isAnonymous: true,
      });
    }

    // For anonymous/temp users, try to get from cache first
    if (!userId || isTempUser) {
      const cacheKey = `user-progress:${effectiveUserId}`;
      const cachedData = await getChunkedFromCache(cacheKey);
      
      if (cachedData) {
        const queryTimeMs = Math.round(performance.now() - startTime);
        console.log(`[USER_PROGRESS] Returning cached data for ${effectiveUserId} in ${queryTimeMs}ms`);
        
        return NextResponse.json({
          ...cachedData,
          isAnonymous: true,
          performance: {
            queryTimeMs,
            cached: true
          }
        });
      }
      
      // For temp users, return default values with higher token count
      // to avoid database operations for temporary sessions
      if (isTempUser) {
        const defaultTempData = {
          burnedTokens: 0,
          level: 0,
          nextLevelTokens: getXPForNextLevel(0),
          progressToNextLevel: 0,
          usedTokens: 0,
          remainingTokens: ANONYMOUS_TOKEN_ALLOWANCE,
          baseTokenAllocation: ANONYMOUS_TOKEN_ALLOWANCE,
          isSubscribed: false,
          totalMoneySpent: 0,
          isAnonymous: true,
        };
        
        // Cache the data for temp users
        await setCacheWithChunking(cacheKey, defaultTempData, TEMP_CACHE_TTL);
        
        const queryTimeMs = Math.round(performance.now() - startTime);
        return NextResponse.json({
          ...defaultTempData,
          performance: {
            queryTimeMs, 
            cached: false
          }
        });
      }
    }

    // Get both user usage and subscription data
    const [userUsage, userSubscription] = await Promise.all([
      prismadb.userUsage.findUnique({
        where: { userId: effectiveUserId },
      }),
      prismadb.userSubscription.findUnique({
        where: { userId: effectiveUserId },
        select: {
          stripeSubscriptionId: true,
          stripeCurrentPeriodEnd: true,
          stripeCustomerId: true,
          stripePriceId: true,
        },
      }),
    ])

    // If user doesn't have a usage record yet, create one with initial tokens
    if (!userUsage) {
      console.log("Creating new user usage record for:", effectiveUserId)
      try {
        // For this quick fix, we'll use a temporary email since we can't easily get it
        const tempEmail = `${effectiveUserId}@tempmail.com`

        // Create new user usage record with initial tokens
        const newUserUsage = await prismadb.userUsage.create({
          data: {
            userId: effectiveUserId,
            email: tempEmail,
            availableTokens: FREE_TOKEN_ALLOWANCE, // Give free tokens to start
            totalSpent: 0,
            totalMoneySpent: 0,
          },
        })

        console.log("Created new user usage record:", newUserUsage)

        // Return initial data
        const responseData = {
          burnedTokens: 0,
          level: 0,
          nextLevelTokens: getXPForNextLevel(0),
          progressToNextLevel: 0,
          usedTokens: 0,
          remainingTokens: FREE_TOKEN_ALLOWANCE,
          baseTokenAllocation: FREE_TOKEN_ALLOWANCE,
          isSubscribed: false,
          totalMoneySpent: 0,
          isAnonymous: !userId,
          performance: {
            queryTimeMs: Math.round(performance.now() - startTime),
            cached: false
          }
        };
        
        // Cache if anonymous user
        if (!userId) {
          const cacheKey = `user-progress:${effectiveUserId}`;
          await setCacheWithChunking(cacheKey, responseData, ANON_CACHE_TTL);
        }
        
        return NextResponse.json(responseData);
      } catch (error) {
        console.error("Error creating user usage record:", error)
        return new NextResponse("Failed to create user record", { status: 500 })
      }
    }

    // Only log in development mode and in a simplified format
    if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
      console.log(
        "[USER_PROGRESS] Tokens available:",
        userUsage.availableTokens
      )
    }

    // Use totalSpent as the tokens burned value
    const currentTokensBurned = userUsage.totalSpent || 0
    const currentLevel = calculateLevel(currentTokensBurned)
    const nextLevelTokens = getXPForNextLevel(currentLevel)
    const progressToNextLevel = getProgressToNextLevel(currentTokensBurned)

    // Check subscription status
    const isSubscribed =
      userSubscription?.stripePriceId &&
      userSubscription.stripeCurrentPeriodEnd?.getTime()! + DAY_IN_MS >
        Date.now()

    // Calculate token allocation based on subscription status
    const baseTokens = isSubscribed
      ? SUBSCRIPTION_PLAN.includeBaseTokens
      : FREE_TOKEN_ALLOWANCE

    // For now, just use the availableTokens as the actual available tokens
    const remainingTokens = userUsage.availableTokens || 0

    // Calculate used tokens as baseTokens - availableTokens, but ensure it's not negative
    const usedTokens = Math.max(0, baseTokens - remainingTokens)

    const responseData = {
      burnedTokens: currentTokensBurned,
      level: currentLevel,
      nextLevelTokens: nextLevelTokens,
      progressToNextLevel: progressToNextLevel,
      usedTokens: usedTokens,
      remainingTokens: remainingTokens,
      baseTokenAllocation: baseTokens,
      isSubscribed: !!isSubscribed,
      totalMoneySpent: userUsage.totalMoneySpent || 0,
      isAnonymous: !userId,
      performance: {
        queryTimeMs: Math.round(performance.now() - startTime),
        cached: false
      }
    };
    
    // Cache if anonymous user
    if (!userId) {
      const cacheKey = `user-progress:${effectiveUserId}`;
      await setCacheWithChunking(cacheKey, responseData, ANON_CACHE_TTL);
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.log("[USER_PROGRESS_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
