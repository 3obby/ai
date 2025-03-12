import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getApiAuth } from "@/lib/api-auth";
import { v4 as uuidv4 } from 'uuid';
import { allocateAnonymousTokens } from "@/lib/token-usage";

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
    let effectiveUserId = userId;

    // If no user ID is found, create an anonymous user
    if (!effectiveUserId) {
      // Generate a new anonymous user ID
      const anonymousId = uuidv4();
      console.log(`Creating new anonymous user for group chat: ${anonymousId}`);
      
      try {
        // Create a new user record
        await prismadb.user.create({
          data: {
            id: anonymousId,
            name: 'Anonymous User',
            email: `anon-${anonymousId}@example.com`
          }
        });
        
        // Allocate tokens to the new user
        await allocateAnonymousTokens(anonymousId);
        
        // Use this new anonymous ID
        effectiveUserId = anonymousId;
        
        // Set cookie for this user
        const response = NextResponse.redirect(new URL(`/api/create-group-chat?companions=${companionIds.join(',')}`, request.url));
        response.cookies.set('anonymousUserId', anonymousId, {
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          path: '/',
          sameSite: 'lax'
        });
        
        return response;
      } catch (error) {
        console.error('Error creating anonymous user:', error);
        return NextResponse.json({ error: "Could not create anonymous user" }, { status: 500 });
      }
    }

    // Get user usage to check if they have enough tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: effectiveUserId },
    });

    if (!userUsage || userUsage.availableTokens < 100) {
      // If this is an anonymous user with no tokens, allocate some
      if (isAnonymous || effectiveUserId.startsWith('anon-') || effectiveUserId.includes('-')) {
        try {
          await allocateAnonymousTokens(effectiveUserId);
          // Retry fetching the user usage
          const refreshedUsage = await prismadb.userUsage.findUnique({
            where: { userId: effectiveUserId },
          });
          
          if (!refreshedUsage || refreshedUsage.availableTokens < 100) {
            return NextResponse.json({ error: "Insufficient tokens even after allocation" }, { status: 403 });
          }
        } catch (error) {
          console.error('Error allocating tokens to anonymous user:', error);
          return NextResponse.json({ error: "Insufficient tokens" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Insufficient tokens" }, { status: 403 });
      }
    }

    // Create the group chat with initial members
    const groupChat = await prismadb.groupChat.create({
      data: {
        name: "Team Chat",
        creatorId: effectiveUserId,
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
        senderId: effectiveUserId,
      },
    });

    // Deduct tokens from user
    await prismadb.userUsage.update({
      where: { userId: effectiveUserId },
      data: {
        availableTokens: { decrement: 100 },
        totalSpent: { increment: 100 },
      },
    });

    // For anonymous users, include the userId in the redirect URL
    let redirectUrl = `/group-chat/${groupChat.id}`;
    if (isAnonymous || !isAuthenticated) {
      redirectUrl += `?userId=${effectiveUserId}`;
    }

    // Redirect to the group chat
    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    console.error("[CREATE_GROUP_CHAT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 