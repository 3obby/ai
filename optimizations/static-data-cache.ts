/**
 * Static Data Cache
 * 
 * This module implements a static cache for anonymous user data.
 * Instead of making expensive DB queries on every anonymous user visit,
 * we precompute the dashboard data and serve it directly.
 */

import fs from 'fs';
import path from 'path';
import prismadb from '@/lib/prismadb';
import { Prisma } from '@prisma/client';

// Constants
const CACHE_FILE = path.join(process.cwd(), 'public', 'static-cache.json');
const MAX_COMPANIONS = 12;
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_DESCRIPTION_LENGTH = 40; // Shorter descriptions to reduce payload size

// Define the basic dashboard data structure
interface StaticDashboardData {
  categories: Array<{
    id: string;
    name: string;
  }>;
  companions: Array<{
    id: string;
    name: string;
    src: string;
    description: string;
    categoryId: string | null;
    userName: string;
    isFree: boolean;
    global?: boolean; // Make global optional
    createdAt: string;
    _count: {
      messages: number;
    };
  }>;
  totalCompanions: number;
  currentPage: number;
  pageSize: number;
  generation: {
    timestamp: number;
    version: string;
  };
}

/**
 * Generates dashboard data for anonymous users
 * This creates a static snapshot of the dashboard that can be served
 * without database queries
 */
export async function generateStaticCache(): Promise<boolean> {
  console.log('Generating static cache for anonymous users...');
  
  try {
    // Get categories (always needed)
    const categories = await prismadb.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });
    
    // Get companions (limit to the most important ones)
    const companions = await prismadb.companion.findMany({
      where: {
        OR: [
          { private: false },
          { userId: 'system' }
        ]
      },
      select: {
        id: true,
        name: true,
        src: true,
        description: true,
        categoryId: true,
        userName: true,
        isFree: true,
        global: true, // Include global flag
        createdAt: true, // Include createdAt for sorting
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { 
        // Sort by most popular (or another relevant criteria)
        views: 'desc'
      },
      take: MAX_COMPANIONS
    });
    
    // Count total public companions using raw SQL instead of count()
    const countResult = await prismadb.$queryRaw`
      SELECT COUNT(*) as count FROM "Companion" 
      WHERE private = false OR "userId" = 'system'
    `;
    
    // Extract count from result
    const totalCompanions = Array.isArray(countResult) && countResult.length > 0 
      ? Number(countResult[0]?.count || 0) 
      : companions.length;
    
    // Format data for serialization with minimal fields
    const staticData: StaticDashboardData = {
      categories,
      companions: companions.map(c => ({
        id: c.id,
        name: c.name,
        src: c.src,
        // Format description to save space
        description: c.description?.substring(0, MAX_DESCRIPTION_LENGTH) + '...',
        categoryId: c.categoryId,
        userName: c.userName,
        isFree: c.isFree,
        global: c.global || false, // Use the value from the database
        // Convert Date to string
        createdAt: c.createdAt.toISOString(),
        // Ensure consistent structure with minimal data
        _count: {
          messages: c._count?.messages || 0
        }
      })),
      totalCompanions,
      currentPage: 1,
      pageSize: MAX_COMPANIONS,
      generation: {
        timestamp: Date.now(),
        version: '1.0'
      }
    };
    
    // Create public directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write data to file
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify(staticData, null, process.env.NODE_ENV === 'development' ? 2 : 0)
    );
    
    console.log(`Static cache generated with ${companions.length} companions and ${categories.length} categories`);
    return true;
  } catch (error) {
    console.error('Failed to generate static cache:', error);
    return false;
  }
}

/**
 * Checks if the static cache exists and is valid
 */
export function isStaticCacheValid(): boolean {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return false;
    }
    
    // Check if cache is fresh enough
    const stats = fs.statSync(CACHE_FILE);
    const age = Date.now() - stats.mtimeMs;
    
    return age < CACHE_TTL;
  } catch (error) {
    console.error('Error checking static cache:', error);
    return false;
  }
}

/**
 * Gets static cache data (or null if invalid)
 */
export function getStaticCacheData(): StaticDashboardData | null {
  try {
    if (!isStaticCacheValid()) {
      return null;
    }
    
    const data = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(data) as StaticDashboardData;
  } catch (error) {
    console.error('Error reading static cache:', error);
    return null;
  }
}

// Auto-refresh function that can be called from a cron job
export async function refreshStaticCacheIfNeeded(): Promise<boolean> {
  if (!isStaticCacheValid()) {
    return generateStaticCache();
  }
  return true;
} 