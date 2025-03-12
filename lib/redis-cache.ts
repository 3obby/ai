import { Redis } from '@upstash/redis'

// Handle BigInt serialization and deserialization
// BigInt values are not supported in JSON.stringify by default
export const bigIntSerializer = {
  stringify: (data: any) => {
    return JSON.stringify(data, (key, value) => {
      // Convert BigInt to a format that can be deserialized
      if (typeof value === 'bigint') {
        return { __type: 'bigint', value: value.toString() }
      }
      return value
    })
  },
  
  parse: (data: string) => {
    return JSON.parse(data, (key, value) => {
      // Convert serialized BigInt back to BigInt
      if (value && typeof value === 'object' && value.__type === 'bigint') {
        return BigInt(value.value)
      }
      return value
    })
  }
}

// Initialize Redis client
const getRedisClient = () => {
  try {
    // First try Vercel KV environment variables (from Upstash integration)
    // For Vercel KV, prefer KV_REST_API_URL over KV_URL (which is Redis protocol URL)
    if (process.env.KV_REST_API_URL) {
      console.log('[REDIS_CACHE] Using Vercel KV environment variables')
      
      // Create Redis configuration for Vercel KV
      const config = {
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN || '',
      }
      
      return new Redis(config)
    }
    
    // Fallback to direct Upstash environment variables
    if (process.env.UPSTASH_REDIS_REST_URL) {
      console.log('[REDIS_CACHE] Using Upstash environment variables')
      
      const config = {
        url: process.env.UPSTASH_REDIS_REST_URL || '',
        token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
      }
      
      return new Redis(config)
    }
    
    // Finally, try generic Redis URL (must be HTTP/HTTPS for Upstash client)
    if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('http')) {
      console.log('[REDIS_CACHE] Using generic Redis URL')
      
      return new Redis({
        url: process.env.REDIS_URL,
        token: '' // Add empty token for Redis URL connections
      })
    }

    console.log('[REDIS_CACHE] No valid Redis URL found in environment, cache disabled')
    return null
  } catch (error) {
    console.error('[REDIS_CACHE_INIT_ERROR]', error)
    return null
  }
}

let redisClient: Redis | null = null

// Lazy initialization of Redis client
const getClient = () => {
  if (!redisClient) {
    redisClient = getRedisClient()
  }
  return redisClient
}

/**
 * Get cached data by key
 */
export const getFromCache = async <T>(key: string): Promise<T | null> => {
  try {
    const client = getClient()
    if (!client) return null

    const cachedData = await client.get(key)
    if (!cachedData) return null

    // Use custom parser to handle BigInt
    return typeof cachedData === 'string' 
      ? bigIntSerializer.parse(cachedData) as T
      : cachedData as T
  } catch (error) {
    console.error('[REDIS_CACHE_GET_ERROR]', error)
    return null
  }
}

/**
 * Set data in cache with TTL
 */
export const setCache = async <T>(
  key: string, 
  data: T, 
  ttlInSeconds = 60
): Promise<boolean> => {
  try {
    const client = getClient()
    if (!client) return false

    // Use custom serializer to handle BigInt
    const serializedData = bigIntSerializer.stringify(data)
    
    await client.set(key, serializedData, { ex: ttlInSeconds })
    return true
  } catch (error) {
    console.error('[REDIS_CACHE_SET_ERROR]', error)
    return false
  }
}

/**
 * Delete a key from cache
 */
export const deleteCache = async (key: string): Promise<boolean> => {
  try {
    const client = getClient()
    if (!client) return false

    await client.del(key)
    return true
  } catch (error) {
    console.error('[REDIS_CACHE_DELETE_ERROR]', error)
    return false
  }
}

/**
 * Clear all keys matching a pattern
 * e.g. clearCachePattern('dashboard:*') to clear all dashboard keys
 */
export const clearCachePattern = async (pattern: string): Promise<boolean> => {
  try {
    const client = getClient()
    if (!client) return false

    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
    return true
  } catch (error) {
    console.error('[REDIS_CACHE_CLEAR_ERROR]', error)
    return false
  }
} 