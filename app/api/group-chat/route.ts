import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, initialCompanionId, chatHistory } = await request.json();
    const session = await auth();
    const userId = session?.userId;
    
    // Get the userId from the query params or body
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;

    if (!effectiveUserId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Fetch user usage
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: effectiveUserId },
    });

    if (!userUsage || userUsage.availableTokens < 50) {
      return new NextResponse("Insufficient XP", { status: 403 });
    }

    // Create the group chat and add the initial companion
    const groupChat = await prismadb.groupChat.create({
      data: {
        name,
        creatorId: effectiveUserId,
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
      where: { userId: effectiveUserId },
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
              senderId: message.role === "assistant" ? initialCompanionId : effectiveUserId,
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
    const session = await auth();
    const userId = session?.userId;
    
    // Get the userId from the query if passed
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;

    if (!effectiveUserId) {
      // Return empty array instead of error for anonymous users without ID
      return NextResponse.json([]);
    }

    // Get paginated group chats where the user is the creator
    const [groupChats, totalCount] = await Promise.all([
      prismadb.groupChat.findMany({
        where: {
          creatorId: effectiveUserId,
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
          creatorId: effectiveUserId,
        },
      }),
    ]);

    return NextResponse.json(groupChats);
  } catch (error) {
    console.log("[GROUP_CHAT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
