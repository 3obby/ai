/**
 * Database optimization utilities for high-latency scenarios
 * 
 * This file contains functions to optimize database queries when
 * dealing with high latency connections like accessing US-based
 * databases from Southeast Asia
 */

import prismadb from "./prismadb";
import { Prisma } from "@prisma/client";

/**
 * Simple in-memory cache for repeated queries
 */
const queryCache = new Map<string, { data: any; expires: number }>();

/**
 * Get a cached result or execute the query and cache it
 * 
 * @param cacheKey - Unique key for this query
 * @param queryFn - Function to execute if cache miss
 * @param ttlSeconds - How long to cache the result (seconds)
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttlSeconds: number = 30
): Promise<T> {
  const now = Date.now();
  const cached = queryCache.get(cacheKey);
  
  // Return cached result if still valid
  if (cached && cached.expires > now) {
    console.log(`[CACHE HIT] ${cacheKey}`);
    return cached.data as T;
  }
  
  // Execute query and cache result
  console.log(`[CACHE MISS] ${cacheKey}`);
  const result = await queryFn();
  
  queryCache.set(cacheKey, {
    data: result,
    expires: now + (ttlSeconds * 1000)
  });
  
  return result;
}

/**
 * Invalidate cache entries that match a prefix
 */
export function invalidateCache(prefix: string): void {
  const keysToDelete: string[] = [];
  
  queryCache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => queryCache.delete(key));
  console.log(`[CACHE] Invalidated ${keysToDelete.length} entries with prefix: ${prefix}`);
}

/**
 * Get dashboard companions with caching
 */
export async function getCachedDashboardCompanions(
  userId: string,
  page: number = 1,
  pageSize: number = 10,
  categoryId?: string,
  nameFilter?: string
) {
  const skip = (page - 1) * pageSize;
  const cacheKey = `companions:dashboard:${userId}:${page}:${pageSize}:${categoryId || 'all'}:${nameFilter || 'none'}`;
  
  return cachedQuery(
    cacheKey,
    async () => {
      // Build a type-safe where condition
      const whereConditions: Prisma.CompanionWhereInput = {
        AND: [
          categoryId ? { categoryId } : {},
          nameFilter ? { 
            name: { 
              contains: nameFilter, 
              mode: Prisma.QueryMode.insensitive 
            } 
          } : {},
          {
            OR: [
              { private: false },
              { 
                private: true,
                userId
              }
            ]
          }
        ]
      };
      
      try {
        // Get total count - handle potential Edge runtime issues
        const totalCount = await prismadb.$queryRaw`
          SELECT COUNT(*) FROM "Companion" 
          WHERE (${categoryId ? Prisma.sql`"categoryId" = ${categoryId}` : Prisma.sql`1=1`})
          AND (${nameFilter ? Prisma.sql`"name" ILIKE ${`%${nameFilter}%`}` : Prisma.sql`1=1`})
          AND ("private" = false OR ("private" = true AND "userId" = ${userId}))
        `;
        
        // Get companions
        const data = await prismadb.companion.findMany({
          where: whereConditions,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            _count: {
              select: {
                messages: true,
              },
            },
            userBurnedTokens: {
              where: {
                userId: userId,
              },
              take: 1,
            },
          },
          skip,
          take: pageSize,
        });
        
        // Extract count from raw query result (which returns an array with one object)
        const count = Array.isArray(totalCount) && totalCount.length > 0 
          ? Number(totalCount[0]?.count ?? 0) 
          : 0;
        
        return { data, totalCount: count };
      } catch (error) {
        console.error("Error in getCachedDashboardCompanions:", error);
        
        // Fallback to regular findMany if raw query fails (e.g., in Edge runtime)
        const data = await prismadb.companion.findMany({
          where: whereConditions,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            _count: {
              select: {
                messages: true,
              },
            },
            userBurnedTokens: {
              where: {
                userId: userId,
              },
              take: 1,
            },
          },
          skip,
          take: pageSize,
        });
        
        // Instead of counting, we'll return the current page data and estimate the total
        return { 
          data, 
          totalCount: data.length + skip, // Estimate total count
          isEstimatedCount: true
        };
      }
    },
    20 // 20 second TTL
  );
}

/**
 * Get cached categories with long TTL since they change rarely
 */
export async function getCachedCategories() {
  return cachedQuery(
    'categories:all',
    () => prismadb.category.findMany(),
    3600 // 1 hour TTL - categories don't change often
  );
}

/**
 * Get user progress with caching
 */
export async function getCachedUserProgress(userId: string) {
  return cachedQuery(
    `user:progress:${userId}`,
    async () => {
      const [userUsage, userSubscription] = await Promise.all([
        prismadb.userUsage.findUnique({
          where: { userId },
        }),
        prismadb.userSubscription.findUnique({
          where: { userId },
          select: {
            stripeSubscriptionId: true,
            stripeCurrentPeriodEnd: true,
            stripeCustomerId: true,
            stripePriceId: true,
          },
        }),
      ]);
      
      return { userUsage, userSubscription };
    },
    15 // 15 seconds TTL
  );
} 