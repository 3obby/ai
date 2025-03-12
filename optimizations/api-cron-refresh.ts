/**
 * API route for refreshing materialized views
 * This endpoint is meant to be called by a cron job
 * 
 * Path: /api/cron/refresh-views
 */

import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import { refreshStaticCacheIfNeeded } from '@/optimizations/static-data-cache';

// Use Node.js runtime for database operations
export const runtime = 'nodejs';

// Protect endpoint with a secret key
const CRON_SECRET = process.env.CRON_SECRET || 'default_secret_replace_me';

export async function GET(req: Request) {
  const startTime = Date.now();
  console.log('[CRON] Materialized view refresh requested');

  try {
    // Verify authorization if not in development
    if (process.env.NODE_ENV !== 'development') {
      const { searchParams } = new URL(req.url);
      const secret = searchParams.get('secret');
      
      // Simple authorization to prevent unauthorized access
      if (secret !== CRON_SECRET) {
        console.error('[CRON] Unauthorized access attempt');
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Refreshing materialized view
    console.log('[CRON] Refreshing materialized view for dashboard companions');
    
    try {
      // Try concurrent refresh first (which doesn't block reads)
      await prismadb.$executeRawUnsafe(`
        REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_dashboard_companions"
      `);
      console.log('[CRON] Concurrent refresh completed successfully');
    } catch (viewError) {
      console.log('[CRON] Concurrent refresh failed, trying regular refresh', viewError);
      
      // Fall back to regular refresh if concurrent fails
      await prismadb.$executeRawUnsafe(`
        REFRESH MATERIALIZED VIEW "mv_dashboard_companions"
      `);
      console.log('[CRON] Regular refresh completed');
    }
    
    // Also refresh the static cache
    console.log('[CRON] Refreshing static cache for anonymous users');
    const cacheResult = await refreshStaticCacheIfNeeded();
    
    // Run ANALYZE for query planner
    console.log('[CRON] Updating database statistics');
    await prismadb.$executeRawUnsafe(`ANALYZE "Companion"`);
    await prismadb.$executeRawUnsafe(`ANALYZE "mv_dashboard_companions"`);
    
    // Calculate execution time
    const duration = (Date.now() - startTime) / 1000;
    
    // Return success response
    console.log(`[CRON] Refresh completed in ${duration.toFixed(2)}s`);
    return NextResponse.json({
      success: true,
      message: 'Views refreshed successfully',
      duration: `${duration.toFixed(2)}s`,
      staticCacheRefreshed: cacheResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Log and return error
    console.error('[CRON_ERROR]', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 