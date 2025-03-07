import { PrismaClient, Prisma } from "@prisma/client"

// Helper to detect Edge Runtime
const isEdgeRuntime = () => {
  return process.env.NEXT_RUNTIME === 'edge'
}

// Define a custom EdgeCompatPrismaClient class type
class EdgeCompatPrismaClient {
  // This client provides a non-operational facade for Edge Runtime
  async $connect() { return }
  async $disconnect() { return }
  
  // Must be implemented as function not property as it's used by Prisma's $use middleware
  $use() { return }
  $on() { return }
  $transaction() { 
    console.warn('Edge Runtime tried to use $transaction - returning empty result')
    return Promise.resolve([]) 
  }
  
  // Placeholder methods that will be accessed by the application code
  user = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  // User usage model for edge compatibility with webhook
  userUsage = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  // User subscription model for edge compatibility with webhook
  userSubscription = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  // Usage transaction model for edge compatibility with webhook
  usageTransaction = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  // Other models can be added here similarly
  companion = { 
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() }
  }
  
  message = { 
    findUnique: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() }
  }
  
  // Add minimal compatibility with PrismaClient methods
  $executeRaw() { throw this.edgeError() }
  $executeRawUnsafe() { throw this.edgeError() }
  $queryRaw() { throw this.edgeError() }
  $queryRawUnsafe() { throw this.edgeError() }
  
  // Helper for explaining the error
  edgeError() {
    return new Error(
      "Direct database access from Edge Runtime is not supported. Use a server action or API route instead."
    )
  }
}

// Define global variable types to include our custom client
declare global {
  var prisma: PrismaClient | EdgeCompatPrismaClient | undefined
}

/**
 * For Edge Runtime environments, we'll provide a minimal client interface
 * that will defer actual DB operations until they reach a regular Node.js runtime.
 * 
 * When deployed to Vercel, Edge functions will call regular Node.js functions
 * for database operations.
 */

// Create a singleton instance with appropriate client for the runtime
const createClient = () => {
  if (isEdgeRuntime()) {
    console.log("Edge Runtime detected - using Edge compatible client")
    return new EdgeCompatPrismaClient()
  }
  
  // For regular Node.js runtime, use the normal PrismaClient with proper typing
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error']
  })
}

const prismadb = globalThis.prisma || createClient()

// Prevent multiple instances during development hot reloading
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prismadb
}

export default prismadb
