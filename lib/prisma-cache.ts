import { PrismaClient } from '@prisma/client'
import prismadb from './prismadb'

// Simple in-memory cache
type CacheRecord = {
  data: any;
  expiry: number;
}

// Only create cache if not in Edge Runtime
const cache: Record<string, CacheRecord> = {}

// Helper to check if we're in Edge Runtime
const isEdgeRuntime = () => {
  return process.env.NEXT_RUNTIME === 'edge'
}

// Cache key generation helper
const generateCacheKey = (model: string, operation: string, args: any) => {
  return `${model}:${operation}:${JSON.stringify(args)}`
}

// Set cache with TTL
const setCache = (key: string, data: any, ttlSeconds = 300) => {
  if (isEdgeRuntime()) return

  cache[key] = {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  }
}

// Get from cache
const getCache = (key: string) => {
  if (isEdgeRuntime()) return null
  
  const record = cache[key]
  if (!record) return null
  
  // Check if expired
  if (record.expiry < Date.now()) {
    delete cache[key]
    return null
  }
  
  return record.data
}

// Lightweight alternative that doesn't use $extends
const cachedPrismaAlternative = {
  ...prismadb,
  
  // Wrap user model methods with caching
  user: {
    ...prismadb.user,
    
    async findUnique(args: any) {
      if (isEdgeRuntime()) {
        return prismadb.user.findUnique(args)
      }
      
      const cacheKey = generateCacheKey('user', 'findUnique', args)
      const cached = getCache(cacheKey)
      
      if (cached) {
        console.log(`[CACHE HIT] ${cacheKey}`)
        return cached
      }
      
      console.log(`[CACHE MISS] ${cacheKey}`)
      const result = await prismadb.user.findUnique(args)
      
      if (result) {
        setCache(cacheKey, result)
      }
      
      return result
    },
    
    async findFirst(args: any) {
      if (isEdgeRuntime()) {
        return prismadb.user.findFirst(args)
      }
      
      const cacheKey = generateCacheKey('user', 'findFirst', args)
      const cached = getCache(cacheKey)
      
      if (cached) {
        console.log(`[CACHE HIT] ${cacheKey}`)
        return cached
      }
      
      console.log(`[CACHE MISS] ${cacheKey}`)
      const result = await prismadb.user.findFirst(args)
      
      if (result) {
        setCache(cacheKey, result)
      }
      
      return result
    },
    
    async findMany(args: any) {
      // Only cache limited queries to avoid memory issues
      if (isEdgeRuntime() || !args.take || args.take > 50) {
        return prismadb.user.findMany(args)
      }
      
      const cacheKey = generateCacheKey('user', 'findMany', args)
      const cached = getCache(cacheKey)
      
      if (cached) {
        console.log(`[CACHE HIT] ${cacheKey}`)
        return cached
      }
      
      console.log(`[CACHE MISS] ${cacheKey}`)
      const result = await prismadb.user.findMany(args)
      
      if (result && result.length > 0) {
        // Shorter TTL for lists (2 minutes)
        setCache(cacheKey, result, 120)
      }
      
      return result
    },
    
    // Handle write operations (these must invalidate cache)
    async update(args: any) {
      const result = await prismadb.user.update(args)
      invalidateModelCache('user')
      return result
    },
    
    async create(args: any) {
      const result = await prismadb.user.create(args)
      invalidateModelCache('user')
      return result
    },
    
    async upsert(args: any) {
      const result = await prismadb.user.upsert(args)
      invalidateModelCache('user')
      return result
    },
    
    async delete(args: any) {
      const result = await prismadb.user.delete(args)
      invalidateModelCache('user')
      return result
    }
  }
}

// Helper to invalidate cache for a specific model
export const invalidateModelCache = (model: string) => {
  if (isEdgeRuntime()) return

  const keys = Object.keys(cache)
  const modelKeys = keys.filter(key => key.startsWith(`${model}:`))
  modelKeys.forEach(key => delete cache[key])
  console.log(`[CACHE] Invalidated ${modelKeys.length} keys for model ${model}`)
}

// Export the Edge-compatible cached client
export default cachedPrismaAlternative 