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
  
  // NextAuth required models
  verificationToken = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  account = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  session = {
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
  
  // Group message model for edge compatibility
  groupMessage = {
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
    findMany: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() }
  }
  
  message = { 
    findUnique: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    deleteMany: () => { throw this.edgeError() }
  }
  
  // Add category model for Edge compatibility
  category = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() }
  }
  
  // Add GroupChat model for Edge compatibility
  groupChat = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    count: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  // Add ChatConfig model for Edge compatibility
  chatConfig = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    count: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  // Add File model for Edge compatibility
  file = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    count: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  // Add FileGroup model for Edge compatibility
  fileGroup = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    count: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
  }
  
  // Add userBurnedTokens model for edge compatibility
  userBurnedTokens = {
    findUnique: () => { throw this.edgeError() },
    findFirst: () => { throw this.edgeError() },
    findMany: () => { throw this.edgeError() },
    create: () => { throw this.edgeError() },
    update: () => { throw this.edgeError() },
    delete: () => { throw this.edgeError() },
    upsert: () => { throw this.edgeError() },
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

// Update the maximum retries to use environment variables
// Maximum number of connection retries
const MAX_RETRIES = process.env.DB_MAX_RETRIES ? parseInt(process.env.DB_MAX_RETRIES, 10) : 3;
const RETRY_DELAY_MS = process.env.DB_RETRY_DELAY_MS ? parseInt(process.env.DB_RETRY_DELAY_MS, 10) : 1000;
const ENABLE_RETRIES = process.env.ENABLE_DB_CONNECTION_RETRIES === 'true';
const MAX_RETRY_TIME = 15000; // Maximum time to attempt retries (15 seconds total)

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

// Performance tracking middleware with retry logic for high-latency connections
const addPrismaMiddleware = (prisma: PrismaClient) => {
  prisma.$use(async (params, next) => {
    const startTime = Date.now();
    let retries = 0;
    
    const executeWithRetry = async () => {
      try {
        const result = await next(params);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log slow queries (>500ms) to help identify optimization opportunities
        if (duration > 500) {
          const argsString = params.args ? JSON.stringify(params.args).substring(0, 100) : '{}';
          console.warn(`[SLOW_QUERY] ${duration}ms | ${params.model}.${params.action} | ${argsString}...`);
        }
        
        return result;
      } catch (error: any) {
        const endTime = Date.now();
        const elapsed = endTime - startTime;
        const remainingRetryTime = MAX_RETRY_TIME - elapsed;
        
        // Keep original error message for logging
        const originalMessage = error?.message || 'Unknown database error';
        
        // Update the retry logic to check the environment flag and include more error types
        if (
          ENABLE_RETRIES && 
          retries < MAX_RETRIES && 
          remainingRetryTime > 0 &&
          (
            originalMessage.includes("Can't reach database server") ||
            originalMessage.includes("Connection refused") ||
            originalMessage.includes("Connection terminated unexpectedly") ||
            originalMessage.includes("Connection timed out") ||
            originalMessage.includes("Connection reset by peer") ||
            originalMessage.includes("Connection lost") ||
            (error?.code && [
              'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 
              'EPIPE', 'ENOTFOUND', 'P1001', 'P1002', 'P1008', 'P1017'
            ].includes(error.code))
          )
        ) {
          retries++;
          // Calculate backoff time (exponential with jitter)
          const backoffTime = Math.min(
            RETRY_DELAY_MS * Math.pow(1.5, retries-1) * (0.9 + Math.random() * 0.2), 
            remainingRetryTime
          );
          
          console.warn(
            `[DB_RETRY] Attempt ${retries}/${MAX_RETRIES} for ${params.model}.${params.action} - ` +
            `"${originalMessage}". Retrying in ${Math.round(backoffTime)}ms...`
          );
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return executeWithRetry();
        }
        
        // Log all database errors for debugging
        console.error(
          `[DB_ERROR] ${params.model}.${params.action} failed after ${retries > 0 ? retries + ' retries' : 'no retries'}: ${originalMessage}`
        );
        
        // Enhance error with additional context
        if (retries > 0) {
          error.retriesAttempted = retries;
          error.totalDuration = endTime - startTime;
          
          // Add helpful properties for the application layer
          if (originalMessage.includes("Can't reach database server")) {
            error.isConnectionError = true;
            error.isRetryable = true;
            error.requiresBackoff = true;
          }
        }
        
        throw error;
      }
    };
    
    return executeWithRetry();
  });
  
  return prisma;
};

// Create a singleton instance with appropriate client for the runtime
const createClient = () => {
  if (isEdgeRuntime()) {
    console.log("Edge Runtime detected - using Edge compatible client")
    return new EdgeCompatPrismaClient()
  }
  
  // For regular Node.js runtime, use the normal PrismaClient with proper typing
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'],
    // Add connection pooling for better performance with high-latency connections
    // Extend the idle timeout to prevent connections from being closed too quickly
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Connection pool settings (though actual pooling is managed by the DB provider)
    // These just ensure our Prisma client is configured optimally
    // Note: connection pooling is often configured on the connection string itself
  })
  
  // Add performance middleware
  return addPrismaMiddleware(client)
}

const prismadb = globalThis.prisma || createClient()

// Prevent multiple instances during development hot reloading
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prismadb
}

export default prismadb

// Query optimization helpers
export const optimizedQuery = {
  /**
   * Optimize companion queries for dashboard
   * @param queryOptions - The base query options
   * @returns Optimized query options with only necessary fields
   */
  companions: (queryOptions: any) => {
    // Clone the options to avoid mutating the original
    const options = JSON.parse(JSON.stringify(queryOptions));
    
    // If querying for dashboard display, limit the fields
    if (options.take && !options.include?.messages) {
      // For dashboard list view, we don't need all fields
      options.select = {
        id: true,
        name: true,
        description: true,
        src: true,
        createdAt: true,
        updatedAt: true,
        categoryId: true,
        userId: true,
        private: true,
        _count: {
          select: {
            messages: true,
          }
        },
        userBurnedTokens: options.include?.userBurnedTokens ? {
          where: options.include.userBurnedTokens.where,
          take: 1,
          select: {
            burnedTokens: true
          }
        } : undefined
      };
      
      // Remove the include since we're using select
      delete options.include;
    }
    
    return options;
  }
}
