import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { clearCachePattern } from "@/lib/redis-cache";

// This API endpoint is called by Vercel's cron job to refresh materialized views
// It needs a long timeout since refreshing views can take time
export const maxDuration = 120; // 2 minutes max duration
export const runtime = "nodejs";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const start = Date.now();
    
    console.log(`[REFRESH_VIEWS] Starting materialized view refresh...`);
    
    // Make sure only authorized sources can trigger this
    const { searchParams } = new URL(req.url);
    const authToken = searchParams.get("auth");
    
    // Simple auth check (you might want to use a more secure approach in production)
    if (authToken !== process.env.CRON_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Execute the refresh of the materialized view
    await prismadb.$executeRaw`REFRESH MATERIALIZED VIEW "mv_dashboard_companions"`;
    
    console.log(`[REFRESH_VIEWS] Materialized view refreshed in ${Date.now() - start}ms`);
    
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
      message: "Materialized view refreshed successfully",
      duration: Date.now() - start
    });
  } catch (error) {
    console.error("[REFRESH_VIEWS_ERROR]", error);
    return new NextResponse("Error refreshing materialized view", { status: 500 });
  }
} 