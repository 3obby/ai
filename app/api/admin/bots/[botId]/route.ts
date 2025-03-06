import { NextResponse } from "next/server"
import { auth } from "@/lib/server-auth"
import prismadb from "@/lib/prismadb"

export async function DELETE(
  req: Request,
  { params }: { params: { botId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const bot = await prismadb.companion.delete({
      where: {
        id: params.botId,
      },
    })

    return NextResponse.json(bot)
  } catch (error) {
    console.log("[BOT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { botId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const bot = await prismadb.companion.findUnique({
      where: { id: params.botId },
    })

    if (!bot) {
      return new NextResponse("Bot not found", { status: 404 })
    }

    const updatedBot = await prismadb.companion.update({
      where: { id: params.botId },
      data: { sendMultipleMessages: !bot.sendMultipleMessages },
    })

    return NextResponse.json(updatedBot)
  } catch (error) {
    console.log("[TOGGLE_SEND_MULTIPLE_MESSAGES]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
