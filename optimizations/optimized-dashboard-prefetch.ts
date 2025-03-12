import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getChunkedFromCache, setCacheWithChunking } from "@/lib/redis-cache";

// Constants
const ANON_COMPANION_LIMIT = 12; // Reduced from 15 to 12 for better performance
const ANON_CACHE_TTL = 1800; // Increased to 30 minutes for anonymous users
const AUTH_CACHE_TTL = 60; // 1 minute for authenticated users
const ANON_QUERY_TIMEOUT = 2000; // 2 second timeout for anonymous queries
const MAX_DESCRIPTION_LENGTH = 40; // Reduced from 80 to 40 for better performance

// For NextAuth we need to use Node.js runtime 
export const runtime = 'nodejs';
export const revalidate = 10;
export const dynamic = "force-dynamic";

// Safe number conversion helper
const safeNumberConversion = (value: any): number => {
  if (typeof value === 'bigint') {
    return Number(value.toString());
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

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
      // Only include essential fields for anonymous users
      ...(isAnonymous ? {} : { global: true, createdAt: true }),
      _count: {
        select: { messages: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: isAnonymous ? Math.min(12, pageSize) : pageSize, // Limit size for anonymous users
    skip
  });
  
  // 4. Get count with timeout - using findMany and length as a workaround for count
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
    description: isAnonymous 
      ? (companion.description?.substring(0, MAX_DESCRIPTION_LENGTH) + '...') 
      : (companion.description?.length > MAX_DESCRIPTION_LENGTH 
          ? companion.description.substring(0, MAX_DESCRIPTION_LENGTH) + '...' 
          : companion.description || 'No description'),
    categoryId: companion.categoryId,
    userName: companion.userName,
    isFree: companion.isFree,
    // Only include non-essential fields for authenticated users
    ...(isAnonymous ? {} : {
      global: companion.global || false,
      createdAt: companion.createdAt
    }),
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

export async function GET(req: Request) {
  try {
    const startTime = Date.now();
    console.log("[DASHBOARD_PREFETCH] Request started");
    
    // Get user session - simpler authentication check
    const session = await auth();
    const userId = session?.userId;
    const isAnonymous = !userId;
    
    // Extract query params
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || (isAnonymous ? String(ANON_COMPANION_LIMIT) : "20"));
    
    // Cache key generation
    const cacheKey = `dash-v2:${userId || 'anon'}:${categoryId || 'all'}:${page}:${pageSize}`;
    
    // Check for static cache for first-page anonymous users
    if (isAnonymous && !categoryId && page === 1) {
      try {
        const { getStaticCacheData } = await import('@/optimizations/static-data-cache');
        const staticData = getStaticCacheData();
        
        if (staticData) {
          console.log('[DASHBOARD_PREFETCH] Serving from static cache');
          return NextResponse.json(staticData, {
            headers: {
              'X-Cache': 'STATIC',
              'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
              'CDN-Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
              'Vercel-CDN-Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600'
            }
          });
        }
      } catch (error) {
        console.error('[DASHBOARD_PREFETCH] Static cache error:', error);
      }
    }
    
    // Try cache for anonymous users
    if (isAnonymous) {
      try {
        const cachedData = await getChunkedFromCache(cacheKey);
        if (cachedData) {
          console.log(`[DASHBOARD_PREFETCH] Cache hit for ${cacheKey}`);
          return NextResponse.json(cachedData, {
            headers: {
              'X-Cache': 'HIT',
              'Cache-Control': `public, max-age=${ANON_CACHE_TTL}`,
            }
          });
        }
      } catch (error) {
        console.error('[DASHBOARD_PREFETCH] Cache error:', error);
      }
    }
    
    // Optimized direct query approach - skip materialized view check
    const dashboardData = await getDashboardDataDirect(
      isAnonymous,
      categoryId,
      userId || null,
      page,
      pageSize
    );
    
    // Create response
    const responseData = {
      categories: dashboardData.categories,
      companions: dashboardData.companions,
      totalCompanions: dashboardData.totalCompanions,
      currentPage: page,
      pageSize,
      userProgress: null, // Omit for anonymous, load separately for auth users
      performance: {
        responseTime: Date.now() - startTime,
        cached: false,
        usedMaterializedView: false
      }
    };
    
    // Cache for appropriate duration
    const cacheTTL = isAnonymous ? ANON_CACHE_TTL : AUTH_CACHE_TTL;
    
    try {
      await setCacheWithChunking(cacheKey, responseData, cacheTTL);
    } catch (error) {
      console.error('[DASHBOARD_PREFETCH] Caching error:', error);
    }
    
    // Set cache headers for CDN/browser
    const headers: Record<string, string> = isAnonymous ? {
      'Cache-Control': `public, max-age=${ANON_CACHE_TTL}, stale-while-revalidate=3600`,
      'CDN-Cache-Control': `public, max-age=${ANON_CACHE_TTL}, stale-while-revalidate=3600`,
      'Vercel-CDN-Cache-Control': `public, max-age=${ANON_CACHE_TTL}, stale-while-revalidate=3600`,
      'X-Cache': 'MISS'
    } : {};
    
    // Log response time
    const duration = Date.now() - startTime;
    console.log(`[DASHBOARD_PREFETCH] Completed in ${duration}ms`);
    
    return NextResponse.json(responseData, { headers });
    
  } catch (error) {
    console.error("[DASHBOARD_PREFETCH_ERROR]", error);
    
    // Return minimal data on error
    return NextResponse.json({
      categories: [],
      companions: [],
      totalCompanions: 0,
      currentPage: 1,
      pageSize: ANON_COMPANION_LIMIT,
      performance: {
        responseTime: 0,
        cached: false,
        usedMaterializedView: false,
        error: true
      }
    }, { status: 200 });
  }
} 