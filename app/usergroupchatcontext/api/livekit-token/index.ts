import { NextRequest, NextResponse } from 'next/server';
import { GET as getLiveKitToken } from './route';

// This file is to ensure compatibility with both /api/livekit-token and /api/livekit-token/
// It simply calls the handler in route.ts
export async function GET(req: NextRequest) {
  return getLiveKitToken(req);
} 