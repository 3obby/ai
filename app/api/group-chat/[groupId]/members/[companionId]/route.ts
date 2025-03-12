import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getApiAuth } from "@/lib/api-auth";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: { groupId: string; companionId: string } }
) {
  try {
    // Use our new modular authentication utility
    const { userId, isAuthenticated, isAnonymous } = await getApiAuth(req);

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const groupChat = await prismadb.groupChat.findUnique({
      where: {
        id: params.groupId,
        creatorId: userId,
      },
    });

    if (!groupChat) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete the member from the group
    await prismadb.groupChatMember.delete({
      where: {
        groupChatId_companionId: {
          groupChatId: params.groupId,
          companionId: params.companionId,
        },
      },
    });

    // Add system message about removal
    await prismadb.groupMessage.create({
      data: {
        content: `${params.companionId} was removed from the group`,
        groupChatId: params.groupId,
        isBot: false,
        senderId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[GROUP_MEMBER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 