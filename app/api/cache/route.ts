import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { clearCachePattern, getFromCache, setCache } from "@/lib/redis-cache";

// For NextAuth we need to use Node.js runtime
export const runtime = 'nodejs';

/**
 * Cache Management API
 * 
 * This API allows querying and managing the Redis cache.
 * It requires authentication with admin privileges.
 */
export async function GET(req: Request) {
  try {
    // Get user session
    const session = await auth();
    const userId = session?.userId;
    
    // Only allow admin access
    if (!userId || userId !== "system") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get operation from query
    const { searchParams } = new URL(req.url);
    const operation = searchParams.get("operation");
    const key = searchParams.get("key");
    
    // Handle operations
    switch (operation) {
      case "info":
        // Get cache info (future implementation)
        return NextResponse.json({
          status: "ok",
          message: "Cache is operational"
        });
        
      case "get":
        if (!key) {
          return new NextResponse("Missing key parameter", { status: 400 });
        }
        
        const value = await getFromCache(key);
        return NextResponse.json({
          status: "ok",
          key,
          value: value || null
        });
        
      default:
        return new NextResponse("Invalid operation", { status: 400 });
    }
  } catch (error) {
    console.error("[CACHE_API_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Get user session
    const session = await auth();
    const userId = session?.userId;
    
    // Only allow admin access
    if (!userId || userId !== "system") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get operation from body
    const body = await req.json();
    const { operation, key, value, ttl, pattern } = body;
    
    // Handle operations
    switch (operation) {
      case "set":
        if (!key || value === undefined) {
          return new NextResponse("Missing key or value", { status: 400 });
        }
        
        const setResult = await setCache(key, value, ttl || 300);
        return NextResponse.json({
          status: setResult ? "ok" : "error",
          message: setResult ? "Value cached successfully" : "Failed to cache value"
        });
        
      case "clear":
        if (!pattern) {
          return new NextResponse("Missing pattern parameter", { status: 400 });
        }
        
        const clearResult = await clearCachePattern(pattern);
        return NextResponse.json({
          status: clearResult ? "ok" : "error",
          message: clearResult ? `Cleared cache keys matching "${pattern}"` : "Failed to clear cache"
        });
        
      default:
        return new NextResponse("Invalid operation", { status: 400 });
    }
  } catch (error) {
    console.error("[CACHE_API_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 