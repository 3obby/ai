import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { calculateLevel, getXPForNextLevel, getProgressToNextLevel } from "@/lib/level-system";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { getFromCache, getChunkedFromCache, setCache, setCacheWithChunking } from "@/lib/redis-cache";

// Constants
const ANON_COMPANION_LIMIT = 15; // Show fewer companions for anonymous users
const ANON_CACHE_TTL = 600; // 10 minutes for anonymous users
const AUTH_CACHE_TTL = 60; // 1 minute for authenticated users
const ANON_QUERY_TIMEOUT = 2000; // 2 second timeout for anonymous queries
const MAX_DESCRIPTION_LENGTH = 80; // Shorter description for performance

// For NextAuth we need to use Node.js runtime 
// since it uses crypto which isn't available in Edge
export const runtime = 'nodejs';
export const revalidate = 60; // Increased revalidation period

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Import optimized implementation
import { GET as OptimizedDashboardPrefetch } from "@/optimizations/optimized-dashboard-prefetch";

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

// Function to get data without materialized view
async function getDashboardDataDirect(
  isAnonymous: boolean, 
  categoryId: string | null, 
  userId: string | null, 
  page: number, 
  pageSize: number
) {
  const skip = (page - 1) * pageSize;
  const startTime = Date.now();
  
  // 1. Categories - simple and fast
  const categoriesPromise = prismadb.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  });
  
  // 2. Build companion WHERE clause once
  const whereClause: Prisma.CompanionWhereInput = {
    OR: [
      { private: false },
      { userId: 'system' }
    ],
    ...(userId ? { OR: [{ private: false }, { userId: 'system' }, { userId }] } : {}),
    ...(categoryId ? { categoryId } : {})
  };
  
  // 3. Optimized companion query with minimal fields for speed
  const companionsPromise = prismadb.companion.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      src: true,
      description: true,
      categoryId: true,
      userName: true,
      isFree: true,
      global: true,
      createdAt: true,
      _count: {
        select: { messages: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip
  });
  
  // 4. Get count with timeout - using raw SQL query for better performance
  const countPromise = Promise.race([
    prismadb.$executeRaw`SELECT COUNT(*) as count FROM "Companion" 
      WHERE (private = false OR "userId" = 'system' ${userId ? Prisma.sql`OR "userId" = ${userId}` : Prisma.empty})
      ${categoryId ? Prisma.sql`AND "categoryId" = ${categoryId}` : Prisma.empty}`,
    new Promise<any>((_, reject) => 
      setTimeout(() => reject(new Error('Count query timeout')), ANON_QUERY_TIMEOUT)
    )
  ]).catch(() => {
    console.log("[DASHBOARD_DIRECT] Count query timeout, using fallback");
    return [{ count: pageSize * 3 }]; // Fallback estimate
  });
  
  // 5. Execute all in parallel
  const [categories, companions, countResult] = await Promise.all([
    categoriesPromise,
    companionsPromise,
    countPromise
  ]);
  
  // Get the count from the result (handle array format)
  const totalCompanions = Array.isArray(countResult) && countResult.length > 0 
    ? Number(countResult[0]?.count || 0) 
    : (typeof countResult === 'number' ? countResult : pageSize * 3);
  
  // 6. Process companions - minimize processing
  const processedCompanions = companions.map((companion: any) => ({
    id: companion.id,
    name: companion.name,
    src: companion.src,
    description: companion.description?.length > MAX_DESCRIPTION_LENGTH ? 
      companion.description.substring(0, MAX_DESCRIPTION_LENGTH) + '...' : 
      companion.description || 'No description',
    categoryId: companion.categoryId,
    userName: companion.userName,
    isFree: companion.isFree,
    global: companion.global || false,
    createdAt: companion.createdAt,
    _count: { messages: companion._count?.messages || 0 }
  }));
  
  console.log(`[DASHBOARD_DIRECT] Direct query completed in ${Date.now() - startTime}ms`);
  
  return {
    categories,
    companions: processedCompanions,
    totalCompanions,
    performance: {
      responseTime: Date.now() - startTime,
      usedMaterializedView: false
    }
  };
}

// Proxy to optimized implementation
export async function GET(req: Request) {
  // Add Vercel Edge Cache headers
  try {
    const result = await OptimizedDashboardPrefetch(req);
    
    // Add additional cache headers for Vercel
    const headers = new Headers(result.headers);
    
    // Add Vercel-specific cache headers
    headers.set('CDN-Cache-Control', headers.get('Cache-Control') || 'public, max-age=1800, stale-while-revalidate=3600');
    headers.set('Vercel-CDN-Cache-Control', headers.get('Cache-Control') || 'public, max-age=1800, stale-while-revalidate=3600');
    
    // Create new response with updated headers
    return new NextResponse(await result.text(), {
      status: result.status,
      statusText: result.statusText,
      headers
    });
  } catch (error) {
    console.error("[DASHBOARD_PREFETCH_PROXY_ERROR]", error);
    
    // Return minimal data on error
    return NextResponse.json({
      categories: [],
      companions: [],
      totalCompanions: 0,
      currentPage: 1,
      pageSize: 12,
      performance: {
        responseTime: 0,
        cached: false,
        usedMaterializedView: false,
        error: true
      }
    }, { status: 200 });
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