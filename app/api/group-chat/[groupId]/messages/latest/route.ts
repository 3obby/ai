import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify groupId exists
    const groupChat = await prismadb.groupChat.findUnique({
      where: {
        id: params.groupId,
        creatorId: userId,
      },
    });

    if (!groupChat) {
      return new NextResponse("Group chat not found", { status: 404 });
    }

    // Get the latest message for this group chat
    const latestMessage = await prismadb.groupMessage.findFirst({
      where: {
        groupChatId: params.groupId,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestMessage) {
      return new NextResponse(null, { status: 200 }); // Return 200 with null if no messages
    }

    return NextResponse.json(latestMessage);
  } catch (error) {
    console.log("[GROUP_CHAT_LATEST_MESSAGE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 