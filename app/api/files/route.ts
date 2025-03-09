import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get query params for pagination
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;
    const status = searchParams.get("status") || "all";
    
    // Basic validation
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return new NextResponse("Invalid pagination parameters", { status: 400 });
    }
    
    // Build query filters
    const filters: any = {
      userId,
    };
    
    // Filter by status if provided and not 'all'
    if (status !== "all") {
      filters.status = status;
    } else {
      // Exclude deleted files by default
      filters.status = {
        not: "DELETED",
      };
    }
    
    // Count total matching files
    const totalCount = await prismadb.file.count({
      where: filters,
    });
    
    // Get files with pagination
    const files = await prismadb.file.findMany({
      where: filters,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    
    return new NextResponse(JSON.stringify({
      files,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    }));
  } catch (error) {
    console.error("[FILES_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 