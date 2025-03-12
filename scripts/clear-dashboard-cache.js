// Script to clear Redis cache for dashboard data
require('dotenv').config();
const { createClient } = require('@vercel/kv');

async function clearCache() {
  console.log('🔄 Clearing Redis cache for dashboard data...');
  
  // Check if Redis is configured
  if (!process.env.KV_URL || !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN || !process.env.KV_REST_API_READ_ONLY_TOKEN) {
    console.log('❌ Redis environment variables not configured.');
    console.log('If using Vercel KV, please set KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN, and KV_REST_API_READ_ONLY_TOKEN');
    return;
  }
  
  try {
    // Connect to Redis using Vercel KV
    const kv = createClient({
      url: process.env.KV_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    
    // Get all keys matching the dashboard pattern
    console.log('Finding dashboard cache keys...');
    const keys = await kv.keys('dashboard:*');
    
    if (keys.length === 0) {
      console.log('No dashboard cache keys found.');
      return;
    }
    
    console.log(`Found ${keys.length} dashboard cache keys.`);
    
    // Delete all matching keys
    for (const key of keys) {
      await kv.del(key);
      console.log(`Deleted key: ${key}`);
    }
    
    console.log('✅ Successfully cleared dashboard cache.');
  } catch (error) {
    console.error('❌ Error clearing Redis cache:', error);
  }
}

clearCache()
  .then(() => {
    console.log('✅ Cache clearing operation completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to clear cache:', error);
    process.exit(1);
  }); 