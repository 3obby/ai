import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cached model information with timestamp
let cachedModels = {
  timestamp: 0,
  latestModel: 'gpt-4o',
  latestRealtimeModel: 'gpt-4o-realtime-preview-2024-12-17',
};

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL = 3600000;

// Hardcoded latest models as a fallback
const LATEST_MODELS = {
  timestamp: Date.now(),
  latestModel: 'gpt-4o',
  latestRealtimeModel: 'gpt-4o-realtime-preview-2024-12-17',
};

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    
    // If cache is valid, return cached data
    if (now - cachedModels.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedModels);
    }
    
    // Fetch available models from OpenAI
    const response = await openai.models.list();
    
    // Extract model IDs
    const modelIds = response.data.map(model => model.id);
    
    // Find the latest GPT-4o model
    const gpt4oRegex = /^gpt-4o(-\d{4}-\d{2}-\d{2})?$/;
    const gpt4oModels = modelIds
      .filter(id => gpt4oRegex.test(id))
      .sort()
      .reverse();
    
    // Find the latest realtime model
    const realtimeRegex = /^gpt-4o(-mini)?-realtime(-preview)?(-\d{4}-\d{2}-\d{2})?$/;
    const realtimeModels = modelIds
      .filter(id => realtimeRegex.test(id))
      .sort()
      .reverse();
    
    // Update cached models
    cachedModels = {
      timestamp: now,
      latestModel: gpt4oModels[0] || 'gpt-4o',
      latestRealtimeModel: realtimeModels[0] || 'gpt-4o-realtime-preview-2024-12-17',
    };
    
    console.log('Updated latest OpenAI models:', cachedModels);
    
    return NextResponse.json(cachedModels);
  } catch (error) {
    console.error('Error fetching latest OpenAI models:', error);
    
    // Return hardcoded values on error
    return NextResponse.json(LATEST_MODELS);
  }
} 