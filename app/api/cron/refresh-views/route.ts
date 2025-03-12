import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { clearCachePattern } from "@/lib/redis-cache";

// This API endpoint is called by Vercel's cron job to refresh materialized views
// It needs a long timeout since refreshing views can take time
export const maxDuration = 120; // 2 minutes max duration
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Verify this is a legitimate cron request from Vercel
    // The Authorization header will be set by Vercel for cron jobs
    const authHeader = req.headers.get("Authorization");
    
    // In production, we'd validate the auth header
    // For development, we also allow local requests
    if (process.env.VERCEL_ENV === "production" && !authHeader?.startsWith("Bearer")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    console.log("🔄 Starting materialized view refresh...");
    
    // Refresh the dashboard view
    try {
      // Check if the view and refresh function exist
      const viewExists = await prismadb.$queryRaw`
        SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_dashboard_companions'
      `;
      
      if (Array.isArray(viewExists) && viewExists.length > 0) {
        // Refresh the view using the refresh function
        await prismadb.$queryRaw`SELECT refresh_dashboard_view()`;
        console.log("✅ Dashboard view refreshed successfully");
      } else {
        console.log("⚠️ Dashboard view does not exist, skipping refresh");
      }
    } catch (error) {
      console.error("❌ Error refreshing dashboard view:", error);
      // Continue with other operations even if this fails
    }
    
    // Try to refresh all materialized views using the refresh_all_views function
    try {
      await prismadb.$queryRaw`SELECT refresh_all_views()`;
      console.log("✅ All materialized views refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing all views:", error);
      // Continue with other operations even if this fails
    }
    
    // Clear cache for anonymous users to ensure they get fresh data
    await clearCachePattern("dashboard:anon:*");
    console.log("✅ Anonymous user cache cleared");
    
    return NextResponse.json({
      success: true,
      message: "Materialized views refreshed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in refresh-views cron job:", error);
    
    return NextResponse.json(
      {
        success: false,
        message: "Failed to refresh materialized views",
        error: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 