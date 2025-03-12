import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getUserIdForApi } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    // Use the consistent auth utility from auth.ts
    const { userId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get the most recent messages for this companion
    const messages = await prismadb.message.findMany({
      where: {
        companionId: params.companionId,
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    // Return in chronological order (oldest first)
    const sortedMessages = messages.reverse();

    return NextResponse.json(sortedMessages);
  } catch (error) {
    console.log("[COMPANION_MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 