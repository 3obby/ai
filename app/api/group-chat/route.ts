import { getUserIdForApi } from "@/lib/auth";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, initialCompanionId, chatHistory, userId: bodyUserId } = body;
    
    // Use our utility function to get user ID and auth status
    const { userId: authUserId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);

    // Use userId from body if provided (for anonymous users), otherwise use from auth
    const userId = bodyUserId || authUserId;

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Fetch user usage
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId },
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
      where: { userId },
      data: {
        availableTokens: userUsage.availableTokens - 50,
        totalSpent: userUsage.totalSpent + 50,
      },
    });

    // Import chat history if provided
    if (chatHistory && chatHistory.length > 0) {
      // Filter to get only the most recent messages (max 20) to import
      const recentMessages = chatHistory.slice(-20);
      
      // Create group messages from chat history
      await Promise.all(
        recentMessages.map(async (message: { content: string; role: string }) => {
          return prismadb.groupMessage.create({
            data: {
              groupChatId: groupChat.id,
              content: message.content,
              isBot: message.role === "assistant",
              senderId: message.role === "assistant" ? initialCompanionId : userId,
            },
          });
        })
      );
      
      // Update the group chat to include the newly created messages
      const updatedGroupChat = await prismadb.groupChat.findUnique({
        where: {
          id: groupChat.id,
        },
        include: {
          members: {
            include: {
              companion: true,
            },
          },
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
      
      if (updatedGroupChat) {
        return NextResponse.json(updatedGroupChat);
      }
    }

    return NextResponse.json(groupChat);
  } catch (error) {
    console.log("[GROUP_CHAT_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Get userId from query parameters
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use our utility function to get user ID and auth status
    const { userId: authUserId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);
    
    // Use userId from query if provided (for anonymous users), otherwise use from auth
    const userId = queryUserId || authUserId;

    if (!userId) {
      // Return empty array instead of error for anonymous users without ID
      return NextResponse.json([]);
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
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
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
