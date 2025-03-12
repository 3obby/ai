import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getApiAuth } from "@/lib/api-auth";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Get companions from query parameters
    const url = new URL(request.url);
    const companionIds = url.searchParams.get('companions')?.split(',') || [];

    if (companionIds.length === 0) {
      return NextResponse.json({ error: "No companions specified" }, { status: 400 });
    }

    // Get authenticated user ID
    const { userId, isAuthenticated, isAnonymous } = await getApiAuth(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user usage to check if they have enough tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    });

    if (!userUsage || userUsage.availableTokens < 100) {
      return NextResponse.json({ error: "Insufficient tokens" }, { status: 403 });
    }

    // Create the group chat with initial members
    const groupChat = await prismadb.groupChat.create({
      data: {
        name: "Team Chat",
        creatorId: userId,
        members: {
          create: companionIds.map(companionId => ({
            companionId
          }))
        }
      },
      include: {
        members: {
          include: {
            companion: true,
          },
        },
      },
    });

    // Add greeting messages for each companion
    for (const member of groupChat.members) {
      try {
        const companion = member.companion;
        
        // Generate greeting message
        let greeting = `Hi everyone! I'm ${companion.name}. 👋`;

        // Add greeting message
        await prismadb.groupMessage.create({
          data: {
            content: greeting,
            groupChatId: groupChat.id,
            isBot: true,
            senderId: companion.id,
          },
        });
      } catch (error) {
        console.error(`Error adding greeting for companion ${member.companionId}:`, error);
      }
    }

    // Add a system message to start the conversation
    await prismadb.groupMessage.create({
      data: {
        content: "Welcome to your group chat with Marcus, Jake, Lotus-9, and Maya! Ask them anything or discuss topics together.",
        groupChatId: groupChat.id,
        isBot: false,
        senderId: userId,
      },
    });

    // Deduct tokens from user
    await prismadb.userUsage.update({
      where: { userId },
      data: {
        availableTokens: { decrement: 100 },
        totalSpent: { increment: 100 },
      },
    });

    // Redirect to the group chat
    return NextResponse.redirect(new URL(`/group-chat/${groupChat.id}`, request.url));

  } catch (error) {
    console.error("[CREATE_GROUP_CHAT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 