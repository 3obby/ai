import { getUserIdForApi } from "@/lib/auth";
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"
import OpenAI from "openai"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const { companionId } = await request.json()
    
    // Use our utility function to get user ID and auth status
    const { userId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if the group chat exists and user is the creator
    const groupChat = await prismadb.groupChat.findUnique({
      where: {
        id: params.groupId,
        creatorId: userId,
      },
    })

    if (!groupChat) {
      return new NextResponse("Group chat not found or unauthorized", {
        status: 404,
      })
    }

    // Add the companion to the group
    const member = await prismadb.groupChatMember.create({
      data: {
        groupChatId: params.groupId,
        companionId: companionId,
      },
      include: {
        companion: true,
      },
    })

    // Generate greeting message from the companion
    const companionInfo = member.companion
    let greeting = ""

    // Use custom introduction if available, otherwise generate a default greeting
    if ((companionInfo as any).customIntroduction) {
      greeting = (companionInfo as any).customIntroduction.includes("👋")
        ? (companionInfo as any).customIntroduction
        : `${(companionInfo as any).customIntroduction} 👋`
    } else {
      greeting = `Hi everyone! I'm ${companionInfo.name}. 👋`
    }

    // Add the greeting message to the chat
    await prismadb.groupMessage.create({
      data: {
        content: greeting,
        groupChatId: params.groupId,
        isBot: true,
        senderId: companionId,
      },
    })

    return NextResponse.json({
      member,
      message: "Companion added to group with greeting",
    })
  } catch (error) {
    console.log("[GROUP_MEMBER_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    // Extract companion ID from the URL
    const url = new URL(request.url)
    const companionId = url.searchParams.get("companionId")

    if (!companionId) {
      return new NextResponse("Companion ID is required", { status: 400 })
    }

    // Use our utility function to get user ID and auth status
    const { userId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if the group chat exists and user is the creator
    const groupChat = await prismadb.groupChat.findUnique({
      where: {
        id: params.groupId,
        creatorId: userId,
      },
    })

    if (!groupChat) {
      return new NextResponse("Group chat not found or unauthorized", {
        status: 404,
      })
    }

    // Remove the companion from the group
    await prismadb.groupChatMember.delete({
      where: {
        groupChatId_companionId: {
          groupChatId: params.groupId,
          companionId: companionId,
        },
      },
    })

    // Add a system message indicating the companion was removed
    await prismadb.groupMessage.create({
      data: {
        content: `${companionId} was removed from the group`,
        groupChatId: params.groupId,
        isBot: false,
        senderId: userId,
      },
    })

    return NextResponse.json({
      message: "Companion removed from group",
    })
  } catch (error) {
    console.log("[GROUP_MEMBER_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
