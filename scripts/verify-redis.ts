// This script tests the Redis connection and caching functionality
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
}

// Print available Redis-related environment variables (without showing full tokens)
["UPSTASH_REDIS_REST_URL", "KV_URL", "KV_REST_API_URL"].forEach(key => {
  if (process.env[key]) {
    console.log(`${key} is set: ${process.env[key]}`);
  } else {
    console.log(`${key} is not set`);
  }
});

["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN", "KV_REST_API_READ_ONLY_TOKEN"].forEach(key => {
  if (process.env[key]) {
    const token = process.env[key] as string;
    const truncated = token.length > 10 
      ? `${token.substring(0, 5)}...${token.substring(token.length - 5)}`
      : "[too short]";
    console.log(`${key} is set: ${truncated}`);
  } else {
    console.log(`${key} is not set`);
  }
});

// Import Redis functions now that environment is loaded
import { getFromCache, setCache } from "../lib/redis-cache";

async function main() {
  console.log('🚀 Verifying Redis connection...');
  
  try {
    // Test setting a value
    const testKey = 'test:connection:' + Date.now();
    const testValue = {
      message: 'Hello from Redis!',
      timestamp: Date.now(),
      bigIntTest: BigInt(123456789123456789), // Test BigInt serialization
    };
    
    console.log(`Setting test key: ${testKey}`);
    const setResult = await setCache(testKey, testValue, 60);
    
    if (!setResult) {
      console.error('❌ Failed to set value in Redis');
      process.exit(1);
    }
    
    console.log('✅ Successfully set value in Redis');
    
    // Test getting the value
    console.log(`Getting test key: ${testKey}`);
    const cachedValue = await getFromCache<typeof testValue>(testKey);
    
    if (!cachedValue) {
      console.error('❌ Failed to get value from Redis');
      process.exit(1);
    }
    
    console.log('✅ Successfully retrieved value from Redis');
    console.log('Retrieved value:', cachedValue);
    
    // Verify BigInt was properly serialized and deserialized
    if (typeof cachedValue.bigIntTest === 'bigint') {
      console.log('✅ BigInt serialization working correctly');
    } else {
      console.error('❌ BigInt serialization failed');
      console.log('Type received:', typeof cachedValue.bigIntTest);
      console.log('Value received:', cachedValue.bigIntTest);
    }
    
    console.log('🎉 Redis verification completed successfully!');
  } catch (error) {
    console.error('❌ Redis verification failed with error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 