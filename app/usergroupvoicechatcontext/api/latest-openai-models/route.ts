import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cached model information with timestamp
let cachedModels = {
  timestamp: 0,
  standard: 'gpt-4o',
  realtime: 'gpt-4o-realtime-preview',
  voice: {
    available: true,
    models: ['gpt-4o-realtime-preview']
  },
  voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  tts: ['tts-1', 'tts-1-hd']
};

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL = 3600000;

/**
 * Fetches the latest available models from OpenAI
 * Uses the /models endpoint to get all available models
 * Then filters for specific model types needed for voice functionality
 */
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
    
    // Find the latest GPT-4o model (standard)
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
    
    // Find TTS models
    const ttsRegex = /^tts-1(-hd)?$/;
    const ttsModels = modelIds
      .filter(id => ttsRegex.test(id))
      .sort();
    
    // Update cached models with real data
    cachedModels = {
      timestamp: now,
      standard: gpt4oModels[0] || 'gpt-4o',
      realtime: realtimeModels[0] || 'gpt-4o-realtime-preview',
      voice: {
        available: realtimeModels.length > 0,
        models: realtimeModels.length > 0 ? realtimeModels : ['gpt-4o-realtime-preview']
      },
      // OpenAI currently offers these fixed voice options
      voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      tts: ttsModels.length > 0 ? ttsModels : ['tts-1', 'tts-1-hd']
    };
    
    console.log('Updated latest OpenAI models:', cachedModels);
    
    return NextResponse.json(cachedModels);
  } catch (error) {
    console.error('Error fetching latest OpenAI models:', error);
    
    // Return fallback values on error
    return NextResponse.json({
      timestamp: Date.now(),
      standard: 'gpt-4o',
      realtime: 'gpt-4o-realtime-preview',
      voice: {
        available: true,
        models: ['gpt-4o-realtime-preview']
      },
      voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      tts: ['tts-1', 'tts-1-hd'],
      error: error instanceof Error ? error.message : 'Unknown error fetching models'
    });
  }
} 