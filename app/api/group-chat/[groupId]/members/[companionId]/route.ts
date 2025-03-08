import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function DELETE(
  req: Request,
  { params }: { params: { groupId: string; companionId: string } }
) {
  try {
    const session = await auth();
const userId = session?.userId;

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

    await prismadb.groupChatMember.delete({
      where: {
        groupChatId_companionId: {
          groupChatId: params.groupId,
          companionId: params.companionId,
        },
      },
    });

    return new NextResponse("OK");
  } catch (error) {
    console.log("[GROUP_CHAT_MEMBER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 