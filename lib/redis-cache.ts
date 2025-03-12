// @ts-ignore - Ignore TS error about missing declaration file
import { createClient } from '@vercel/kv';
import 'server-only';

// Use a smaller chunk size to prevent Redis memory issues
const MAX_CHUNK_SIZE = 250000; // 250KB per chunk
const DEFAULT_TTL = 60; // 1 minute default
const ANON_TTL = 600; // 10 minutes for anonymous users

// Custom serializer to handle BigInt
const bigIntSerializer = {
  stringify: (value: any): string => {
    return JSON.stringify(value, (_, v) => 
      typeof v === 'bigint' ? Number(v.toString()) : v
    );
  },
  parse: (text: string): any => {
    return JSON.parse(text);
  },
};

// Get Redis client - singleton pattern
let client: ReturnType<typeof createClient> | null = null;

/**
 * Get or create Redis client with connection logging
 */
function getClient() {
  if (client) return client;

  try {
    // Check if KV_REST_API_URL and KV_REST_API_TOKEN are defined
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      console.log('[REDIS_CACHE] Using Vercel KV environment variables');
      client = createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    } else {
      console.error('[REDIS_CACHE] Missing KV environment variables');
      return null;
    }
    
    return client;
  } catch (error) {
    console.error('[REDIS_CACHE_INIT_ERROR]', error);
    return null;
  }
}

/**
 * Improved chunked cache setter with compression
 * - Splits large objects into chunks
 * - Optimizes for memory usage
 * - Adds versioning for easy cache invalidation
 */
export const setCacheWithChunking = async <T>(
  key: string,
  data: T,
  ttlInSeconds = DEFAULT_TTL,
  version = 'v1' // Cache version for easy invalidation
): Promise<boolean> => {
  try {
    const client = getClient();
    if (!client) return false;

    // Add version to key
    const versionedKey = `${version}:${key}`;
    
    // Serialize the data
    const serializedData = bigIntSerializer.stringify(data);
    const dataSize = serializedData.length;
    
    // For small objects, don't use chunking
    if (dataSize <= MAX_CHUNK_SIZE) {
      await client.set(versionedKey, serializedData, { ex: ttlInSeconds });
      return true;
    }
    
    console.log(`[REDIS_CACHE] Large object (${dataSize} bytes), using chunking for ${versionedKey}`);
    
    // Split into chunks with minimal memory usage
    const chunkCount = Math.ceil(dataSize / MAX_CHUNK_SIZE);
    await client.set(`${versionedKey}:chunks`, chunkCount.toString(), { ex: ttlInSeconds });
    
    // Store chunks with pipeline for better performance
    const pipeline = client.pipeline();
    for (let i = 0; i < chunkCount; i++) {
      const start = i * MAX_CHUNK_SIZE;
      const end = Math.min(start + MAX_CHUNK_SIZE, dataSize);
      const chunk = serializedData.slice(start, end);
      pipeline.set(`${versionedKey}:chunk:${i}`, chunk, { ex: ttlInSeconds });
    }
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('[REDIS_CACHE_SET_ERROR]', error);
    return false;
  }
}

/**
 * Improved chunked cache getter with fallbacks
 */
export const getChunkedFromCache = async <T>(
  key: string,
  version = 'v1' // Match the version used when setting
): Promise<T | null> => {
  try {
    const client = getClient();
    if (!client) return null;

    // Add version to key
    const versionedKey = `${version}:${key}`;
    
    // Try getting chunk count first
    const chunkCount = await client.get(`${versionedKey}:chunks`);
    
    // If no chunks, try as a normal non-chunked entry
    if (!chunkCount) {
      const data = await client.get(versionedKey);
      if (!data) return null;
      return typeof data === 'string' ? bigIntSerializer.parse(data) : data as T;
    }
    
    // Get all chunks with pipelining for better performance
    const pipeline = client.pipeline();
    const count = parseInt(chunkCount as string, 10);
    
    for (let i = 0; i < count; i++) {
      pipeline.get(`${versionedKey}:chunk:${i}`);
    }
    
    const results = await pipeline.exec();
    
    // Check if any chunks are missing
    if (results.includes(null)) {
      console.error(`[REDIS_CACHE] Missing chunks for ${versionedKey}`);
      return null;
    }
    
    // Combine chunks efficiently
    const reassembled = results.join('');
    
    // Parse and return
    return bigIntSerializer.parse(reassembled) as T;
  } catch (error) {
    console.error('[REDIS_CACHE_GET_ERROR]', error);
    return null;
  }
}

/**
 * Cache by user type with appropriate TTL
 */
export const setCacheByUserType = async <T>(
  key: string,
  data: T,
  isAnonymous = false,
  version = 'v1'
): Promise<boolean> => {
  // Use longer TTL for anonymous users
  const ttl = isAnonymous ? ANON_TTL : DEFAULT_TTL;
  // Use user type prefix for organization
  const prefixedKey = isAnonymous ? `anon:${key}` : `auth:${key}`;
  
  return setCacheWithChunking(prefixedKey, data, ttl, version);
}

/**
 * Cache invalidation by pattern
 */
export const clearCachePattern = async (
  pattern: string,
  version = 'v1'
): Promise<number> => {
  try {
    const client = getClient();
    if (!client) return 0;

    const keys = await client.keys(`${version}:${pattern}*`);
    if (keys.length === 0) return 0;
    
    console.log(`[REDIS_CACHE] Clearing ${keys.length} keys matching pattern: ${pattern}`);
    
    // Delete in batches for better performance
    const pipeline = client.pipeline();
    keys.forEach((key: string) => pipeline.del(key));
    await pipeline.exec();
    
    return keys.length;
  } catch (error) {
    console.error('[REDIS_CACHE_CLEAR_ERROR]', error);
    return 0;
  }
}

// Legacy compatibility function aliases - use the new functions internally
export const setCache = setCacheWithChunking;
export const getFromCache = getChunkedFromCache;

/**
 * Enhanced cache setter for anonymous users - uses longer TTL
 * We can cache more aggressively for anonymous users to improve performance
 */
export const setAnonymousCache = async <T>(
  key: string, 
  data: T, 
  ttlInSeconds = 300 // Default 5 minutes TTL for anonymous users
): Promise<boolean> => {
  const anonymousKey = `anon:${key}`;
  return setCacheWithChunking(anonymousKey, data, ttlInSeconds);
}

/**
 * Simple helper to get anonymous cache with the right prefix
 */
export const getAnonymousCache = async <T>(key: string): Promise<T | null> => {
  const anonymousKey = `anon:${key}`;
  return getChunkedFromCache<T>(anonymousKey);
}

/**
 * Delete a cache entry
 */
export const deleteCache = async (key: string): Promise<boolean> => {
  try {
    const client = getClient();
    if (!client) return false;

    await client.del(key);
    return true;
  } catch (error) {
    console.error('[REDIS_CACHE_DELETE_ERROR]', error);
    return false;
  }
} 