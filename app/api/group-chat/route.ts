import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, initialCompanionId } = await request.json();
    const session = await auth();
const userId = session?.userId;
const user = session?.user;

    if (!user || !userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch user usage
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: userId },
    });

    if (!userUsage || userUsage.availableTokens < 50) {
      return new NextResponse("Insufficient XP", { status: 403 });
    }

    // Create the group chat and add the initial companion
    const groupChat = await prismadb.groupChat.create({
      data: {
        name,
        creatorId: userId,
        members: {
          create: {
            companionId: initialCompanionId,
          },
        },
      },
      include: {
        members: {
          include: {
            companion: true,
          },
        },
      },
    });

    // Update user usage
    await prismadb.userUsage.update({
      where: { userId: userId },
      data: {
        availableTokens: userUsage.availableTokens - 50,
        totalSpent: userUsage.totalSpent + 50,
      },
    });

    return NextResponse.json(groupChat);
  } catch (error) {
    console.log("[GROUP_CHAT_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    const user = session?.user;

    if (!user || !userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get paginated group chats where the user is the creator
    const [groupChats, totalCount] = await Promise.all([
      prismadb.groupChat.findMany({
        where: {
          creatorId: userId,
        },
        include: {
          members: {
            include: {
              companion: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prismadb.groupChat.count({
        where: {
          creatorId: userId,
        },
      }),
    ]);

    return NextResponse.json(groupChats);
  } catch (error) {
    console.log("[GROUP_CHAT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
