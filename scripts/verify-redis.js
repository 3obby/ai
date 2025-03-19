#!/usr/bin/env node

// This script tests the Redis connection and caching functionality
import('dotenv/config')
  .then(() => import('../lib/redis-cache.js'))
  .then(async (redisCacheModule) => {
    const { getFromCache, setCache } = redisCacheModule;
    
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
      const cachedValue = await getFromCache(testKey);
      
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
  })
  .catch(error => {
    console.error('❌ Module loading error:', error);
    process.exit(1);
  }); 