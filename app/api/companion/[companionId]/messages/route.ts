import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.userId;
    const user = session?.user;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!user || !userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

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